/**
 * Shipments Routes
 * Manage shipments/deliveries from Mercado Livre
 *
 * GET    /api/shipments                          - List all shipments for user
 * GET    /api/shipments/:accountId               - List shipments for specific account
 * GET    /api/shipments/:accountId/pending       - List pending shipments
 * GET    /api/shipments/:accountId/:shipmentId   - Get shipment details
 * GET    /api/shipments/:accountId/:shipmentId/tracking - Get tracking info
 * GET    /api/shipments/:accountId/:shipmentId/label - Get shipping label
 * POST   /api/shipments/:accountId/sync          - Sync shipments from ML
 * PUT    /api/shipments/:accountId/:shipmentId   - Update shipment status
 * GET    /api/shipments/:accountId/stats         - Get shipment statistics
 */

const express = require("express");
const logger = require("../logger");
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require("../middleware/auth");
const { validateMLToken } = require("../middleware/ml-token-validation");
const Shipment = require("../db/models/Shipment");
const Order = require("../db/models/Order");
const MLAccount = require("../db/models/MLAccount");

const router = express.Router();

// ============================================
// UNIFIED HELPER FUNCTIONS (CORE)
// ============================================

/**
 * Send success response with consistent format
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default 200)
 */
function sendSuccess(res, data, message = null, statusCode = 200) {
  const response = { success: true };
  if (message) response.message = message;
  
  if (data !== null && data !== undefined) {
    Object.assign(response, data);
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Send error response with consistent format
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Error} error - Error object
 * @param {string} action - Action context for logging
 * @param {Object} context - Additional context for logging
 */
function handleError(res, statusCode, message, error, action, context = {}) {
  logger.error({
    action,
    error: error.message || error,
    ...context,
  });

  return res.status(statusCode).json({
    success: false,
    message,
    error: error.message || error,
  });
}

/**
 * Parse multiple status values separated by comma
 * @param {string} statusParam - Comma-separated status values
 * @returns {string|Object|null} Parsed status filter
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
 * Verify account belongs to user
 * @param {string} accountId - Account ID to verify
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Account object or null if not found
 */
async function verifyAccount(accountId, userId) {
  return await MLAccount.findOne({
    id: accountId,
    userId,
  });
}

/**
 * Find shipment by ID (supports both internal and ML IDs)
 * @param {string} shipmentId - Shipment ID
 * @param {string} accountId - Account ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Shipment object or null
 */
async function findShipment(shipmentId, accountId, userId) {
  return await Shipment.findOne({
    $or: [{ id: shipmentId }, { mlShipmentId: shipmentId }],
    accountId,
    userId,
  });
}

/**
 * Build shipment query with filters
 * @param {Object} params - Query parameters
 * @returns {Object} MongoDB query object
 */
function buildShipmentQuery(params) {
  const query = {};
  
  if (params.accountId) query.accountId = params.accountId;
  if (params.userId) query.userId = params.userId;
  
  if (params.status) {
    const parsedStatus = parseMultipleStatus(params.status);
    if (parsedStatus) query.status = parsedStatus;
  }
  
  if (params.dateFrom || params.dateTo) {
    query.dateCreated = {};
    if (params.dateFrom) {
      query.dateCreated.$gte = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      query.dateCreated.$lte = new Date(params.dateTo);
    }
  }
  
  return query;
}

/**
 * Calculate shipment statistics for account
 * @param {string} accountId - Account ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Statistics object
 */
async function calculateShipmentStats(accountId, userId) {
  const baseQuery = { accountId, userId };
  const stats = await Shipment.getStats(accountId);
  
  const totalShipments = await Shipment.countDocuments(baseQuery);
  const pendingShipments = await Shipment.countDocuments({
    ...baseQuery,
    status: { $in: ["pending", "handling", "ready_to_ship"] },
  });
  const shippedShipments = await Shipment.countDocuments({
    ...baseQuery,
    status: { $in: ["shipped", "in_transit"] },
  });
  const deliveredShipments = await Shipment.countDocuments({
    ...baseQuery,
    status: "delivered",
  });
  
  return {
    accountId,
    shipments: {
      total: totalShipments,
      pending: pendingShipments,
      shipped: shippedShipments,
      delivered: deliveredShipments,
    },
    statusBreakdown: stats,
  };
}

/**
 * Fetch shipment tracking information
 * @param {string} accountId - Account ID
 * @param {Object} shipment - Shipment object
 * @returns {Promise<Object|null>} Tracking response or null
 */
async function fetchTracking(accountId, shipment) {
  try {
    return await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.shipments.getShipmentHistory(shipment.mlShipmentId);
    });
  } catch (error) {
    logger.warn({
      action: "FETCH_TRACKING_ERROR",
      shipmentId: shipment.mlShipmentId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Fetch shipping label
 * @param {string} accountId - Account ID
 * @param {Object} shipment - Shipment object
 * @param {string} format - Label format (pdf, zpl, etc.)
 * @returns {Promise<Object|null>} Label response or null
 */
async function fetchLabel(accountId, shipment, format) {
  try {
    return await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.shipments.getShipmentLabels({
        shipment_ids: shipment.mlShipmentId,
        response_type: format,
      });
    });
  } catch (error) {
    logger.error({
      action: "FETCH_LABEL_ERROR",
      shipmentId: shipment.mlShipmentId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Fetch shipment returns information
 * @param {string} accountId - Account ID
 * @param {Object} shipment - Shipment object
 * @returns {Promise<Object|null>} Returns response or null
 */
async function fetchReturns(accountId, shipment) {
  try {
    return await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.shipments.getShipmentReturns(shipment.mlShipmentId);
    });
  } catch (error) {
    logger.warn({
      action: "FETCH_RETURNS_ERROR",
      shipmentId: shipment.mlShipmentId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Get orders with shipments in batches
 * @param {string} accountId - Account ID
 * @param {string} userId - User ID
 * @param {boolean} fetchAll - Fetch all or limit to 50
 * @returns {Promise<Array>} Array of shipment IDs
 */
async function getShipmentIdsFromOrders(accountId, userId, fetchAll = false) {
  const query = {
    accountId,
    userId,
    "shipping.id": { $exists: true, $ne: null },
  };

  const orders = fetchAll
    ? await Order.find(query)
    : await Order.find(query).limit(50);

  return orders.map((o) => o.shipping?.id).filter((id) => id);
}

/**
 * Fetch shipments in batches from SDK
 * @param {string} accountId - Account ID
 * @param {Array} shipmentIds - Array of shipment IDs
 * @param {boolean} fetchAll - Fetch all in batches or all at once
 * @returns {Promise<Array>} Array of shipment objects
 */
async function fetchShipmentsInBatches(accountId, shipmentIds, fetchAll = false) {
  const mlShipments = [];

  if (fetchAll && shipmentIds.length > 20) {
    // Process in batches for unlimited mode
    for (let i = 0; i < shipmentIds.length; i += 20) {
      const batch = shipmentIds.slice(i, i + 20);
      const batchShipments = await Promise.all(
        batch.map((id) =>
          sdkManager.getShipment(accountId, id).catch((error) => {
            logger.warn({
              action: "FETCH_SHIPMENT_DETAILS_ERROR",
              shipmentId: id,
              error: error.message,
            });
            return null;
          }),
        ),
      );
      mlShipments.push(...batchShipments.filter((s) => s !== null));
    }
  } else {
    // Normal mode - fetch all at once
    const shipmentsData = await Promise.all(
      shipmentIds.map((id) =>
        sdkManager.getShipment(accountId, id).catch((error) => {
          logger.warn({
            action: "FETCH_SHIPMENT_DETAILS_ERROR",
            shipmentId: id,
            error: error.message,
          });
          return null;
        }),
      ),
    );
    mlShipments.push(...shipmentsData.filter((s) => s !== null));
  }

  return mlShipments;
}

/**
 * Save or update shipments in database
 */
async function saveShipments(accountId, userId, mlShipments) {
  const savedShipments = [];

  for (const mlShipment of mlShipments) {
    try {
      const shipmentData = {
        accountId,
        userId,
        mlShipmentId: mlShipment.id.toString(),
        orderId: mlShipment.order_id?.toString(),
        status: mlShipment.status,
        substatus: mlShipment.substatus,
        mode: mlShipment.mode,
        logisticType: mlShipment.logistic_type,
        carrier: mlShipment.tracking_method
          ? {
              name: mlShipment.tracking_method,
            }
          : null,
        trackingNumber: mlShipment.tracking_number,
        trackingMethod: mlShipment.tracking_method,
        shippingOption: mlShipment.shipping_option
          ? {
              id: mlShipment.shipping_option.id?.toString(),
              name: mlShipment.shipping_option.name,
              cost: mlShipment.shipping_option.cost,
              currencyId: mlShipment.shipping_option.currency_id,
              listCost: mlShipment.shipping_option.list_cost,
            }
          : null,
        receiverAddress: mlShipment.receiver_address
          ? {
              id: mlShipment.receiver_address.id?.toString(),
              addressLine: mlShipment.receiver_address.address_line,
              streetName: mlShipment.receiver_address.street_name,
              streetNumber: mlShipment.receiver_address.street_number,
              comment: mlShipment.receiver_address.comment,
              zipCode: mlShipment.receiver_address.zip_code,
              city: mlShipment.receiver_address.city,
              state: mlShipment.receiver_address.state,
              country: mlShipment.receiver_address.country,
              neighborhood: mlShipment.receiver_address.neighborhood,
              latitude: mlShipment.receiver_address.latitude,
              longitude: mlShipment.receiver_address.longitude,
              receiverName: mlShipment.receiver_address.receiver_name,
              receiverPhone: mlShipment.receiver_address.receiver_phone,
            }
          : null,
        senderAddress: mlShipment.sender_address || null,
        dimensions: mlShipment.dimensions || null,
        cost: mlShipment.cost || 0,
        baseCost: mlShipment.base_cost || 0,
        dateCreated: new Date(mlShipment.date_created),
        dateFirstPrinted: mlShipment.date_first_printed
          ? new Date(mlShipment.date_first_printed)
          : null,
        dateHandling: mlShipment.date_handling
          ? new Date(mlShipment.date_handling)
          : null,
        dateShipped: mlShipment.date_shipped
          ? new Date(mlShipment.date_shipped)
          : null,
        dateDelivered: mlShipment.date_delivered
          ? new Date(mlShipment.date_delivered)
          : null,
        tags: mlShipment.tags || [],
        lastSyncedAt: new Date(),
      };

      let shipment = await Shipment.findOne({
        accountId,
        mlShipmentId: mlShipment.id.toString(),
      });

      if (shipment) {
        Object.assign(shipment, shipmentData);
        await shipment.save();
      } else {
        shipment = new Shipment(shipmentData);
        await shipment.save();
      }

      savedShipments.push(shipment);
    } catch (error) {
      logger.error({
        action: "SAVE_SHIPMENT_ERROR",
        mlShipmentId: mlShipment.id,
        accountId,
        error: error.message,
      });
    }
  }

  return savedShipments;
}

// ============================================
// PUBLIC SHIPMENT ENDPOINTS
// ============================================

/**
 * GET /api/shipments
 * List all shipments for the authenticated user
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      limit = 100,
      offset = 0,
      status,
      sort = "-dateCreated",
    } = req.query;

    const query = buildShipmentQuery({
      userId: req.user.userId,
      status,
    });

    const shipments = await Shipment.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Shipment.countDocuments(query);

    return sendSuccess(res, {
      shipments: shipments.map((s) => s.getSummary()),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    return handleError(
      res,
      500,
      "Failed to fetch shipments",
      error,
      "GET_SHIPMENTS_ERROR",
      { userId: req.user.userId }
    );
  }
});

// ============================================
// ACCOUNT-SPECIFIC SHIPMENT ENDPOINTS
// ============================================

/**
 * GET /api/shipments/:accountId
 * List shipments for specific account
 */
router.get("/:accountId", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const {
      all,
      limit: queryLimit,
      offset = 0,
      status,
      sort = "-dateCreated",
      "date_created.from": dateFrom,
      "date_created.to": dateTo,
    } = req.query;

    const limit = all === "true" ? 999999 : queryLimit || 100;

    const account = await verifyAccount(accountId, req.user.userId);
    if (!account) {
      return sendSuccess(res, null, "Account not found", 404);
    }

    const query = buildShipmentQuery({
      accountId,
      userId: req.user.userId,
      status,
      dateFrom,
      dateTo,
    });

    const shipments = await Shipment.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Shipment.countDocuments(query);

    return sendSuccess(res, {
      account: {
        id: account.id,
        nickname: account.nickname,
      },
      shipments: shipments.map((s) => s.getSummary()),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    return handleError(
      res,
      500,
      "Failed to fetch shipments",
      error,
      "GET_ACCOUNT_SHIPMENTS_ERROR",
      { accountId: req.params.accountId, userId: req.user.userId }
    );
  }
});

/**
 * GET /api/shipments/:accountId/pending
 * List pending shipments for specific account
 */
router.get("/:accountId/pending", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await verifyAccount(accountId, req.user.userId);
    if (!account) {
      return sendSuccess(res, null, "Account not found", 404);
    }

    const shipments = await Shipment.findPending(accountId);

    return sendSuccess(res, {
      account: {
        id: account.id,
        nickname: account.nickname,
      },
      shipments: shipments.map((s) => s.getSummary()),
      total: shipments.length,
    });
  } catch (error) {
    return handleError(
      res,
      500,
      "Failed to fetch pending shipments",
      error,
      "GET_PENDING_SHIPMENTS_ERROR",
      { accountId: req.params.accountId, userId: req.user.userId }
    );
  }
});

/**
 * GET /api/shipments/:accountId/stats
 * Get shipment statistics for an account
 */
router.get("/:accountId/stats", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await verifyAccount(accountId, req.user.userId);
    if (!account) {
      return sendSuccess(res, null, "Account not found", 404);
    }

    const stats = await calculateShipmentStats(accountId, req.user.userId);

    return sendSuccess(res, { data: stats });
  } catch (error) {
    logger.warn({
      action: "GET_SHIPMENT_STATS_ERROR",
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    // Return fallback stats
    return sendSuccess(res, {
      data: {
        accountId: req.params.accountId,
        shipments: { total: 0, pending: 0, shipped: 0, delivered: 0 },
        statusBreakdown: {},
      },
    });
  }
});

/**
 * GET /api/shipments/:accountId/:shipmentId
 * Get detailed shipment information
 */
router.get("/:accountId/:shipmentId", authenticateToken, async (req, res) => {
  try {
    const { accountId, shipmentId } = req.params;

    const shipment = await findShipment(shipmentId, accountId, req.user.userId);
    if (!shipment) {
      return sendSuccess(res, null, "Shipment not found", 404);
    }

    return sendSuccess(res, { data: shipment.getDetails() });
  } catch (error) {
    return handleError(
      res,
      500,
      "Failed to fetch shipment",
      error,
      "GET_SHIPMENT_ERROR",
      { shipmentId: req.params.shipmentId, userId: req.user.userId }
    );
  }
});

/**
 * GET /api/shipments/:accountId/:shipmentId/tracking
 * Get tracking information from ML API
 */
router.get(
  "/:accountId/:shipmentId/tracking",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, shipmentId } = req.params;

      const shipment = await findShipment(shipmentId, accountId, req.user.userId);
      if (!shipment) {
        return sendSuccess(res, null, "Shipment not found", 404);
      }

      const tracking = await fetchTracking(accountId, shipment);

      return sendSuccess(res, {
        shipment: shipment.getSummary(),
        tracking: tracking || shipment.trackingEvents || [],
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
      });
    } catch (error) {
      return handleError(
        res,
        500,
        "Failed to fetch tracking information",
        error,
        "GET_TRACKING_ERROR",
        { shipmentId: req.params.shipmentId, userId: req.user.userId }
      );
    }
  },
);

/**
 * GET /api/shipments/:accountId/:shipmentId/label
 * Get shipping label URL
 */
router.get(
  "/:accountId/:shipmentId/label",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, shipmentId } = req.params;
      const { format = "pdf" } = req.query;

      const shipment = await findShipment(shipmentId, accountId, req.user.userId);
      if (!shipment) {
        return sendSuccess(res, null, "Shipment not found", 404);
      }

      const labelResponse = await fetchLabel(accountId, shipment, format);
      if (!labelResponse) {
        return handleError(
          res,
          500,
          "Failed to get shipping label",
          new Error("Label not available"),
          "GET_LABEL_ERROR",
          { shipmentId: req.params.shipmentId, userId: req.user.userId }
        );
      }

      return sendSuccess(res, {
        shipmentId: shipment.mlShipmentId,
        labelUrl: labelResponse?.url || labelResponse,
        format,
      });
    } catch (error) {
      return handleError(
        res,
        500,
        "Failed to get shipping label",
        error,
        "GET_LABEL_ERROR",
        { shipmentId: req.params.shipmentId, userId: req.user.userId }
      );
    }
  },
);

