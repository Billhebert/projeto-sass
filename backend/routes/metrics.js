/**
 * Metrics Routes
 * Advanced metrics and analytics from Mercado Livre
 *
 * GET    /api/metrics/:accountId                    - Get all metrics for account
 * GET    /api/metrics/:accountId/visits             - Get visits metrics
 * GET    /api/metrics/:accountId/reputation         - Get seller reputation
 * GET    /api/metrics/:accountId/items/:itemId/health - Get item health
 * GET    /api/metrics/:accountId/items/:itemId/visits - Get item visits
 * GET    /api/metrics/:accountId/sales              - Get sales metrics
 * GET    /api/metrics/:accountId/conversion         - Get conversion metrics
 */

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const Order = require('../db/models/Order');
const Product = require('../db/models/Product');
const Question = require('../db/models/Question');
const MLAccount = require('../db/models/MLAccount');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * GET /api/metrics/:accountId
 * Get comprehensive metrics for an account
 */
router.get('/:accountId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Fetch multiple metrics in parallel
    const [reputationRes, salesRes, visitsRes] = await Promise.all([
      // Reputation
      axios.get(`${ML_API_BASE}/users/${account.mlUserId}`, { headers })
        .catch(err => ({ data: null })),
      
      // Sales stats from local DB
      Order.aggregate([
        { $match: { accountId, status: 'paid' } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' },
          },
        },
      ]),
      
      // Get total visits from products
      Product.aggregate([
        { $match: { accountId } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$viewCount' },
            totalQuestions: { $sum: '$questionCount' },
          },
        },
      ]),
    ]);

    const reputation = reputationRes.data?.seller_reputation || null;
    const salesStats = salesRes[0] || { totalSales: 0, totalRevenue: 0, avgOrderValue: 0 };
    const visitsStats = visitsRes[0] || { totalViews: 0, totalQuestions: 0 };

    // Get product counts
    const productStats = {
      total: await Product.countDocuments({ accountId }),
      active: await Product.countDocuments({ accountId, status: 'active' }),
      paused: await Product.countDocuments({ accountId, status: 'paused' }),
    };

    // Get question stats
    const questionStats = await Question.getStats(accountId);

    // Get order stats
    const orderStats = {
      total: await Order.countDocuments({ accountId }),
      paid: await Order.countDocuments({ accountId, status: 'paid' }),
      pending: await Order.countDocuments({ accountId, status: { $in: ['confirmed', 'payment_required', 'payment_in_process'] } }),
      cancelled: await Order.countDocuments({ accountId, status: 'cancelled' }),
    };

    res.json({
      success: true,
      data: {
        accountId,
        reputation: reputation ? {
          level: reputation.level_id,
          powerSellerStatus: reputation.power_seller_status,
          transactions: reputation.transactions,
          metrics: reputation.metrics,
        } : null,
        sales: {
          total: salesStats.totalSales,
          revenue: salesStats.totalRevenue,
          averageOrderValue: salesStats.avgOrderValue,
        },
        visits: {
          total: visitsStats.totalViews,
          questions: visitsStats.totalQuestions,
        },
        products: productStats,
        questions: questionStats,
        orders: orderStats,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_METRICS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics',
      error: error.message,
    });
  }
});

/**
 * GET /api/metrics/:accountId/visits
 * Get visits metrics from ML API
 */
router.get('/:accountId/visits', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { last = 30, unit = 'day' } = req.query;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get user's items
    const itemsRes = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}/items/search?limit=10`,
      { headers }
    ).catch(() => ({ data: { results: [] } }));

    const itemIds = itemsRes.data.results || [];

    // Get visits for top items
    const visitsData = await Promise.all(
      itemIds.slice(0, 5).map(async (itemId) => {
        try {
          const visits = await axios.get(
            `${ML_API_BASE}/items/${itemId}/visits/time_window`,
            {
              headers,
              params: { last, unit },
            }
          );
          return {
            itemId,
            visits: visits.data,
          };
        } catch (err) {
          return { itemId, visits: null };
        }
      })
    );

    res.json({
      success: true,
      data: {
        accountId,
        period: { last, unit },
        items: visitsData,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_VISITS_METRICS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch visits metrics',
      error: error.message,
    });
  }
});

/**
 * GET /api/metrics/:accountId/reputation
 * Get seller reputation
 */
router.get('/:accountId/reputation', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}`,
      { headers }
    );

    const userData = response.data;
    const reputation = userData.seller_reputation || {};

    res.json({
      success: true,
      data: {
        accountId,
        userId: userData.id,
        nickname: userData.nickname,
        siteId: userData.site_id,
        registrationDate: userData.registration_date,
        reputation: {
          level: reputation.level_id,
          powerSellerStatus: reputation.power_seller_status,
          transactions: reputation.transactions,
          metrics: {
            sales: reputation.metrics?.sales,
            claims: reputation.metrics?.claims,
            delayedHandlingTime: reputation.metrics?.delayed_handling_time,
            cancellations: reputation.metrics?.cancellations,
          },
        },
        buyerReputation: userData.buyer_reputation,
        status: userData.status,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_REPUTATION_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch reputation',
      error: error.message,
    });
  }
});

