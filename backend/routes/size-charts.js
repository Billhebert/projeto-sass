/**
 * Size Charts Routes (Tabelas de Medidas)
 * Manage size charts for fashion items
 * 
 * API Mercado Livre:
 * - GET /catalog/charts - List available size charts
 * - GET /catalog/charts/{chart_id} - Get specific chart
 * - GET /categories/{category_id}/size_charts - Size charts by category
 * - POST /items/{item_id}/size_charts - Associate size chart to item
 * - DELETE /items/{item_id}/size_charts - Remove size chart from item
 * 
 * Routes:
 * GET    /api/size-charts/:accountId/catalog             - List available charts from ML
 * GET    /api/size-charts/:accountId/category/:categoryId - Get charts for category
 * GET    /api/size-charts/:accountId/chart/:chartId      - Get specific chart details
 * GET    /api/size-charts/:accountId/item/:itemId        - Get item's size chart
 * POST   /api/size-charts/:accountId/item/:itemId        - Associate chart to item
 * DELETE /api/size-charts/:accountId/item/:itemId        - Remove chart from item
 */

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * GET /api/size-charts/:accountId/catalog
 * List all available size charts from ML catalog
 */
router.get('/:accountId/catalog', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { domain_id } = req.query;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const params = {};
    if (domain_id) params.domain_id = domain_id;

    const response = await axios.get(
      `${ML_API_BASE}/catalog/charts`,
      { headers, params }
    );

    logger.info({
      action: 'LIST_SIZE_CHARTS_CATALOG',
      accountId,
      userId: req.user.userId,
      chartsCount: response.data?.length || 0,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'LIST_SIZE_CHARTS_CATALOG_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to list size charts catalog',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/size-charts/:accountId/category/:categoryId
 * Get size charts available for a specific category
 */
router.get('/:accountId/category/:categoryId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, categoryId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get category info and size chart requirements
    const [categoryRes, chartsRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/categories/${categoryId}`, { headers }),
      axios.get(`${ML_API_BASE}/categories/${categoryId}/size_charts`, { headers }).catch(() => ({ data: null })),
    ]);

    logger.info({
      action: 'GET_CATEGORY_SIZE_CHARTS',
      accountId,
      categoryId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: {
        category: {
          id: categoryRes.data.id,
          name: categoryRes.data.name,
        },
        size_charts: chartsRes.data,
        size_chart_required: categoryRes.data.settings?.size_chart_required || false,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_CATEGORY_SIZE_CHARTS_ERROR',
      accountId: req.params.accountId,
      categoryId: req.params.categoryId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get category size charts',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/size-charts/:accountId/chart/:chartId
 * Get specific size chart details
 */
router.get('/:accountId/chart/:chartId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, chartId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(
      `${ML_API_BASE}/catalog/charts/${chartId}`,
      { headers }
    );

    logger.info({
      action: 'GET_SIZE_CHART_DETAILS',
      accountId,
      chartId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'GET_SIZE_CHART_DETAILS_ERROR',
      accountId: req.params.accountId,
      chartId: req.params.chartId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get size chart details',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/size-charts/:accountId/item/:itemId
 * Get size chart associated with an item
 */
router.get('/:accountId/item/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get item to find size chart info
    const itemResponse = await axios.get(
      `${ML_API_BASE}/items/${itemId}`,
      { headers }
    );

    const sizeChartId = itemResponse.data.size_chart_id;
    let sizeChart = null;

    if (sizeChartId) {
      try {
        const chartRes = await axios.get(
          `${ML_API_BASE}/catalog/charts/${sizeChartId}`,
          { headers }
        );
        sizeChart = chartRes.data;
      } catch (err) {
        // Chart may not be accessible
      }
    }

    logger.info({
      action: 'GET_ITEM_SIZE_CHART',
      accountId,
      itemId,
      userId: req.user.userId,
      hasSizeChart: !!sizeChart,
    });

    res.json({
      success: true,
      data: {
        item_id: itemId,
        size_chart_id: sizeChartId,
        size_chart: sizeChart,
        category_id: itemResponse.data.category_id,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ITEM_SIZE_CHART_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get item size chart',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/size-charts/:accountId/item/:itemId
 * Associate a size chart to an item
 */
router.post('/:accountId/item/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { chart_id } = req.body;
    const account = req.mlAccount;

    if (!chart_id) {
      return res.status(400).json({
        success: false,
        message: 'chart_id is required',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Update item with size chart
    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      { size_chart_id: chart_id },
      { headers }
    );

    logger.info({
      action: 'ASSOCIATE_SIZE_CHART',
      accountId,
      itemId,
      chartId: chart_id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Size chart associated successfully',
      data: {
        item_id: itemId,
        size_chart_id: chart_id,
        item: response.data,
      },
    });
  } catch (error) {
    logger.error({
      action: 'ASSOCIATE_SIZE_CHART_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to associate size chart',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * DELETE /api/size-charts/:accountId/item/:itemId
 * Remove size chart from an item
 */
router.delete('/:accountId/item/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Remove size chart by setting to null
    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      { size_chart_id: null },
      { headers }
    );

    logger.info({
      action: 'REMOVE_SIZE_CHART',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Size chart removed successfully',
      data: {
        item_id: itemId,
        item: response.data,
      },
    });
  } catch (error) {
    logger.error({
      action: 'REMOVE_SIZE_CHART_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to remove size chart',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/size-charts/:accountId/domains
 * List domains that support size charts
 */
router.get('/:accountId/domains', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get site info for Brazil
    const siteId = 'MLB';
    const response = await axios.get(
      `${ML_API_BASE}/sites/${siteId}/domains`,
      { headers }
    );

    // Filter domains that typically require size charts (fashion categories)
    const fashionDomains = response.data.filter(domain => 
      domain.id.includes('CLOTH') || 
      domain.id.includes('SHOES') || 
      domain.id.includes('FASHION')
    );

    logger.info({
      action: 'LIST_SIZE_CHART_DOMAINS',
      accountId,
      userId: req.user.userId,
      domainsCount: fashionDomains.length,
    });

    res.json({
      success: true,
      data: {
        fashion_domains: fashionDomains,
        all_domains: response.data,
      },
    });
  } catch (error) {
    logger.error({
      action: 'LIST_SIZE_CHART_DOMAINS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to list domains',
      error: error.response?.data?.message || error.message,
    });
  }
});

module.exports = router;
