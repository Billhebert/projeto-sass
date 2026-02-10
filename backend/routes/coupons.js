/**
 * Coupons Routes
 * Mercado Livre Seller Coupons API Integration
 * 
 * Endpoints:
 * - GET /api/coupons/:accountId - List all coupons
 * - POST /api/coupons/:accountId - Create new coupon
 * - GET /api/coupons/:accountId/:couponId - Get coupon details
 * - PUT /api/coupons/:accountId/:couponId - Update coupon
 * - DELETE /api/coupons/:accountId/:couponId - Delete coupon
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
 * GET /api/coupons/:accountId
 * List all coupons for the seller
 */
router.get('/:accountId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { offset = 0, limit = 50, status } = req.query;
    const mlUserId = req.mlAccount.mlUserId;

    const params = { offset, limit };
    if (status) params.status = status;

    // Use SDK execute for custom endpoint
    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(`/users/${mlUserId}/coupons`, { params });
    });

    sendSuccess(res, { data: response.data });
  } catch (error) {
    logger.error('Error fetching coupons:', { error: error.message });

    if (error.response?.status === 403 || error.response?.status === 404) {
      return sendSuccess(res, { results: [], paging: { total: 0 } });
    }

    handleError(res, 500, 'Failed to fetch coupons', error, {
      action: 'FETCH_COUPONS_ERROR',
      accountId: req.params.accountId
    });
  }
});

/**
 * POST /api/coupons/:accountId
 * Create a new coupon
 */
router.post('/:accountId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const {
      code,
      discount_type, // 'percentage' or 'fixed'
      discount_value,
      start_date,
      end_date,
      max_redemptions,
      min_purchase_amount,
      items, // array of item IDs (optional)
    } = req.body;

    // Validate required fields
    if (!code || !discount_type || !discount_value) {
      return res.status(400).json({
        success: false,
        error: 'Code, discount_type, and discount_value are required',
      });
    }

    const couponData = {
      code: code.toUpperCase(),
      discount_type,
      discount_value: parseFloat(discount_value),
      start_date: start_date || new Date().toISOString(),
      end_date,
      max_redemptions: max_redemptions ? parseInt(max_redemptions) : null,
      min_purchase_amount: min_purchase_amount ? parseFloat(min_purchase_amount) : null,
    };

    if (items && items.length > 0) {
      couponData.items = items;
    }

    const response = await axios.post(
      `${ML_API_BASE}/users/${mlUserId}/coupons`,
      couponData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Coupon created:', {
      code: couponData.code,
      accountId: req.mlAccount.id,
    });

    res.json({
      success: true,
      data: response.data,
      message: 'Coupon created successfully',
    });
  } catch (error) {
    logger.error('Error creating coupon:', {
      error: error.message,
      response: error.response?.data,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/coupons/:accountId/:couponId
 * Get coupon details
 */
router.get('/:accountId/:couponId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { couponId } = req.params;
    const { accessToken, mlUserId } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/coupons/${couponId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching coupon details:', {
      error: error.message,
      couponId: req.params.couponId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * PUT /api/coupons/:accountId/:couponId
 * Update a coupon
 */
router.put('/:accountId/:couponId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { couponId } = req.params;
    const { accessToken, mlUserId } = req.mlAccount;
    const updates = req.body;

    const response = await axios.put(
      `${ML_API_BASE}/users/${mlUserId}/coupons/${couponId}`,
      updates,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Coupon updated:', {
      couponId,
      accountId: req.mlAccount.id,
    });

    res.json({
      success: true,
      data: response.data,
      message: 'Coupon updated successfully',
    });
  } catch (error) {
    logger.error('Error updating coupon:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * DELETE /api/coupons/:accountId/:couponId
 * Delete/deactivate a coupon
 */
router.delete('/:accountId/:couponId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { couponId } = req.params;
    const { accessToken, mlUserId } = req.mlAccount;

    const response = await axios.delete(
      `${ML_API_BASE}/users/${mlUserId}/coupons/${couponId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    logger.info('Coupon deleted:', {
      couponId,
      accountId: req.mlAccount.id,
    });

    res.json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting coupon:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/coupons/:accountId/:couponId/stats
 * Get coupon usage statistics
 */
router.get('/:accountId/:couponId/stats', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { couponId } = req.params;
    const { accessToken, mlUserId } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/coupons/${couponId}/stats`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching coupon stats:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});


module.exports = router;
