/**
 * Returns Routes
 * Mercado Livre Returns/Devoluções API Integration
 * 
 * Endpoints:
 * - GET /api/returns/:accountId - List all returns
 * - GET /api/returns/:accountId/:returnId - Get return details
 * - GET /api/returns/:accountId/order/:orderId - Get returns for an order
 * - POST /api/returns/:accountId/:returnId/actions - Take action on return
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../logger');
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
 * GET /api/returns/:accountId
 * List all returns for the account
 */
router.get('/:accountId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const { offset = 0, limit = 50, status } = req.query;

    const params = {
      seller_id: mlUserId,
      offset,
      limit,
    };

    if (status) {
      params.status = status;
    }

    // Get claims that are returns
    const response = await axios.get(
      `${ML_API_BASE}/claims/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          ...params,
          resource_type: 'order',
        },
      }
    );

    // Filter for return-related claims
    const returns = (response.data.data || []).filter(claim => 
      claim.type === 'return' || 
      claim.reason?.includes('return') ||
      claim.reason?.includes('devolu')
    );

    res.json({
      success: true,
      data: {
        returns,
        paging: response.data.paging,
      },
    });
  } catch (error) {
    logger.error('Error fetching returns:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/returns/:accountId/:claimId
 * Get return details
 */
router.get('/:accountId/:claimId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/claims/${claimId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching return details:', {
      error: error.message,
      claimId: req.params.claimId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/returns/:accountId/order/:orderId
 * Get returns for a specific order
 */
router.get('/:accountId/order/:orderId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/orders/${orderId}/returns`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching order returns:', {
      error: error.message,
      orderId: req.params.orderId,
    });

    if (error.response?.status === 404) {
      return res.json({
        success: true,
        data: [],
        message: 'No returns for this order',
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/returns/:accountId/:claimId/messages
 * Send a message on a return claim
 */
router.post('/:accountId/:claimId/messages', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { accessToken } = req.mlAccount;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const response = await axios.post(
      `${ML_API_BASE}/claims/${claimId}/messages`,
      { message: message.trim() },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Return message sent:', {
      claimId,
      accountId: req.mlAccount.id,
    });

    res.json({
      success: true,
      data: response.data,
      message: 'Message sent successfully',
    });
  } catch (error) {
    logger.error('Error sending return message:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/returns/:accountId/:claimId/shipping-label
 * Get shipping label for return
 */
router.get('/:accountId/:claimId/shipping-label', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { accessToken } = req.mlAccount;

    // Get claim to find shipment
    const claimResponse = await axios.get(
      `${ML_API_BASE}/claims/${claimId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const shipmentId = claimResponse.data.return_shipment_id;

    if (!shipmentId) {
      return res.status(404).json({
        success: false,
        error: 'No return shipment found for this claim',
      });
    }

    // Get shipping label
    const labelResponse = await axios.get(
      `${ML_API_BASE}/shipment_labels`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          shipment_ids: shipmentId,
          response_type: 'pdf',
        },
        responseType: 'arraybuffer',
      }
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="return-label-${claimId}.pdf"`,
    });

    res.send(labelResponse.data);
  } catch (error) {
    logger.error('Error fetching return label:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/returns/:accountId/stats
 * Get return statistics
 */
router.get('/:accountId/stats/summary', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;

    // Get user reputation which includes return metrics
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
        claims: seller_reputation?.metrics?.claims || {},
        cancellations: seller_reputation?.metrics?.cancellations || {},
        sales: seller_reputation?.metrics?.sales || {},
      },
    });
  } catch (error) {
    logger.error('Error fetching return stats:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

// ============================================
// POST-PURCHASE V2 API ENDPOINTS
// ============================================

/**
 * GET /api/returns/:accountId/post-purchase/:claimId
 * Get return details from post-purchase/v2 API
 */
router.get('/:accountId/post-purchase/:claimId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/post-purchase/v2/claims/${claimId}/returns`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching post-purchase return:', {
      error: error.message,
      claimId: req.params.claimId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/returns/:accountId/post-purchase/:claimId/review
 * Submit return review (approve/reject)
 */
router.post('/:accountId/post-purchase/:claimId/review', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { action, reason } = req.body;
    const { accessToken } = req.mlAccount;

    // Valid actions: 'approve', 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be "approve" or "reject"',
      });
    }

    const payload = { action };
    if (action === 'reject' && reason) {
      payload.reason = reason;
    }

    const response = await axios.post(
      `${ML_API_BASE}/post-purchase/v2/claims/${claimId}/returns/review`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Return review submitted:', {
      claimId,
      action,
      accountId: req.mlAccount.id,
    });

    res.json({
      success: true,
      message: `Return ${action}d successfully`,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error submitting return review:', {
      error: error.message,
      claimId: req.params.claimId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/returns/:accountId/:claimId/evidence
 * Upload evidence for a return claim
 */
router.post('/:accountId/:claimId/evidence', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { evidence_type, description, files } = req.body;
    const { accessToken } = req.mlAccount;

    if (!evidence_type) {
      return res.status(400).json({
        success: false,
        error: 'evidence_type is required',
      });
    }

    const payload = {
      evidence_type,
      description: description || '',
    };

    if (files && Array.isArray(files)) {
      payload.files = files;
    }

    const response = await axios.post(
      `${ML_API_BASE}/claims/${claimId}/evidences`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Return evidence uploaded:', {
      claimId,
      evidenceType: evidence_type,
      accountId: req.mlAccount.id,
    });

    res.json({
      success: true,
      message: 'Evidence uploaded successfully',
      data: response.data,
    });
  } catch (error) {
    logger.error('Error uploading return evidence:', {
      error: error.message,
      claimId: req.params.claimId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/returns/:accountId/:claimId/evidences
 * Get all evidences for a return claim
 */
router.get('/:accountId/:claimId/evidences', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/claims/${claimId}/evidences`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching return evidences:', {
      error: error.message,
      claimId: req.params.claimId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/returns/:accountId/:claimId/timeline
 * Get return claim timeline/history
 */
router.get('/:accountId/:claimId/timeline', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/claims/${claimId}/timeline`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching return timeline:', {
      error: error.message,
      claimId: req.params.claimId,
    });

    // Timeline may not exist for all claims
    if (error.response?.status === 404) {
      return res.json({
        success: true,
        data: [],
        message: 'No timeline available',
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/returns/:accountId/:claimId/refund
 * Process refund for return
 */
router.post('/:accountId/:claimId/refund', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { amount, reason } = req.body;
    const { accessToken } = req.mlAccount;

    const payload = {};
    if (amount) payload.amount = amount;
    if (reason) payload.reason = reason;

    const response = await axios.post(
      `${ML_API_BASE}/claims/${claimId}/refund`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Return refund processed:', {
      claimId,
      amount,
      accountId: req.mlAccount.id,
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: response.data,
    });
  } catch (error) {
    logger.error('Error processing return refund:', {
      error: error.message,
      claimId: req.params.claimId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/returns/:accountId/:claimId/tracking
 * Get return shipment tracking
 */
router.get('/:accountId/:claimId/tracking', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { accessToken } = req.mlAccount;

    // First get claim to find return shipment
    const claimResponse = await axios.get(
      `${ML_API_BASE}/claims/${claimId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const returnShipmentId = claimResponse.data.return_shipment_id;

    if (!returnShipmentId) {
      return res.json({
        success: true,
        data: null,
        message: 'No return shipment found',
      });
    }

    // Get tracking info
    const trackingResponse = await axios.get(
      `${ML_API_BASE}/shipments/${returnShipmentId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // Get tracking history
    const historyResponse = await axios.get(
      `${ML_API_BASE}/shipments/${returnShipmentId}/history`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    ).catch(() => ({ data: null }));

    res.json({
      success: true,
      data: {
        shipment: trackingResponse.data,
        history: historyResponse.data,
      },
    });
  } catch (error) {
    logger.error('Error fetching return tracking:', {
      error: error.message,
      claimId: req.params.claimId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

module.exports = router;