/**
 * GET /api/metrics/:accountId/items/:itemId/health
 * Get item health/quality score
 */
router.get('/:accountId/items/:itemId/health', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(
      `${ML_API_BASE}/items/${itemId}/health`,
      { headers }
    ).catch(err => {
      logger.warn({
        action: 'FETCH_ITEM_HEALTH_ERROR',
        itemId,
        error: err.response?.data || err.message,
      });
      return { data: null };
    });

    res.json({
      success: true,
      data: {
        itemId,
        health: response.data,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ITEM_HEALTH_ERROR',
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch item health',
      error: error.message,
    });
  }
});

/**
 * GET /api/metrics/:accountId/items/:itemId/visits
 * Get item visits history
 */
router.get('/:accountId/items/:itemId/visits', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { last = 30, unit = 'day' } = req.query;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(
      `${ML_API_BASE}/items/${itemId}/visits/time_window`,
      {
        headers,
        params: { last: parseInt(last), unit },
      }
    );

    res.json({
      success: true,
      data: {
        itemId,
        period: { last: parseInt(last), unit },
        visits: response.data,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ITEM_VISITS_ERROR',
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch item visits',
      error: error.message,
    });
  }
});

/**
 * GET /api/metrics/:accountId/sales
 * Get sales metrics over time
 */
router.get('/:accountId/sales', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { days = 30 } = req.query;

    // Verify account
    const account = await MLAccount.findOne({
      id: accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get daily sales
    const dailySales = await Order.aggregate([
      {
        $match: {
          accountId,
          status: 'paid',
          dateCreated: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$dateCreated' },
            month: { $month: '$dateCreated' },
            day: { $dayOfMonth: '$dateCreated' },
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Format data for charts
    const chartData = dailySales.map(d => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
      sales: d.count,
      revenue: d.revenue,
    }));

    // Calculate totals
    const totals = {
      sales: dailySales.reduce((sum, d) => sum + d.count, 0),
      revenue: dailySales.reduce((sum, d) => sum + d.revenue, 0),
    };

    res.json({
      success: true,
      data: {
        accountId,
        period: { days: parseInt(days), startDate },
        daily: chartData,
        totals,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_SALES_METRICS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales metrics',
      error: error.message,
    });
  }
});

/**
 * GET /api/metrics/:accountId/conversion
 * Get conversion metrics (visits to sales)
 */
router.get('/:accountId/conversion', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account
    const account = await MLAccount.findOne({
      id: accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Get aggregated data
    const productStats = await Product.aggregate([
      { $match: { accountId } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$viewCount' },
          totalSales: { $sum: '$salesCount' },
          totalQuestions: { $sum: '$questionCount' },
        },
      },
    ]);

    const stats = productStats[0] || { totalViews: 0, totalSales: 0, totalQuestions: 0 };

    // Calculate conversion rates
    const conversionRate = stats.totalViews > 0
      ? (stats.totalSales / stats.totalViews * 100).toFixed(2)
      : 0;

    const questionRate = stats.totalViews > 0
      ? (stats.totalQuestions / stats.totalViews * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        accountId,
        metrics: {
          totalViews: stats.totalViews,
          totalSales: stats.totalSales,
          totalQuestions: stats.totalQuestions,
          conversionRate: parseFloat(conversionRate),
          questionRate: parseFloat(questionRate),
        },
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_CONVERSION_METRICS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversion metrics',
      error: error.message,
    });
  }
});

module.exports = router;
