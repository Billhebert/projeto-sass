/**
 * Claims Routes
 * Manage claims/complaints from Mercado Livre
 *
 * GET    /api/claims                                   - List all claims for user
 * GET    /api/claims/:accountId                        - List claims for specific account
 * GET    /api/claims/:accountId/open                   - List open claims
 * GET    /api/claims/:accountId/:claimId               - Get claim details
 * POST   /api/claims/:accountId/:claimId/message       - Send message in claim
 * POST   /api/claims/:accountId/sync                   - Sync claims from ML
 * GET    /api/claims/:accountId/stats                  - Get claim statistics
 * GET    /api/claims/:accountId/:claimId/exchange      - Get exchange details
 * POST   /api/claims/:accountId/:claimId/exchange/accept - Accept exchange
 * POST   /api/claims/:accountId/:claimId/exchange/reject - Reject exchange
 * GET    /api/claims/:accountId/:claimId/evidences     - Get evidences
 * POST   /api/claims/:accountId/:claimId/evidences     - Upload evidence
 * POST   /api/claims/:accountId/:claimId/resolve       - Resolve claim
 * GET    /api/claims/:accountId/:claimId/available-actions - Get actions
 * GET    /api/claims/:accountId/:claimId/timeline      - Get timeline
 */

const express = require("express");
const axios = require("axios");
const logger = require("../logger");
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require("../middleware/auth");
const { validateMLToken } = require("../middleware/ml-token-validation");
const Claim = require("../db/models/Claim");
const MLAccount = require("../db/models/MLAccount");

const router = express.Router();

const ML_API_BASE = "https://api.mercadolibre.com";

// ============================================
// HELPER FUNCTIONS - Core error & response handling
// ============================================

/**
 * Unified error handler for API responses
 */
function handleError(res, statusCode, message, error, context = {}) {
  const logData = {
    action: context.action || 'UNKNOWN_ERROR',
    ...context,
    error: error.response?.data || error.message,
  };

  logger.error(logData);

  return res.status(statusCode).json({
    success: false,
    message,
    error: error.response?.data?.message || error.message,
  });
}

/**
 * Unified success response handler
 */
function sendSuccess(res, data, message = null, statusCode = 200) {
  const response = {
    success: true,
    ...data,
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
}

/**
 * Build MongoDB query for claims with filters
 */
function buildClaimQuery(userId, accountId = null, filters = {}) {
  const query = { userId };
  if (accountId) query.accountId = accountId;
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.dateFrom || filters.dateTo) {
    query.dateCreated = {};
    if (filters.dateFrom) query.dateCreated.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.dateCreated.$lte = new Date(filters.dateTo);
  }
  return query;
}

/**
 * Paginate Claim queries with consistent formatting
 */
async function paginate(query, options = {}) {
  const {
    limit = 100,
    offset = 0,
    sort = '-dateCreated',
  } = options;

  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  const [data, total] = await Promise.all([
    Claim.find(query)
      .sort(sort)
      .limit(limitNum)
      .skip(offsetNum),
    Claim.countDocuments(query),
  ]);

  return {
    data,
    total,
    limit: limitNum,
    offset: offsetNum,
  };
}

/**
 * Fetch account with validation
 */
async function fetchAccount(accountId, userId) {
  const account = await MLAccount.findOne({
    id: accountId,
    userId,
  });

  return account || null;
}

/**
 * Get ML headers for authenticated requests
 */
function getMLHeaders(accessToken) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Make ML API request with error handling
 */
