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
const sdkManager = require("../services/sdk-manager");
const MLAccount = require('../db/models/MLAccount');
const { authenticateToken } = require('../middleware/auth');

const ML_API_BASE = 'https://api.mercadolibre.com';

// ============================================================================
// CORE HELPER FUNCTIONS
// ============================================================================

/**
 * Send successful response
 */
function sendSuccess(res, data, message = '', statusCode = 200) {
  const response = { success: true };
  if (message) response.message = message;
  if (data !== undefined) response.data = data;
  return res.status(statusCode).json(response);
}

/**
 * Send error response
 */
function sendError(res, statusCode, error, message = '', action = '', context = {}) {
  logger.error({
    action,
    ...context,
    error: error.message || error,
  });
  return res.status(statusCode).json({
    success: false,
    error: error.response?.data?.message || message || error.message || error,
  });
}

/**
 * Build authorization headers
 */
function buildHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Get and validate ML account
 */
async function getAndValidateAccount(accountId, userId) {
  const account = await MLAccount.findOne({ id: accountId, userId });
  if (!account) return { error: 'ML account not found', statusCode: 404 };
  if (account.isTokenExpired()) return { error: 'Token expired. Please refresh.', statusCode: 401 };
  return account;
}

// Middleware to get ML account
async function getMLAccount(req, res, next) {
  try {
    const { accountId } = req.params;
    const result = await getAndValidateAccount(accountId, req.user.userId);
    
    if (result.error) {
      return res.status(result.statusCode).json({ success: false, error: result.error });
    }

    req.mlAccount = result;
    next();
  } catch (error) {
    logger.error('Error getting ML account:', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ============================================================================
// RETURNS-SPECIFIC HELPER FUNCTIONS
// ============================================================================

/**
 * Filter returns from claims
 */
function filterReturns(claims) {
  return (claims || []).filter(claim => 
    claim.type === 'return' || 
    claim.reason?.includes('return') ||
    claim.reason?.includes('devolu')
  );
}

/**
 * Build return params for claims search
 */
function buildReturnParams(query, mlUserId) {
  const params = {
    seller_id: mlUserId,
    offset: parseInt(query.offset || 0),
    limit: parseInt(query.limit || 50),
    resource_type: 'order',
  };
  if (query.status) params.status = query.status;
  return params;
}

/**
 * Add account info to return
 */
function addAccountInfo(returns, accountId, nickname) {
  return returns.map(r => ({
    ...r,
    accountId,
    accountNickname: nickname
  }));
}

/**
 * GET /api/returns
 * List all returns for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { offset = 0, limit = 50, status } = req.query;

    const accounts = await MLAccount.find({ userId });
    if (!accounts || accounts.length === 0) {
      return sendSuccess(res, [], '', 200);
    }

    const allReturns = [];
    for (const account of accounts) {
      if (account.isTokenExpired()) continue;
      try {
        const headers = buildHeaders(account.accessToken);
        const params = buildReturnParams({ offset: 0, limit: 100, status }, account.mlUserId);

        const response = await axios.get(`${ML_API_BASE}/claims/search`, {
          headers,
          params,
          timeout: 10000
        });

        const returns = filterReturns(response.data.data);
        allReturns.push(...addAccountInfo(returns, account.id, account.nickname));
      } catch (err) {
        logger.warn(`Failed to fetch returns for account ${account.id}: ${err.message}`);
      }
    }

    const paginatedReturns = allReturns.slice(
      parseInt(offset), 
      parseInt(offset) + parseInt(limit)
    );

    return sendSuccess(res, {
      data: paginatedReturns,
      pagination: {
        total: allReturns.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    return sendError(res, 500, error, 'Failed to fetch returns', 'GET_ALL_RETURNS_ERROR', { userId: req.user.userId });
  }
});

/**
 * GET /api/returns/:accountId
 * List all returns for the account
 */
router.get('/:accountId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const params = buildReturnParams(req.query, mlUserId);

    const response = await axios.get(`${ML_API_BASE}/claims/search`, {
      headers: buildHeaders(accessToken),
      params: { ...params, resource_type: 'order' },
    });

    const returns = filterReturns(response.data.data);

    return sendSuccess(res, {
      returns,
      paging: response.data.paging,
    });
  } catch (error) {
    return sendError(res, error.response?.status || 500, error, '', 'GET_RETURNS_ERROR', { accountId: req.params.accountId });
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

    const response = await axios.get(`${ML_API_BASE}/claims/${claimId}`, {
      headers: buildHeaders(accessToken),
    });

    return sendSuccess(res, response.data);
  } catch (error) {
    return sendError(res, error.response?.status || 500, error, '', 'GET_RETURN_DETAILS_ERROR', { claimId: req.params.claimId });
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

    const response = await axios.get(`${ML_API_BASE}/orders/${orderId}/returns`, {
      headers: buildHeaders(accessToken),
    });

    return sendSuccess(res, response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      return sendSuccess(res, [], 'No returns for this order', 200);
    }
    return sendError(res, error.response?.status || 500, error, '', 'GET_ORDER_RETURNS_ERROR', { orderId: req.params.orderId });
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

    const response = await axios.post(`${ML_API_BASE}/claims/${claimId}/messages`,
      { message: message.trim() },
      { headers: buildHeaders(accessToken) }
    );

    logger.info('Return message sent:', {
      claimId,
      accountId: req.mlAccount.id,
    });

    return sendSuccess(res, response.data, 'Message sent successfully', 201);
  } catch (error) {
    return sendError(res, error.response?.status || 500, error, '', 'SEND_RETURN_MESSAGE_ERROR', { claimId: req.params.claimId });
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

    const claimResponse = await axios.get(`${ML_API_BASE}/claims/${claimId}`, {
      headers: buildHeaders(accessToken),
    });

    const shipmentId = claimResponse.data.return_shipment_id;

    if (!shipmentId) {
      return res.status(404).json({
        success: false,
        error: 'No return shipment found for this claim',
      });
    }

    const labelResponse = await axios.get(`${ML_API_BASE}/shipment_labels`, {
      headers: buildHeaders(accessToken),
      params: {
        shipment_ids: shipmentId,
        response_type: 'pdf',
      },
      responseType: 'arraybuffer',
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="return-label-${claimId}.pdf"`,
    });

    return res.send(labelResponse.data);
  } catch (error) {
    return sendError(res, error.response?.status || 500, error, '', 'GET_SHIPPING_LABEL_ERROR', { claimId: req.params.claimId });
  }
});

/**
 * GET /api/returns/:accountId/stats
 * Get return statistics
 */
router.get('/:accountId/stats/summary', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;

    const response = await axios.get(`${ML_API_BASE}/users/${mlUserId}`, {
      headers: buildHeaders(accessToken),
    });

    const { seller_reputation } = response.data;

    return sendSuccess(res, {
      claims: seller_reputation?.metrics?.claims || {},
      cancellations: seller_reputation?.metrics?.cancellations || {},
      sales: seller_reputation?.metrics?.sales || {},
    });
  } catch (error) {
    return sendError(res, error.response?.status || 500, error, '', 'GET_RETURN_STATS_ERROR', { accountId: req.params.accountId });
  }
});

/**
 * GET /api/returns/:accountId/post-purchase/:claimId
 * Get return details from post-purchase/v2 API
 */
router.get('/:accountId/post-purchase/:claimId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(`${ML_API_BASE}/post-purchase/v2/claims/${claimId}/returns`, {
      headers: buildHeaders(accessToken),
    });

    return sendSuccess(res, response.data);
  } catch (error) {
    return sendError(res, error.response?.status || 500, error, '', 'GET_POST_PURCHASE_RETURN_ERROR', { claimId: req.params.claimId });
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

    const response = await axios.post(`${ML_API_BASE}/post-purchase/v2/claims/${claimId}/returns/review`,
      payload,
      { headers: buildHeaders(accessToken) }
    );

    logger.info('Return review submitted:', {
      claimId,
      action,
      accountId: req.mlAccount.id,
    });

    return sendSuccess(res, response.data, `Return ${action}d successfully`, 201);
  } catch (error) {
    return sendError(res, error.response?.status || 500, error, '', 'SUBMIT_RETURN_REVIEW_ERROR', { claimId: req.params.claimId });
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

    const response = await axios.post(`${ML_API_BASE}/claims/${claimId}/evidences`,
      payload,
      { headers: buildHeaders(accessToken) }
    );

    logger.info('Return evidence uploaded:', {
      claimId,
      evidenceType: evidence_type,
      accountId: req.mlAccount.id,
    });

    return sendSuccess(res, response.data, 'Evidence uploaded successfully', 201);
  } catch (error) {
    return sendError(res, error.response?.status || 500, error, '', 'UPLOAD_RETURN_EVIDENCE_ERROR', { claimId: req.params.claimId });
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

    const response = await axios.get(`${ML_API_BASE}/claims/${claimId}/evidences`, {
      headers: buildHeaders(accessToken),
    });

    return sendSuccess(res, response.data);
  } catch (error) {
    return sendError(res, error.response?.status || 500, error, '', 'GET_RETURN_EVIDENCES_ERROR', { claimId: req.params.claimId });
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

    const response = await axios.get(`${ML_API_BASE}/claims/${claimId}/timeline`, {
      headers: buildHeaders(accessToken),
    });

    return sendSuccess(res, response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      return sendSuccess(res, [], 'No timeline available', 200);
    }
    return sendError(res, error.response?.status || 500, error, '', 'GET_RETURN_TIMELINE_ERROR', { claimId: req.params.claimId });
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

    const response = await axios.post(`${ML_API_BASE}/claims/${claimId}/refund`,
      payload,
      { headers: buildHeaders(accessToken) }
    );

    logger.info('Return refund processed:', {
      claimId,
      amount,
      accountId: req.mlAccount.id,
    });

    return sendSuccess(res, response.data, 'Refund processed successfully', 201);
  } catch (error) {
    return sendError(res, error.response?.status || 500, error, '', 'PROCESS_RETURN_REFUND_ERROR', { claimId: req.params.claimId });
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

    const claimResponse = await axios.get(`${ML_API_BASE}/claims/${claimId}`, {
      headers: buildHeaders(accessToken),
    });

    const returnShipmentId = claimResponse.data.return_shipment_id;

    if (!returnShipmentId) {
      return sendSuccess(res, null, 'No return shipment found', 200);
    }

    const [trackingResponse, historyResponse] = await Promise.all([
      axios.get(`${ML_API_BASE}/shipments/${returnShipmentId}`, {
        headers: buildHeaders(accessToken),
      }),
      axios.get(`${ML_API_BASE}/shipments/${returnShipmentId}/history`, {
        headers: buildHeaders(accessToken),
      }).catch(() => ({ data: null })),
    ]);

    return sendSuccess(res, {
      shipment: trackingResponse.data,
      history: historyResponse.data,
    });
  } catch (error) {
    return sendError(res, error.response?.status || 500, error, '', 'GET_RETURN_TRACKING_ERROR', { claimId: req.params.claimId });
  }
});

module.exports = router;