/**
 * GET /api/shipments/:accountId/:shipmentId/returns
 * Get return information for a shipment
 */
router.get(
  "/:accountId/:shipmentId/returns",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, shipmentId } = req.params;

      const shipment = await findShipment(shipmentId, accountId, req.user.userId);
      if (!shipment) {
        return sendSuccess(res, null, "Shipment not found", 404);
      }

      const returnsResponse = await fetchReturns(accountId, shipment);

      return sendSuccess(res, {
        shipmentId: shipment.id,
        mlShipmentId: shipment.mlShipmentId,
        orderId: shipment.orderId,
        returns: returnsResponse || [],
      });
    } catch (error) {
      return handleError(
        res,
        500,
        "Failed to fetch shipment returns",
        error,
        "GET_SHIPMENT_RETURNS_ERROR",
        { accountId: req.params.accountId, shipmentId: req.params.shipmentId, userId: req.user.userId }
      );
    }
  },
);

/**
 * PUT /api/shipments/:accountId/:shipmentId
 * Update shipment status on ML
 */
router.put(
  "/:accountId/:shipmentId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, shipmentId } = req.params;
      const { status, trackingNumber, serviceId } = req.body;

      const shipment = await findShipment(shipmentId, accountId, req.user.userId);
      if (!shipment) {
        return sendSuccess(res, null, "Shipment not found", 404);
      }

      const updateData = {};
      if (status) updateData.status = status;
      if (trackingNumber) updateData.tracking_number = trackingNumber;
      if (serviceId) updateData.service_id = serviceId;

      await sdkManager.execute(accountId, async (sdk) => {
        return await sdk.shipments.updateShipment(
          shipment.mlShipmentId,
          updateData,
        );
      });

      // Update local DB
      if (status) {
        shipment.status = status;
        shipment.statusHistory.push({
          status,
          date: new Date(),
        });
      }
      if (trackingNumber) shipment.trackingNumber = trackingNumber;
      shipment.lastSyncedAt = new Date();
      await shipment.save();

      logger.info({
        action: "SHIPMENT_UPDATED",
        shipmentId: shipment.mlShipmentId,
        accountId,
        userId: req.user.userId,
        status,
      });

      return sendSuccess(res, {
        data: shipment.getDetails(),
      }, "Shipment updated successfully");
    } catch (error) {
      return handleError(
        res,
        500,
        "Failed to update shipment",
        error,
        "UPDATE_SHIPMENT_ERROR",
        { shipmentId: req.params.shipmentId, userId: req.user.userId }
      );
    }
  },
);

