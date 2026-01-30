/**
 * Claims Routes
 * Manage claims/complaints from Mercado Livre
 *
 * GET    /api/claims                           - List all claims for user
 * GET    /api/claims/:accountId                - List claims for specific account
 * GET    /api/claims/:accountId/open           - List open claims
 * GET    /api/claims/:accountId/:claimId       - Get claim details
 * POST   /api/claims/:accountId/:claimId/message - Send message in claim
 * POST   /api/claims/:accountId/sync           - Sync claims from ML
 * GET    /api/claims/:accountId/stats          - Get claim statistics
 */

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const Claim = require('../db/models/Claim');
const MLAccount = require('../db/models/MLAccount');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * Helper function to parse multiple status values
 * Converts "open,in_mediation,resolved" to ["open", "in_mediation", "resolved"]
 */
function parseMultipleStatus(statusParam) {
  if (!statusParam) return null;
  
  const statuses = statusParam.split(',').map(s => s.trim()).filter(s => s.length > 0);
  return statuses.length > 1 ? { $in: statuses } : statuses[0];
}

/**
 * GET /api/claims
 * List all claims for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status, type, sort = '-dateCreated' } = req.query;

    const query = { userId: req.user.userId };
    
    // Parse multiple status values (supports "open,in_mediation,resolved")
    if (status) {
      const parsedStatus = parseMultipleStatus(status);
      if (parsedStatus) {
        query.status = parsedStatus;
      }
    }
    
    if (type) query.type = type;

    const claims = await Claim.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Claim.countDocuments(query);

    res.json({
      success: true,
      data: {
        claims: claims.map(c => c.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_CLAIMS_ERROR',
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch claims',
      error: error.message,
    });
  }
});

/**
 * GET /api/claims/:accountId/stats
 * Get claim statistics for an account
 */
router.get('/:accountId/stats', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account exists
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

    const { stats, openCount } = await Claim.getStats(accountId);

    const totalClaims = await Claim.countDocuments({
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: {
        accountId,
        claims: {
          total: totalClaims,
          open: openCount,
        },
        breakdown: stats,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_CLAIM_STATS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get claim statistics',
      error: error.message,
    });
  }
});

/**
 * GET /api/claims/:accountId/open
 * List open claims for specific account
 */
router.get('/:accountId/open', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account belongs to user
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

    const claims = await Claim.findOpen(accountId);

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        claims: claims.map(c => c.getSummary()),
        total: claims.length,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_OPEN_CLAIMS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch open claims',
      error: error.message,
    });
  }
});

/**
 * GET /api/claims/:accountId
  * List claims for specific account
  * Query params:
  *   - limit: number of results (default 20)
  *   - offset: pagination offset (default 0)
  *   - status: claim status filter (comma-separated for multiple: open,in_mediation,resolved)
  *   - type: claim type filter
  *   - date_created.from: RFC 3339 format (2024-01-31T18:03:35.000-04:00)
  *   - date_created.to: RFC 3339 format
  *   - sort: sort field (default -dateCreated)
 */
router.get('/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { 
      limit = 20, 
      offset = 0, 
      status, 
      type, 
      sort = '-dateCreated',
      'date_created.from': dateFrom,
      'date_created.to': dateTo,
    } = req.query;

    // Verify account belongs to user
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

    const query = { accountId, userId: req.user.userId };
    
    // Parse multiple status values (supports "open,in_mediation,resolved")
    if (status) {
      const parsedStatus = parseMultipleStatus(status);
      if (parsedStatus) {
        query.status = parsedStatus;
      }
    }
    
    if (type) query.type = type;

    // Add date range filters
    if (dateFrom || dateTo) {
      query.dateCreated = {};
      if (dateFrom) {
        query.dateCreated.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.dateCreated.$lte = new Date(dateTo);
      }
    }

    const claims = await Claim.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Claim.countDocuments(query);

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        claims: claims.map(c => c.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ACCOUNT_CLAIMS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch claims',
      error: error.message,
    });
  }
});

/**
 * GET /api/claims/:accountId/:claimId
 * Get detailed claim information
 */
