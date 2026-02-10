/**
 * Visits Routes
 * Mercado Livre Item Visits/Analytics API Integration
 * 
 * Endpoints:
 * - GET /api/visits/:accountId/items/:itemId - Get visits for a specific item
 * - GET /api/visits/:accountId/summary - Get visits summary for all items
 * - GET /api/visits/:accountId/items/:itemId/time-window - Get visits by time window
 */

const express = require('express');
const router = express.Router();
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const MLAccount = require('../db/models/MLAccount');
const { authenticateToken } = require('../middleware/auth');
const { handleError, sendSuccess } = require('../middleware/response-helpers');

// Middleware to get ML account
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
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * GET /api/visits/:accountId/items/:itemId
 * Get visits for a specific item
 */
router.get('/:accountId/items/:itemId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { last = 30, unit = 'day' } = req.query;

    // Get visits using SDK
    const visitsData = await sdkManager.getVisitsTimeWindow(
      accountId,
      req.mlAccount.mlUserId,
      parseInt(last),
      unit
    );

    sendSuccess(res, visitsData);
  } catch (error) {
    handleError(res, 500, 'Failed to fetch item visits', error, {
      action: 'FETCH_ITEM_VISITS_ERROR',
      itemId: req.params.itemId
    });
  }
});

/**
 * GET /api/visits/:accountId/items/:itemId/time-window
 * Get visits by time window with more granular control
 */
router.get('/:accountId/items/:itemId/time-window', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { date_from, date_to, ending } = req.query;

    // Get visits using SDK
    const visitsData = await sdkManager.execute(accountId, async (sdk) => {
      const params = {};
      if (date_from) params.date_from = date_from;
      if (date_to) params.date_to = date_to;
      if (ending) params.ending = ending;

      const response = await sdk.axiosInstance.get(
        `/items/${itemId}/visits/time_window`,
        { params }
      );
      return response.data;
    });

    sendSuccess(res, visitsData);
  } catch (error) {
    handleError(res, 500, 'Failed to fetch item visits time window', error, {
      action: 'FETCH_ITEM_VISITS_TIME_WINDOW_ERROR',
      itemId: req.params.itemId
    });
  }
});

/**
 * GET /api/visits/:accountId/summary
 * Get visits summary for all seller's items
 */
router.get('/:accountId/summary', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { last = 30, unit = 'day' } = req.query;

    // Get visits summary using SDK
    const visitsSummary = await sdkManager.getUserVisits(
      accountId,
      req.mlAccount.mlUserId,
      new Date(Date.now() - parseInt(last) * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    );

    sendSuccess(res, {
      period: { last, unit },
      data: visitsSummary
    });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch visits summary', error, {
      action: 'FETCH_VISITS_SUMMARY_ERROR',
      accountId: req.params.accountId
    });
  }
});

/**
 * GET /api/visits/:accountId/top-items
 * Get top visited items
 */
router.get('/:accountId/top-items', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 10 } = req.query;
    const mlUserId = req.mlAccount.mlUserId;

    // Get active items using SDK
    const itemsData = await sdkManager.getAllUserItems(accountId, mlUserId, {
      status: 'active',
      limit: 50
    });

    const itemIds = itemsData.results || [];

    if (itemIds.length === 0) {
      return sendSuccess(res, []);
    }

    // Get visits and details for each item using SDK
    const visitsPromises = itemIds.slice(0, 20).map(async (itemId) => {
      try {
        const [itemData, visitsData] = await Promise.all([
          sdkManager.getItem(accountId, itemId),
          sdkManager.getVisitsTimeWindow(accountId, mlUserId, 7, 'day').catch(() => ({ total_visits: 0 }))
        ]);

        const totalVisits = visitsData.total_visits ||
          visitsData.results?.reduce((sum, day) => sum + (day.total || 0), 0) || 0;

        return {
          id: itemId,
          title: itemData.title,
          thumbnail: itemData.thumbnail,
          price: itemData.price,
          permalink: itemData.permalink,
          visits: totalVisits,
          soldQuantity: itemData.sold_quantity,
        };
      } catch (err) {
        return null;
      }
    });

    const itemsWithVisits = (await Promise.all(visitsPromises))
      .filter(item => item !== null)
      .sort((a, b) => b.visits - a.visits)
      .slice(0, parseInt(limit));

    sendSuccess(res, itemsWithVisits);
  } catch (error) {
    handleError(res, 500, 'Failed to fetch top items', error, {
      action: 'FETCH_TOP_ITEMS_ERROR',
      accountId: req.params.accountId
    });
  }
});

/**
 * GET /api/visits/:accountId/comparison
 * Compare visits between items
 */
router.get('/:accountId/comparison', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { items } = req.query;
    const mlUserId = req.mlAccount.mlUserId;

    if (!items) {
      return res.status(400).json({
        success: false,
        error: 'Items parameter is required (comma-separated IDs)',
      });
    }

    const itemIds = items.split(',').slice(0, 5);

    const visitsPromises = itemIds.map(async (itemId) => {
      try {
        const [itemData, visitsData] = await Promise.all([
          sdkManager.getItem(accountId, itemId.trim()),
          sdkManager.getVisitsTimeWindow(accountId, mlUserId, 30, 'day').catch(() => ({ results: [] }))
        ]);

        return {
          id: itemId.trim(),
          title: itemData.title,
          visits: visitsData.results || [],
          totalVisits: visitsData.results?.reduce(
            (sum, day) => sum + (day.total || 0),
            0
          ) || 0,
        };
      } catch (err) {
        return {
          id: itemId.trim(),
          error: err.message,
        };
      }
    });

    const comparison = await Promise.all(visitsPromises);

    sendSuccess(res, comparison);
  } catch (error) {
    handleError(res, 500, 'Failed to compare visits', error, {
      action: 'COMPARE_VISITS_ERROR',
      accountId: req.params.accountId
    });
  }
});


module.exports = router;
