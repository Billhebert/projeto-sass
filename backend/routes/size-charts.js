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
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const { handleError, sendSuccess } = require('../middleware/response-helpers');

const router = express.Router();

/**
 * GET /api/size-charts/:accountId/catalog
 * List all available size charts from ML catalog
 */
router.get('/:accountId/catalog', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { domain_id } = req.query;

    const response = await sdkManager.execute(accountId, async (sdk) => {
      const params = {};
      if (domain_id) params.domain_id = domain_id;
      return await sdk.axiosInstance.get('/catalog/charts', { params });
    });

    logger.info({
      action: 'LIST_SIZE_CHARTS_CATALOG',
      accountId,
      userId: req.user.userId,
      chartsCount: response.data?.length || 0,
    });

    sendSuccess(res, { data: response.data });
  } catch (error) {
    handleError(res, 500, 'Failed to list size charts catalog', error, {
      action: 'LIST_SIZE_CHARTS_CATALOG_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId
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

    const [categoryRes, chartsRes] = await Promise.all([
      sdkManager.execute(accountId, async (sdk) => {
        return await sdk.axiosInstance.get(`/categories/${categoryId}`);
      }),
      sdkManager.execute(accountId, async (sdk) => {
        return await sdk.axiosInstance.get(`/categories/${categoryId}/size_charts`).catch(() => ({ data: null }));
      }),
    ]);

    logger.info({
      action: 'GET_CATEGORY_SIZE_CHARTS',
      accountId,
      categoryId,
      userId: req.user.userId,
    });

    sendSuccess(res, {
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
    handleError(res, 500, 'Failed to get category size charts', error, {
      action: 'GET_CATEGORY_SIZE_CHARTS_ERROR',
      accountId: req.params.accountId,
      categoryId: req.params.categoryId,
      userId: req.user.userId
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

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(`/catalog/charts/${chartId}`);
    });

    logger.info({
      action: 'GET_SIZE_CHART_DETAILS',
      accountId,
      chartId,
      userId: req.user.userId,
    });

    sendSuccess(res, { data: response.data });
  } catch (error) {
    handleError(res, 500, 'Failed to get size chart details', error, {
      action: 'GET_SIZE_CHART_DETAILS_ERROR',
      accountId: req.params.accountId,
      chartId: req.params.chartId,
      userId: req.user.userId
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

    const item = await sdkManager.getItem(accountId, itemId);
    const sizeChartId = item.size_chart_id;
    let sizeChart = null;

    if (sizeChartId) {
      try {
        const chartRes = await sdkManager.execute(accountId, async (sdk) => {
          return await sdk.axiosInstance.get(`/catalog/charts/${sizeChartId}`);
        });
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

    sendSuccess(res, {
      data: {
        item_id: itemId,
        size_chart_id: sizeChartId,
        size_chart: sizeChart,
        category_id: item.category_id,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to get item size chart', error, {
      action: 'GET_ITEM_SIZE_CHART_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId
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

    if (!chart_id) {
      return res.status(400).json({
        success: false,
        message: 'chart_id is required',
      });
    }

    const response = await sdkManager.updateItem(accountId, itemId, {
      size_chart_id: chart_id
    });

    logger.info({
      action: 'ASSOCIATE_SIZE_CHART',
      accountId,
      itemId,
      chartId: chart_id,
      userId: req.user.userId,
    });

    sendSuccess(res, {
      data: {
        item_id: itemId,
        size_chart_id: chart_id,
        item: response,
      },
      message: 'Size chart associated successfully',
    });
  } catch (error) {
    handleError(res, 500, 'Failed to associate size chart', error, {
      action: 'ASSOCIATE_SIZE_CHART_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId
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

    const response = await sdkManager.updateItem(accountId, itemId, {
      size_chart_id: null
    });

    logger.info({
      action: 'REMOVE_SIZE_CHART',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    sendSuccess(res, {
      data: {
        item_id: itemId,
        item: response,
      },
      message: 'Size chart removed successfully',
    });
  } catch (error) {
    handleError(res, 500, 'Failed to remove size chart', error, {
      action: 'REMOVE_SIZE_CHART_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId
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

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get('/sites/MLB/domains');
    });

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

    sendSuccess(res, {
      data: {
        fashion_domains: fashionDomains,
        all_domains: response.data,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to list domains', error, {
      action: 'LIST_SIZE_CHART_DOMAINS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId
    });
  }
});


module.exports = router;