router.get('/:accountId/:claimId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, claimId } = req.params;
    const account = req.mlAccount;

    // Try to find in local DB first
    let claim = await Claim.findOne({
      $or: [{ id: claimId }, { mlClaimId: claimId }],
      accountId,
      userId: req.user.userId,
    });

    // Fetch fresh data from ML API
    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const mlClaimId = claim?.mlClaimId || claimId;

    const mlResponse = await axios.get(
      `${ML_API_BASE}/claims/${mlClaimId}`,
      { headers }
    ).catch(err => {
      logger.warn({
        action: 'FETCH_CLAIM_DETAILS_ERROR',
        claimId: mlClaimId,
        error: err.response?.data || err.message,
      });
      return null;
    });

    if (!claim && !mlResponse) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found',
      });
    }

    res.json({
      success: true,
      data: {
        local: claim?.getDetails() || null,
        ml: mlResponse?.data || null,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_CLAIM_ERROR',
      claimId: req.params.claimId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch claim',
      error: error.message,
    });
  }
});

/**
 * POST /api/claims/:accountId/:claimId/message
 * Send message in claim
 */
router.post('/:accountId/:claimId/message', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, claimId } = req.params;
    const { text, role = 'seller' } = req.body;
    const account = req.mlAccount;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required',
      });
    }

    const claim = await Claim.findOne({
      $or: [{ id: claimId }, { mlClaimId: claimId }],
      accountId,
      userId: req.user.userId,
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Send message to ML
    const response = await axios.post(
      `${ML_API_BASE}/claims/${claim.mlClaimId}/messages`,
      {
        message: text.trim(),
        role,
      },
      { headers }
    );

    // Update local claim with new message
    claim.messages.push({
      id: response.data.id || `local_${Date.now()}`,
      from: {
        id: account.mlUserId,
        role: 'seller',
      },
      text: text.trim(),
      dateCreated: new Date(),
    });
    claim.dateLastUpdated = new Date();
    await claim.save();

    logger.info({
      action: 'CLAIM_MESSAGE_SENT',
      claimId: claim.mlClaimId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: claim.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'SEND_CLAIM_MESSAGE_ERROR',
      claimId: req.params.claimId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to send message',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/claims/:accountId/sync
 * Sync claims from Mercado Livre
 */
router.post('/:accountId/sync', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;

    logger.info({
      action: 'CLAIMS_SYNC_STARTED',
      accountId,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get claims
    const claimsResponse = await axios.get(
      `${ML_API_BASE}/claims/search`,
      {
        headers,
        params: {
          seller_id: account.mlUserId,
          status: 'opened,pending,waiting_seller',
        },
      }
    ).catch(err => {
      logger.warn({
        action: 'FETCH_CLAIMS_ERROR',
        accountId,
        error: err.response?.data || err.message,
      });
      return { data: { data: [] } };
    });

    const mlClaims = claimsResponse.data?.data || [];

    // Save claims
    const savedClaims = await saveClaims(accountId, req.user.userId, mlClaims);

    logger.info({
      action: 'CLAIMS_SYNC_COMPLETED',
      accountId,
      userId: req.user.userId,
      claimsCount: savedClaims.length,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Synchronized ${savedClaims.length} claims`,
      data: {
        accountId,
        claimsCount: savedClaims.length,
        claims: savedClaims.map(c => c.getSummary()),
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({
      action: 'CLAIMS_SYNC_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to sync claims',
      error: error.message,
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Save or update claims in database
 */
async function saveClaims(accountId, userId, mlClaims) {
  const savedClaims = [];

  for (const mlClaim of mlClaims) {
    try {
      const claimData = {
        accountId,
        userId,
        mlClaimId: mlClaim.id?.toString(),
        resourceId: mlClaim.resource_id?.toString(),
        resourceType: mlClaim.resource || 'order',
        type: mlClaim.type || 'mediation',
        reason: mlClaim.reason ? {
          id: mlClaim.reason.id,
          description: mlClaim.reason.description,
          subReason: mlClaim.reason.sub_reason || null,
        } : null,
        status: mlClaim.status || 'opened',
        statusDetail: mlClaim.status_detail,
        resolution: mlClaim.resolution,
        buyer: mlClaim.players?.complainant ? {
          id: mlClaim.players.complainant.user_id?.toString(),
          nickname: mlClaim.players.complainant.nickname,
        } : null,
        seller: mlClaim.players?.respondent ? {
          id: mlClaim.players.respondent.user_id?.toString(),
          nickname: mlClaim.players.respondent.nickname,
        } : null,
        orderInfo: mlClaim.order ? {
          orderId: mlClaim.order.id?.toString(),
          itemId: mlClaim.order.item_id,
          title: mlClaim.order.title,
          quantity: mlClaim.order.quantity,
          price: mlClaim.order.unit_price,
          currencyId: mlClaim.order.currency_id,
        } : null,
        amount: {
          claimed: mlClaim.claim_amount || 0,
          refunded: mlClaim.refund_amount || 0,
          currencyId: mlClaim.currency_id || 'BRL',
        },
        messages: (mlClaim.messages || []).map(msg => ({
          id: msg.id?.toString(),
          from: {
            id: msg.author?.user_id?.toString(),
            role: msg.author?.role,
          },
          text: msg.message,
          dateCreated: msg.date_created ? new Date(msg.date_created) : null,
        })),
        dateCreated: mlClaim.date_created ? new Date(mlClaim.date_created) : new Date(),
        dateLastUpdated: mlClaim.last_updated ? new Date(mlClaim.last_updated) : null,
        dateClosed: mlClaim.date_closed ? new Date(mlClaim.date_closed) : null,
        lastSyncedAt: new Date(),
      };

      // Find or create claim
      let claim = await Claim.findOne({
        accountId,
        mlClaimId: claimData.mlClaimId,
      });

      if (claim) {
        Object.assign(claim, claimData);
        await claim.save();
      } else {
        claim = new Claim(claimData);
        await claim.save();
      }

      savedClaims.push(claim);
    } catch (error) {
      logger.error({
        action: 'SAVE_CLAIM_ERROR',
        mlClaimId: mlClaim.id,
        accountId,
        error: error.message,
      });
    }
  }

  return savedClaims;
}

// ============================================
// EXCHANGES (TROCAS) ENDPOINTS
// ============================================

/**
 * GET /api/claims/:accountId/:claimId/exchange
 * Get exchange details for a claim
 */
router.get('/:accountId/:claimId/exchange', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, claimId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get claim details
    const claimRes = await axios.get(
      `${ML_API_BASE}/claims/${claimId}`,
      { headers }
    );

    const claim = claimRes.data;

    // Check if it's an exchange type
    const isExchange = claim.type === 'change' || 
                       claim.reason?.id?.includes('change') ||
                       claim.solution === 'change';

    if (!isExchange) {
      return res.json({
        success: true,
        data: {
          claim_id: claimId,
          is_exchange: false,
          message: 'This claim is not an exchange request',
        },
      });
    }

    // Get exchange shipment info if available
    let exchangeShipment = null;
    if (claim.exchange_shipment_id) {
      try {
        const shipmentRes = await axios.get(
          `${ML_API_BASE}/shipments/${claim.exchange_shipment_id}`,
          { headers }
        );
        exchangeShipment = shipmentRes.data;
      } catch (err) {
        // Shipment may not be available
      }
    }

    logger.info({
      action: 'GET_EXCHANGE_DETAILS',
      accountId,
      claimId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: {
        claim_id: claimId,
        is_exchange: true,
        claim: claim,
        exchange_shipment: exchangeShipment,
        status: claim.status,
        reason: claim.reason,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_EXCHANGE_ERROR',
      accountId: req.params.accountId,
      claimId: req.params.claimId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get exchange details',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/claims/:accountId/:claimId/exchange/accept
 * Accept an exchange request
 */
router.post('/:accountId/:claimId/exchange/accept', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, claimId } = req.params;
    const { shipping_option } = req.body;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const payload = {
      action: 'accept_change',
    };
    if (shipping_option) {
      payload.shipping_option = shipping_option;
    }

    const response = await axios.post(
      `${ML_API_BASE}/claims/${claimId}/actions`,
      payload,
      { headers }
    );

    // Update local claim
    await Claim.findOneAndUpdate(
      { accountId, mlClaimId: claimId },
      { $set: { status: 'exchange_accepted', dateLastUpdated: new Date() } }
    );

    logger.info({
      action: 'ACCEPT_EXCHANGE',
      accountId,
      claimId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Exchange accepted successfully',
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'ACCEPT_EXCHANGE_ERROR',
      accountId: req.params.accountId,
      claimId: req.params.claimId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to accept exchange',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/claims/:accountId/:claimId/exchange/reject
 * Reject an exchange request
 */
router.post('/:accountId/:claimId/exchange/reject', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, claimId } = req.params;
    const { reason } = req.body;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const payload = {
      action: 'reject_change',
    };
    if (reason) {
      payload.reason = reason;
    }

    const response = await axios.post(
      `${ML_API_BASE}/claims/${claimId}/actions`,
      payload,
      { headers }
    );

    // Update local claim
    await Claim.findOneAndUpdate(
      { accountId, mlClaimId: claimId },
      { $set: { status: 'exchange_rejected', dateLastUpdated: new Date() } }
    );

    logger.info({
      action: 'REJECT_EXCHANGE',
      accountId,
      claimId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Exchange rejected',
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'REJECT_EXCHANGE_ERROR',
      accountId: req.params.accountId,
      claimId: req.params.claimId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to reject exchange',
      error: error.response?.data?.message || error.message,
    });
  }
});

// ============================================
// EVIDENCES ENDPOINTS
// ============================================

/**
 * GET /api/claims/:accountId/:claimId/evidences
 * Get all evidences for a claim
 */
router.get('/:accountId/:claimId/evidences', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, claimId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(
      `${ML_API_BASE}/claims/${claimId}/evidences`,
      { headers }
    );

    logger.info({
      action: 'GET_CLAIM_EVIDENCES',
      accountId,
      claimId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'GET_EVIDENCES_ERROR',
      accountId: req.params.accountId,
      claimId: req.params.claimId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get evidences',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/claims/:accountId/:claimId/evidences
 * Upload evidence for a claim
 */
router.post('/:accountId/:claimId/evidences', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, claimId } = req.params;
    const { evidence_type, description, files } = req.body;
    const account = req.mlAccount;

    if (!evidence_type) {
      return res.status(400).json({
        success: false,
        message: 'evidence_type is required',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

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
      { headers }
    );

    logger.info({
      action: 'UPLOAD_EVIDENCE',
      accountId,
      claimId,
      evidenceType: evidence_type,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Evidence uploaded successfully',
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'UPLOAD_EVIDENCE_ERROR',
      accountId: req.params.accountId,
      claimId: req.params.claimId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to upload evidence',
      error: error.response?.data?.message || error.message,
    });
  }
});

// ============================================
// RESOLUTION ENDPOINTS
// ============================================

/**
 * POST /api/claims/:accountId/:claimId/resolve
 * Resolve a claim
 */
router.post('/:accountId/:claimId/resolve', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, claimId } = req.params;
    const { resolution, reason } = req.body;
    const account = req.mlAccount;

    // Valid resolutions: 'refund', 'reship', 'close_without_refund'
    const validResolutions = ['refund', 'reship', 'close_without_refund', 'partial_refund'];
    if (!resolution || !validResolutions.includes(resolution)) {
      return res.status(400).json({
        success: false,
        message: `resolution must be one of: ${validResolutions.join(', ')}`,
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const payload = {
      action: resolution,
    };
    if (reason) {
      payload.reason = reason;
    }

    const response = await axios.post(
      `${ML_API_BASE}/claims/${claimId}/actions`,
      payload,
      { headers }
    );

    // Update local claim
    await Claim.findOneAndUpdate(
      { accountId, mlClaimId: claimId },
      { 
        $set: { 
          status: 'resolved',
          resolution: resolution,
          dateLastUpdated: new Date(),
          dateClosed: new Date(),
        } 
      }
    );

    logger.info({
      action: 'RESOLVE_CLAIM',
      accountId,
      claimId,
      resolution,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Claim resolved successfully',
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'RESOLVE_CLAIM_ERROR',
      accountId: req.params.accountId,
      claimId: req.params.claimId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to resolve claim',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/claims/:accountId/:claimId/available-actions
 * Get available actions for a claim
 */
router.get('/:accountId/:claimId/available-actions', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, claimId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(
      `${ML_API_BASE}/claims/${claimId}/actions`,
      { headers }
    );

    logger.info({
      action: 'GET_AVAILABLE_ACTIONS',
      accountId,
      claimId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'GET_AVAILABLE_ACTIONS_ERROR',
      accountId: req.params.accountId,
      claimId: req.params.claimId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get available actions',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/claims/:accountId/:claimId/timeline
 * Get claim timeline/history
 */
router.get('/:accountId/:claimId/timeline', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, claimId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(
      `${ML_API_BASE}/claims/${claimId}/timeline`,
      { headers }
    );

    logger.info({
      action: 'GET_CLAIM_TIMELINE',
      accountId,
      claimId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    // Timeline may not be available for all claims
    if (error.response?.status === 404) {
      return res.json({
        success: true,
        data: [],
        message: 'No timeline available',
      });
    }

    logger.error({
      action: 'GET_TIMELINE_ERROR',
      accountId: req.params.accountId,
      claimId: req.params.claimId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get timeline',
      error: error.response?.data?.message || error.message,
    });
  }
});

module.exports = router;