/**
 * POST /api/shipments/:accountId/sync
 * Sync shipments from Mercado Livre
 */
router.post(
  "/:accountId/sync",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { all = false } = req.body;

      logger.info({
        action: "SHIPMENTS_SYNC_STARTED",
        accountId,
        userId: req.user.userId,
        all,
        timestamp: new Date().toISOString(),
      });

      // Get shipment IDs from orders
      const shipmentIds = await getShipmentIdsFromOrders(
        accountId,
        req.user.userId,
        all === true
      );

      // Fetch shipments in batches
      const mlShipments = await fetchShipmentsInBatches(
        accountId,
        shipmentIds,
        all === true
      );

      // Save shipments
      const savedShipments = await saveShipments(
        accountId,
        req.user.userId,
        mlShipments,
      );

      logger.info({
        action: "SHIPMENTS_SYNC_COMPLETED",
        accountId,
        userId: req.user.userId,
        shipmentsCount: savedShipments.length,
        timestamp: new Date().toISOString(),
      });

      return sendSuccess(res, {
        accountId,
        shipmentsCount: savedShipments.length,
        shipments: savedShipments.map((s) => s.getSummary()),
        syncedAt: new Date().toISOString(),
      }, `Synchronized ${savedShipments.length} shipments`);
    } catch (error) {
      return handleError(
        res,
        500,
        "Failed to sync shipments",
        error,
        "SHIPMENTS_SYNC_ERROR",
        { accountId: req.params.accountId, userId: req.user.userId, timestamp: new Date().toISOString() }
      );
    }
  },
);