async function makeMLRequest(method, endpoint, data = null, headers = {}, params = {}) {
  try {
    const config = {
      headers,
      params,
    };

    let response;
    switch (method.toLowerCase()) {
      case 'get':
        response = await axios.get(`${ML_API_BASE}${endpoint}`, config);
        break;
      case 'post':
        response = await axios.post(`${ML_API_BASE}${endpoint}`, data, config);
        break;
      case 'put':
        response = await axios.put(`${ML_API_BASE}${endpoint}`, data, config);
        break;
      case 'delete':
        response = await axios.delete(`${ML_API_BASE}${endpoint}`, config);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    return { success: true, data: response.data };
  } catch (error) {
    logger.warn({
      action: 'ML_API_ERROR',
      method,
      endpoint,
      error: error.response?.data || error.message,
    });

    return {
      success: false,
      error,
      data: error.response?.data,
    };
  }
}

/**
 * Parse multiple status values (supports "open,in_mediation,resolved")
 */
function parseMultipleStatus(statusParam) {
  if (!statusParam) return null;

  const statuses = statusParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return statuses.length > 1 ? { $in: statuses } : statuses[0];
}

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
        resourceType: mlClaim.resource || "order",
        type: mlClaim.type || "mediation",
        reason: mlClaim.reason
          ? {
              id: mlClaim.reason.id,
              description: mlClaim.reason.description,
              subReason: mlClaim.reason.sub_reason || null,
            }
          : null,
        status: mlClaim.status || "opened",
        statusDetail: mlClaim.status_detail,
        resolution: mlClaim.resolution,
        buyer: mlClaim.players?.complainant
          ? {
              id: mlClaim.players.complainant.user_id?.toString(),
              nickname: mlClaim.players.complainant.nickname,
            }
          : null,
        seller: mlClaim.players?.respondent
          ? {
              id: mlClaim.players.respondent.user_id?.toString(),
              nickname: mlClaim.players.respondent.nickname,
            }
          : null,
        orderInfo: mlClaim.order
          ? {
              orderId: mlClaim.order.id?.toString(),
              itemId: mlClaim.order.item_id,
              title: mlClaim.order.title,
              quantity: mlClaim.order.quantity,
              price: mlClaim.order.unit_price,
              currencyId: mlClaim.order.currency_id,
            }
          : null,
        amount: {
          claimed: mlClaim.claim_amount || 0,
          refunded: mlClaim.refund_amount || 0,
          currencyId: mlClaim.currency_id || "BRL",
        },
        messages: (mlClaim.messages || []).map((msg) => ({
          id: msg.id?.toString(),
          from: {
            id: msg.author?.user_id?.toString(),
            role: msg.author?.role,
          },
          text: msg.message,
          dateCreated: msg.date_created ? new Date(msg.date_created) : null,
        })),
        dateCreated: mlClaim.date_created
          ? new Date(mlClaim.date_created)
          : new Date(),
        dateLastUpdated: mlClaim.last_updated
          ? new Date(mlClaim.last_updated)
          : null,
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
// ROUTES - User Claims (Local Database)
// ============================================

/**
 * GET /api/claims
 * List all claims for the authenticated user
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      limit = 100,
      offset = 0,
      status,
      type,
      sort = "-dateCreated",
    } = req.query;

    const statusFilter = parseMultipleStatus(status);
    const query = buildClaimQuery(req.user.userId, null, {
      status: statusFilter,
      type,
    });

    const result = await paginate(query, { limit, offset, sort });

    sendSuccess(res, {
      data: {
        claims: result.data.map((c) => c.getSummary()),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch claims', error, {
      action: 'GET_CLAIMS_ERROR',
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/claims/:accountId
 * List claims for specific account
 */
router.get("/:accountId", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const {
      all,
      limit: queryLimit,
      offset = 0,
      status,
      type,
      sort = "-dateCreated",
      "date_created.from": dateFrom,
      "date_created.to": dateTo,
    } = req.query;

    // If all=true, fetch everything. Otherwise use limit (default 100)
    const limit = all === "true" ? 999999 : queryLimit || 100;

    // Verify account belongs to user
    const account = await fetchAccount(accountId, req.user.userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const statusFilter = parseMultipleStatus(status);
    const query = buildClaimQuery(req.user.userId, accountId, {
      status: statusFilter,
      type,
      dateFrom,
      dateTo,
    });

    const result = await paginate(query, { limit, offset, sort });

    sendSuccess(res, {
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        claims: result.data.map((c) => c.getSummary()),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch claims', error, {
      action: 'GET_ACCOUNT_CLAIMS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/claims/:accountId/open
 * List open claims for specific account
 */
router.get("/:accountId/open", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account belongs to user
    const account = await fetchAccount(accountId, req.user.userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const claims = await Claim.findOpen(accountId);

    sendSuccess(res, {
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        claims: claims.map((c) => c.getSummary()),
        total: claims.length,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch open claims', error, {
      action: 'GET_OPEN_CLAIMS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/claims/:accountId/stats
 * Get claim statistics for an account
 */
router.get("/:accountId/stats", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account exists
    const account = await fetchAccount(accountId, req.user.userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const { stats, openCount } = await Claim.getStats(accountId);

    const totalClaims = await Claim.countDocuments({
      accountId,
      userId: req.user.userId,
    });

    sendSuccess(res, {
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
    handleError(res, 500, 'Failed to get claim statistics', error, {
      action: 'GET_CLAIM_STATS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/claims/:accountId/:claimId
 * Get detailed claim information
 */
router.get(
  "/:accountId/:claimId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
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
      const headers = getMLHeaders(account.accessToken);
      const mlClaimId = claim?.mlClaimId || claimId;

      const { success, data: mlData } = await makeMLRequest(
        'get',
        `/claims/${mlClaimId}`,
        null,
        headers
      );

      if (!claim && !success) {
        return res.status(404).json({
          success: false,
          message: "Claim not found",
        });
      }

      sendSuccess(res, {
        data: {
          local: claim?.getDetails() || null,
          ml: mlData || null,
        },
      });
    } catch (error) {
      handleError(res, 500, 'Failed to fetch claim', error, {
        action: 'GET_CLAIM_ERROR',
        claimId: req.params.claimId,
        userId: req.user.userId,
      });
    }
  },
);

/**
 * POST /api/claims/:accountId/:claimId/message
 * Send message in claim
 */
router.post(
  "/:accountId/:claimId/message",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, claimId } = req.params;
      const { text, role = "seller" } = req.body;
      const account = req.mlAccount;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Message text is required",
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
          message: "Claim not found",
        });
      }

      const headers = getMLHeaders(account.accessToken);

      // Send message to ML
      const response = await axios.post(
        `${ML_API_BASE}/claims/${claim.mlClaimId}/messages`,
        {
          message: text.trim(),
          role,
        },
        { headers },
      );

      // Update local claim with new message
      claim.messages.push({
        id: response.data.id || `local_${Date.now()}`,
        from: {
          id: account.mlUserId,
          role: "seller",
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

      sendSuccess(res, {
        data: claim.getDetails(),
        message: 'Message sent successfully',
      });
    } catch (error) {
      handleError(res, error.response?.status || 500, 'Failed to send message', error, {
        action: 'SEND_CLAIM_MESSAGE_ERROR',
        claimId: req.params.claimId,
        userId: req.user.userId,
      });
    }
  },
);

/**
 * POST /api/claims/:accountId/sync
 * Sync claims from Mercado Livre
 */
router.post(
  "/:accountId/sync",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { all = false } = req.body;
      const account = req.mlAccount;

      logger.info({
        action: 'CLAIMS_SYNC_STARTED',
        accountId,
        userId: req.user.userId,
        all,
        timestamp: new Date().toISOString(),
      });

      const headers = getMLHeaders(account.accessToken);

      // Get claims with pagination support
      let mlClaims = [];
      let offset = 0;
      const limit = 50;

      if (all) {
        // Unlimited mode with pagination
        logger.info({
          action: 'FETCH_ALL_CLAIMS_START',
          accountId,
          timestamp: new Date().toISOString(),
        });

        while (true) {
          const { success, data } = await makeMLRequest(
            'get',
            '/claims/search',
            null,
            headers,
            {
              seller_id: account.mlUserId,
              status: "opened,pending,waiting_seller",
              limit,
              offset,
            }
          );

          const claims = data?.data || [];
          if (claims.length === 0) break;

          mlClaims.push(...claims);
          offset += limit;

          logger.info({
            action: 'FETCH_CLAIMS_BATCH',
            accountId,
            batchSize: claims.length,
            totalFetched: mlClaims.length,
            offset,
          });

          // Check if we got all claims
          const total = data?.paging?.total || 0;
          if (offset >= total) break;
        }

        logger.info({
          action: 'FETCH_ALL_CLAIMS_COMPLETE',
          accountId,
          totalClaims: mlClaims.length,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Normal mode - single request
        const { success, data } = await makeMLRequest(
          'get',
          '/claims/search',
          null,
          headers,
          {
            seller_id: account.mlUserId,
            status: "opened,pending,waiting_seller",
          }
        );

        mlClaims = data?.data || [];
      }

      // Save claims
      const savedClaims = await saveClaims(
        accountId,
        req.user.userId,
        mlClaims,
      );

      logger.info({
        action: 'CLAIMS_SYNC_COMPLETED',
        accountId,
        userId: req.user.userId,
        claimsCount: savedClaims.length,
        timestamp: new Date().toISOString(),
      });

      sendSuccess(res, {
        data: {
          accountId,
          claimsCount: savedClaims.length,
          claims: savedClaims.map((c) => c.getSummary()),
          syncedAt: new Date().toISOString(),
        },
        message: `Synchronized ${savedClaims.length} claims`,
      });
    } catch (error) {
      handleError(res, 500, 'Failed to sync claims', error, {
        action: 'CLAIMS_SYNC_ERROR',
        accountId: req.params.accountId,
        userId: req.user.userId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// ============================================
// ROUTES - Exchanges (Trocas)
// ============================================

/**
 * GET /api/claims/:accountId/:claimId/exchange
 * Get exchange details for a claim
 */
router.get(
  "/:accountId/:claimId/exchange",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, claimId } = req.params;
      const account = req.mlAccount;

      const headers = getMLHeaders(account.accessToken);

      // Get claim details
      const { success, data: claim } = await makeMLRequest(
        'get',
        `/claims/${claimId}`,
        null,
        headers
      );

      if (!success) {
        return handleError(res, 500, 'Failed to get exchange details', new Error('Claim not found'), {
          action: 'GET_EXCHANGE_ERROR',
          accountId,
          claimId,
        });
      }

      // Check if it's an exchange type
      const isExchange =
        claim.type === "change" ||
        claim.reason?.id?.includes("change") ||
        claim.solution === "change";

      if (!isExchange) {
        return sendSuccess(res, {
          data: {
            claim_id: claimId,
            is_exchange: false,
            message: "This claim is not an exchange request",
          },
        });
      }

      // Get exchange shipment info if available
      let exchangeShipment = null;
      if (claim.exchange_shipment_id) {
        const { success: shipmentSuccess, data: shipmentData } = await makeMLRequest(
          'get',
          `/shipments/${claim.exchange_shipment_id}`,
          null,
          headers
        );
        if (shipmentSuccess) {
          exchangeShipment = shipmentData;
        }
      }

      logger.info({
        action: 'GET_EXCHANGE_DETAILS',
        accountId,
        claimId,
        userId: req.user.userId,
      });

      sendSuccess(res, {
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
      handleError(res, 500, 'Failed to get exchange details', error, {
        action: 'GET_EXCHANGE_ERROR',
        accountId: req.params.accountId,
        claimId: req.params.claimId,
        userId: req.user.userId,
      });
    }
  },
);

/**
 * POST /api/claims/:accountId/:claimId/exchange/accept
 * Accept an exchange request
 */
router.post(
  "/:accountId/:claimId/exchange/accept",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, claimId } = req.params;
      const { shipping_option } = req.body;
      const account = req.mlAccount;

      const headers = getMLHeaders(account.accessToken);

      const payload = {
        action: "accept_change",
      };
      if (shipping_option) {
        payload.shipping_option = shipping_option;
      }

      const { success, data, error } = await makeMLRequest(
        'post',
        `/claims/${claimId}/actions`,
        payload,
        headers
      );

      if (!success) {
        return handleError(res, error.response?.status || 500, 'Failed to accept exchange', error, {
          action: 'ACCEPT_EXCHANGE_ERROR',
          accountId,
          claimId,
          userId: req.user.userId,
        });
      }

      // Update local claim
      await Claim.findOneAndUpdate(
        { accountId, mlClaimId: claimId },
        { $set: { status: "exchange_accepted", dateLastUpdated: new Date() } },
      );

      logger.info({
        action: 'ACCEPT_EXCHANGE',
        accountId,
        claimId,
        userId: req.user.userId,
      });

      sendSuccess(res, {
        data,
        message: 'Exchange accepted successfully',
      });
    } catch (error) {
      handleError(res, 500, 'Failed to accept exchange', error, {
        action: 'ACCEPT_EXCHANGE_ERROR',
        accountId: req.params.accountId,
        claimId: req.params.claimId,
        userId: req.user.userId,
      });
    }
  },
);

/**
 * POST /api/claims/:accountId/:claimId/exchange/reject
 * Reject an exchange request
 */
router.post(
  "/:accountId/:claimId/exchange/reject",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, claimId } = req.params;
      const { reason } = req.body;
      const account = req.mlAccount;

      const headers = getMLHeaders(account.accessToken);

      const payload = {
        action: "reject_change",
      };
      if (reason) {
        payload.reason = reason;
      }

      const { success, data, error } = await makeMLRequest(
        'post',
        `/claims/${claimId}/actions`,
        payload,
        headers
      );

      if (!success) {
        return handleError(res, error.response?.status || 500, 'Failed to reject exchange', error, {
          action: 'REJECT_EXCHANGE_ERROR',
          accountId,
          claimId,
          userId: req.user.userId,
        });
      }

      // Update local claim
      await Claim.findOneAndUpdate(
        { accountId, mlClaimId: claimId },
        { $set: { status: "exchange_rejected", dateLastUpdated: new Date() } },
      );

      logger.info({
        action: 'REJECT_EXCHANGE',
        accountId,
        claimId,
        userId: req.user.userId,
      });

      sendSuccess(res, { data, message: 'Exchange rejected' });
    } catch (error) {
      handleError(res, 500, 'Failed to reject exchange', error, {
        action: 'REJECT_EXCHANGE_ERROR',
        accountId: req.params.accountId,
        claimId: req.params.claimId,
        userId: req.user.userId,
      });
    }
  },
);

// ============================================
// ROUTES - Evidences
// ============================================

/**
 * GET /api/claims/:accountId/:claimId/evidences
 * Get all evidences for a claim
 */
router.get(
  "/:accountId/:claimId/evidences",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, claimId } = req.params;
      const account = req.mlAccount;

      const headers = getMLHeaders(account.accessToken);

      const { success, data, error } = await makeMLRequest(
        'get',
        `/claims/${claimId}/evidences`,
        null,
        headers
      );

      if (!success) {
        return handleError(res, error.response?.status || 500, 'Failed to get evidences', error, {
          action: 'GET_EVIDENCES_ERROR',
          accountId,
          claimId,
        });
      }

      logger.info({
        action: 'GET_CLAIM_EVIDENCES',
        accountId,
        claimId,
        userId: req.user.userId,
      });

      sendSuccess(res, { data });
    } catch (error) {
      handleError(res, 500, 'Failed to get evidences', error, {
        action: 'GET_EVIDENCES_ERROR',
        accountId: req.params.accountId,
        claimId: req.params.claimId,
        userId: req.user.userId,
      });
    }
  },
);

/**
 * POST /api/claims/:accountId/:claimId/evidences
 * Upload evidence for a claim
 */
router.post(
  "/:accountId/:claimId/evidences",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, claimId } = req.params;
      const { evidence_type, description, files } = req.body;
      const account = req.mlAccount;

      if (!evidence_type) {
        return res.status(400).json({
          success: false,
          message: "evidence_type is required",
        });
      }

      const headers = getMLHeaders(account.accessToken);

      const payload = {
        evidence_type,
        description: description || "",
      };

      if (files && Array.isArray(files)) {
        payload.files = files;
      }

      const { success, data, error } = await makeMLRequest(
        'post',
        `/claims/${claimId}/evidences`,
        payload,
        headers
      );

      if (!success) {
        return handleError(res, error.response?.status || 500, 'Failed to upload evidence', error, {
          action: 'UPLOAD_EVIDENCE_ERROR',
          accountId,
          claimId,
          userId: req.user.userId,
        });
      }

      logger.info({
        action: 'UPLOAD_EVIDENCE',
        accountId,
        claimId,
        evidenceType: evidence_type,
        userId: req.user.userId,
      });

      sendSuccess(res, {
        data,
        message: 'Evidence uploaded successfully',
      });
    } catch (error) {
      handleError(res, 500, 'Failed to upload evidence', error, {
        action: 'UPLOAD_EVIDENCE_ERROR',
        accountId: req.params.accountId,
        claimId: req.params.claimId,
        userId: req.user.userId,
      });
    }
  },
);

// ============================================
// ROUTES - Resolution & Actions
// ============================================

/**
 * POST /api/claims/:accountId/:claimId/resolve
 * Resolve a claim
 */
router.post(
  "/:accountId/:claimId/resolve",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, claimId } = req.params;
      const { resolution, reason } = req.body;
      const account = req.mlAccount;

      // Valid resolutions: 'refund', 'reship', 'close_without_refund'
      const validResolutions = [
        "refund",
        "reship",
        "close_without_refund",
        "partial_refund",
      ];
      if (!resolution || !validResolutions.includes(resolution)) {
        return res.status(400).json({
          success: false,
          message: `resolution must be one of: ${validResolutions.join(", ")}`,
        });
      }

      const headers = getMLHeaders(account.accessToken);

      const payload = {
        action: resolution,
      };
      if (reason) {
        payload.reason = reason;
      }

      const { success, data, error } = await makeMLRequest(
        'post',
        `/claims/${claimId}/actions`,
        payload,
        headers
      );

      if (!success) {
        return handleError(res, error.response?.status || 500, 'Failed to resolve claim', error, {
          action: 'RESOLVE_CLAIM_ERROR',
          accountId,
          claimId,
          userId: req.user.userId,
        });
      }

      // Update local claim
      await Claim.findOneAndUpdate(
        { accountId, mlClaimId: claimId },
        {
          $set: {
            status: "resolved",
            resolution: resolution,
            dateLastUpdated: new Date(),
            dateClosed: new Date(),
          },
        },
      );

      logger.info({
        action: 'RESOLVE_CLAIM',
        accountId,
        claimId,
        resolution,
        userId: req.user.userId,
      });

      sendSuccess(res, {
        data,
        message: 'Claim resolved successfully',
      });
    } catch (error) {
      handleError(res, 500, 'Failed to resolve claim', error, {
        action: 'RESOLVE_CLAIM_ERROR',
        accountId: req.params.accountId,
        claimId: req.params.claimId,
        userId: req.user.userId,
      });
    }
  },
);

