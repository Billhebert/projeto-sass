/**
 * Feedback Routes
 * Mercado Livre Feedback/Reviews API Integration
 * 
 * Endpoints:
 * - GET /api/feedback/:accountId/orders/:orderId - Get feedback for an order
 * - POST /api/feedback/:accountId/orders/:orderId - Create feedback for an order
 * - GET /api/feedback/:accountId/seller - Get seller feedback summary
 * - GET /api/feedback/:accountId/buyer/:buyerId - Get buyer feedback
 * - POST /api/feedback/:accountId/:feedbackId/reply - Reply to feedback
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const MLAccount = require('../db/models/MLAccount');
const { authenticateToken } = require('../middleware/auth');

const ML_API_BASE = 'https://api.mercadolibre.com';

// Middleware to get ML account and validate token
async function getMLAccount(req, res, next) {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;

    const account = await MLAccount.findOne({ id: accountId, userId });
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'ML account not found',
      });
    }

    if (account.isTokenExpired()) {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please refresh.',
      });
    }

    req.mlAccount = account;
    next();
  } catch (error) {
    logger.error('Error getting ML account:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/feedback/:accountId/orders/:orderId
 * Get feedback for a specific order
 */
router.get('/:accountId/orders/:orderId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/orders/${orderId}/feedback`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching order feedback:', {
      error: error.message,
      orderId: req.params.orderId,
      status: error.response?.status,
    });

    if (error.response?.status === 404) {
      return res.json({
        success: true,
        data: { sale: null, purchase: null },
        message: 'No feedback found for this order',
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/feedback/:accountId/orders/:orderId
 * Create feedback for an order (as seller)
 */
router.post('/:accountId/orders/:orderId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { accessToken } = req.mlAccount;
    const { rating, fulfilled, message } = req.body;

    // Validate required fields
    if (!rating || typeof fulfilled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Rating and fulfilled status are required',
      });
    }

    // Valid ratings: positive, negative, neutral
    const validRatings = ['positive', 'negative', 'neutral'];
    if (!validRatings.includes(rating)) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be: positive, negative, or neutral',
      });
    }

    const feedbackData = {
      rating,
      fulfilled,
      message: message || '',
    };

    const response = await axios.post(
      `${ML_API_BASE}/orders/${orderId}/feedback`,
      feedbackData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Feedback created successfully:', {
      orderId,
      rating,
      accountId: req.mlAccount.id,
    });

    res.json({
      success: true,
      data: response.data,
      message: 'Feedback created successfully',
    });
  } catch (error) {
    logger.error('Error creating feedback:', {
      error: error.message,
      orderId: req.params.orderId,
      response: error.response?.data,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/feedback/:accountId/seller
 * Get seller feedback summary and history
 */
router.get('/:accountId/seller', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const { offset = 0, limit = 50 } = req.query;

    // Get feedback summary
    const [summaryResponse, historyResponse] = await Promise.all([
      axios.get(`${ML_API_BASE}/users/${mlUserId}/feedback`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      axios.get(`${ML_API_BASE}/orders/search`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          seller: mlUserId,
          feedback_status: 'pending',
          offset,
          limit,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        summary: summaryResponse.data,
        pendingFeedback: historyResponse.data,
      },
    });
  } catch (error) {
    logger.error('Error fetching seller feedback:', {
      error: error.message,
      mlUserId: req.mlAccount?.mlUserId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/feedback/:accountId/received
 * Get received feedback for seller
 */
router.get('/:accountId/received', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const { offset = 0, limit = 50, rating } = req.query;

    const params = {
      offset,
      limit,
    };

    if (rating && ['positive', 'negative', 'neutral'].includes(rating)) {
      params.rating = rating;
    }

    const response = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/feedback/received`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching received feedback:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/feedback/:accountId/:feedbackId/reply
 * Reply to a feedback
 */
router.post('/:accountId/:feedbackId/reply', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { accessToken } = req.mlAccount;
    const { reply } = req.body;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Reply message is required',
      });
    }

    const response = await axios.post(
      `${ML_API_BASE}/feedback/${feedbackId}/reply`,
      { reply: reply.trim() },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Feedback reply sent:', {
      feedbackId,
      accountId: req.mlAccount.id,
    });

    res.json({
      success: true,
      data: response.data,
      message: 'Reply sent successfully',
    });
  } catch (error) {
    logger.error('Error replying to feedback:', {
      error: error.message,
      feedbackId: req.params.feedbackId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/feedback/:accountId/stats
 * Get feedback statistics
 */
router.get('/:accountId/stats', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;

    // Get user reputation which includes feedback stats
    const response = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const { seller_reputation } = response.data;

    res.json({
      success: true,
      data: {
        transactions: seller_reputation?.transactions || {},
        ratings: seller_reputation?.metrics?.sales?.completed || 0,
        positive: seller_reputation?.transactions?.ratings?.positive || 0,
        negative: seller_reputation?.transactions?.ratings?.negative || 0,
        neutral: seller_reputation?.transactions?.ratings?.neutral || 0,
        levelId: seller_reputation?.level_id,
        powerSellerStatus: seller_reputation?.power_seller_status,
      },
    });
  } catch (error) {
    logger.error('Error fetching feedback stats:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

module.exports = router;
