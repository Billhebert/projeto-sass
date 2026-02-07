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

// ============================================================================
// CORE HELPERS
// ============================================================================

/**
 * Handle and log errors with consistent response format
 */
const handleError = (res, statusCode = 500, message, error = null, context = {}) => {
  logger.error({
    action: context.action || 'UNKNOWN_ERROR',
    error: error?.message || message,
    statusCode,
    ...context,
  });

  const response = { success: false, message };
  if (error?.message) response.error = error.message;
  res.status(statusCode).json(response);
};

/**
 * Send success response with consistent format
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = { success: true, data };
  if (message) response.message = message;
  res.status(statusCode).json(response);
};


const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const MLAccount = require('../db/models/MLAccount');
const { authenticateToken } = require('../middleware/auth');

const ML_API_BASE = 'https://api.mercadolibre.com';

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
    const { itemId } = req.params;
    const { accessToken } = req.mlAccount;
    const { last = 30, unit = 'day' } = req.query;

    const response = await axios.get(
      `${ML_API_BASE}/items/${itemId}/visits/time_window`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          last,
          unit, // 'day', 'hour'
        },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching item visits:', {
      error: error.message,
      itemId: req.params.itemId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/visits/:accountId/items/:itemId/time-window
 * Get visits by time window with more granular control
 */
router.get('/:accountId/items/:itemId/time-window', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { accessToken } = req.mlAccount;
    const { date_from, date_to, ending } = req.query;

    const params = {};
    if (date_from) params.date_from = date_from;
    if (date_to) params.date_to = date_to;
    if (ending) params.ending = ending;

    const response = await axios.get(
      `${ML_API_BASE}/items/${itemId}/visits/time_window`,
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
    logger.error('Error fetching item visits time window:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/visits/:accountId/summary
 * Get visits summary for all seller's items
 */
router.get('/:accountId/summary', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const { last = 30, unit = 'day' } = req.query;

    const response = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/items_visits/time_window`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          last,
          unit,
        },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching visits summary:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/visits/:accountId/top-items
 * Get top visited items
 */
router.get('/:accountId/top-items', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const { limit = 10 } = req.query;

    // Get active items
    const itemsResponse = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/items/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          status: 'active',
          limit: 50,
        },
      }
    );

    const itemIds = itemsResponse.data.results || [];

    if (itemIds.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get visits for each item (limited to avoid rate limiting)
    const visitsPromises = itemIds.slice(0, 20).map(async (itemId) => {
      try {
        const [itemResponse, visitsResponse] = await Promise.all([
          axios.get(`${ML_API_BASE}/items/${itemId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          axios.get(`${ML_API_BASE}/items/${itemId}/visits/time_window`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { last: 7, unit: 'day' },
          }),
        ]);

        const totalVisits = visitsResponse.data.results?.reduce(
          (sum, day) => sum + (day.total || 0),
          0
        ) || 0;

        return {
          id: itemId,
          title: itemResponse.data.title,
          thumbnail: itemResponse.data.thumbnail,
          price: itemResponse.data.price,
          permalink: itemResponse.data.permalink,
          visits: totalVisits,
          soldQuantity: itemResponse.data.sold_quantity,
        };
      } catch (err) {
        return null;
      }
    });

    const itemsWithVisits = (await Promise.all(visitsPromises))
      .filter(item => item !== null)
      .sort((a, b) => b.visits - a.visits)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: itemsWithVisits,
    });
  } catch (error) {
    logger.error('Error fetching top items:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/visits/:accountId/comparison
 * Compare visits between items
 */
router.get('/:accountId/comparison', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken } = req.mlAccount;
    const { items } = req.query; // comma-separated item IDs

    if (!items) {
      return res.status(400).json({
        success: false,
        error: 'Items parameter is required (comma-separated IDs)',
      });
    }

    const itemIds = items.split(',').slice(0, 5); // Limit to 5 items

    const visitsPromises = itemIds.map(async (itemId) => {
      try {
        const [itemResponse, visitsResponse] = await Promise.all([
          axios.get(`${ML_API_BASE}/items/${itemId.trim()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          axios.get(`${ML_API_BASE}/items/${itemId.trim()}/visits/time_window`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { last: 30, unit: 'day' },
          }),
        ]);

        return {
          id: itemId.trim(),
          title: itemResponse.data.title,
          visits: visitsResponse.data.results || [],
          totalVisits: visitsResponse.data.results?.reduce(
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

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    logger.error('Error comparing visits:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});


module.exports = router;