/**
 * GET /api/claims/:accountId/:claimId/available-actions
 * Get available actions for a claim
 */
router.get(
  "/:accountId/:claimId/available-actions",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, claimId } = req.params;
      const account = req.mlAccount;

      const headers = getMLHeaders(account.accessToken);

      const { success, data, error } = await makeMLRequest(
        'get',
        `/claims/${claimId}/actions`,
        null,
        headers
      );

      if (!success) {
        return handleError(res, error.response?.status || 500, 'Failed to get available actions', error, {
          action: 'GET_AVAILABLE_ACTIONS_ERROR',
          accountId,
          claimId,
        });
      }

      logger.info({
        action: 'GET_AVAILABLE_ACTIONS',
        accountId,
        claimId,
        userId: req.user.userId,
      });

      sendSuccess(res, { data });
    } catch (error) {
      handleError(res, 500, 'Failed to get available actions', error, {
        action: 'GET_AVAILABLE_ACTIONS_ERROR',
        accountId: req.params.accountId,
        claimId: req.params.claimId,
        userId: req.user.userId,
      });
    }
  },
);

/**
 * GET /api/claims/:accountId/:claimId/timeline
 * Get claim timeline/history
 */
router.get(
  "/:accountId/:claimId/timeline",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, claimId } = req.params;
      const account = req.mlAccount;

      const headers = getMLHeaders(account.accessToken);

      const { success, data, error } = await makeMLRequest(
        'get',
        `/claims/${claimId}/timeline`,
        null,
        headers
      );

      // Timeline may not be available for all claims
      if (!success && error.response?.status === 404) {
        return sendSuccess(res, {
          data: [],
          message: 'No timeline available',
        });
      }

      if (!success) {
        return handleError(res, error.response?.status || 500, 'Failed to get timeline', error, {
          action: 'GET_TIMELINE_ERROR',
          accountId,
          claimId,
        });
      }

      logger.info({
        action: 'GET_CLAIM_TIMELINE',
        accountId,
        claimId,
        userId: req.user.userId,
      });

      sendSuccess(res, { data });
    } catch (error) {
      handleError(res, 500, 'Failed to get timeline', error, {
        action: 'GET_TIMELINE_ERROR',
        accountId: req.params.accountId,
        claimId: req.params.claimId,
        userId: req.user.userId,
      });
    }
  },
);

module.exports = router;