/**
 * POST /api/shipments/:accountId/:shipmentId/returns
 * Request a return for a shipment
 */
router.post(
  "/:accountId/:shipmentId/returns",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, shipmentId } = req.params;
      const { reason, description } = req.body;

      if (!reason) {
        return sendSuccess(res, null, "Return reason is required", 400);
      }

      const shipment = await findShipment(shipmentId, accountId, req.user.userId);
      if (!shipment) {
        return sendSuccess(res, null, "Shipment not found", 404);
      }

      const returnPayload = {
        reason,
        description: description || `Return requested via dashboard`,
      };

      try {
        const mlResponse = await sdkManager.execute(accountId, async (sdk) => {
          return await sdk.shipments.requestShipmentReturn(
            shipment.mlShipmentId,
            returnPayload,
          );
        });

        // Update shipment status
        shipment.status = "return_requested";
        await shipment.save();

        logger.info({
          action: "REQUEST_SHIPMENT_RETURN",
          accountId,
          shipmentId: shipment.mlShipmentId,
          reason,
          mlReturnId: mlResponse?.id,
        });

        return sendSuccess(res, {
          shipmentId: shipment.id,
          mlShipmentId: shipment.mlShipmentId,
          returnId: mlResponse?.id,
          status: "return_requested",
          reason,
          requestedAt: new Date(),
          mlResponse,
        }, "Return requested successfully");
      } catch (mlError) {
        logger.error({
          action: "REQUEST_SHIPMENT_RETURN_ML_ERROR",
          accountId,
          shipmentId: shipment.mlShipmentId,
          mlError: mlError.message,
        });

        return handleError(
          res,
          400,
          "Failed to request return from Mercado Livre",
          mlError,
          "REQUEST_SHIPMENT_RETURN_ML_ERROR",
          { accountId, shipmentId: shipment.mlShipmentId }
        );
      }
    } catch (error) {
      return handleError(
        res,
        500,
        "Failed to request return",
        error,
        "REQUEST_SHIPMENT_RETURN_ERROR",
        { accountId: req.params.accountId, shipmentId: req.params.shipmentId, userId: req.user.userId }
      );
    }
  },
);

module.exports = router;