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

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const Shipment = require('../db/models/Shipment');
const Order = require('../db/models/Order');
const MLAccount = require('../db/models/MLAccount');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * Helper function to parse multiple status values
 * Converts "pending,shipped,delivered" to ["pending", "shipped", "delivered"]
 */
function parseMultipleStatus(statusParam) {
  if (!statusParam) return null;
  
  const statuses = statusParam.split(',').map(s => s.trim()).filter(s => s.length > 0);
  return statuses.length > 1 ? { $in: statuses } : statuses[0];
}

/**
 * GET /api/shipments
 * List all shipments for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status, sort = '-dateCreated' } = req.query;

    const query = { userId: req.user.userId };
    
    // Parse multiple status values (supports "pending,shipped,delivered")
    if (status) {
      const parsedStatus = parseMultipleStatus(status);
      if (parsedStatus) {
        query.status = parsedStatus;
      }
    }

    const shipments = await Shipment.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Shipment.countDocuments(query);

    res.json({
      success: true,
      data: {
        shipments: shipments.map(s => s.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_SHIPMENTS_ERROR',
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch shipments',
      error: error.message,
    });
  }
});

/**
 * GET /api/shipments/:accountId/stats
 * Get shipment statistics for an account
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

    const stats = await Shipment.getStats(accountId);

    const totalShipments = await Shipment.countDocuments({
      accountId,
      userId: req.user.userId,
    });

    const pendingShipments = await Shipment.countDocuments({
      accountId,
      userId: req.user.userId,
      status: { $in: ['pending', 'handling', 'ready_to_ship'] },
    });

    const shippedShipments = await Shipment.countDocuments({
      accountId,
      userId: req.user.userId,
      status: { $in: ['shipped', 'in_transit'] },
    });

    const deliveredShipments = await Shipment.countDocuments({
      accountId,
      userId: req.user.userId,
      status: 'delivered',
    });

    res.json({
      success: true,
      data: {
        accountId,
        shipments: {
          total: totalShipments,
          pending: pendingShipments,
          shipped: shippedShipments,
          delivered: deliveredShipments,
        },
        statusBreakdown: stats,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_SHIPMENT_STATS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get shipment statistics',
      error: error.message,
    });
  }
});

/**
 * GET /api/shipments/:accountId/pending
 * List pending shipments for specific account
 */
router.get('/:accountId/pending', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 50 } = req.query;

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

    const shipments = await Shipment.findPending(accountId);

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        shipments: shipments.map(s => s.getSummary()),
        total: shipments.length,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_PENDING_SHIPMENTS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending shipments',
      error: error.message,
    });
  }
});

/**
 * GET /api/shipments/:accountId
  * List shipments for specific account
  * Query params:
  *   - limit: number of results (default 20)
  *   - offset: pagination offset (default 0)
  *   - status: shipment status filter (comma-separated for multiple: pending,shipped,delivered)
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
    
    // Parse multiple status values (supports "pending,shipped,delivered")
    if (status) {
      const parsedStatus = parseMultipleStatus(status);
      if (parsedStatus) {
        query.status = parsedStatus;
      }
    }

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

    const shipments = await Shipment.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Shipment.countDocuments(query);

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        shipments: shipments.map(s => s.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ACCOUNT_SHIPMENTS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch shipments',
      error: error.message,
    });
  }
});

/**
 * GET /api/shipments/:accountId/:shipmentId
 * Get detailed shipment information
 */
router.get('/:accountId/:shipmentId', authenticateToken, async (req, res) => {
  try {
    const { accountId, shipmentId } = req.params;

    const shipment = await Shipment.findOne({
      $or: [{ id: shipmentId }, { mlShipmentId: shipmentId }],
      accountId,
      userId: req.user.userId,
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    res.json({
      success: true,
      data: shipment.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'GET_SHIPMENT_ERROR',
      shipmentId: req.params.shipmentId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch shipment',
      error: error.message,
    });
  }
});

/**
 * GET /api/shipments/:accountId/:shipmentId/tracking
 * Get tracking information from ML API
 */
router.get('/:accountId/:shipmentId/tracking', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, shipmentId } = req.params;
    const account = req.mlAccount;

    const shipment = await Shipment.findOne({
      $or: [{ id: shipmentId }, { mlShipmentId: shipmentId }],
      accountId,
      userId: req.user.userId,
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    // Fetch tracking from ML API
    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const trackingResponse = await axios.get(
      `${ML_API_BASE}/shipments/${shipment.mlShipmentId}/history`,
      { headers }
    ).catch(err => {
      logger.warn({
        action: 'FETCH_TRACKING_ERROR',
        shipmentId: shipment.mlShipmentId,
        error: err.response?.data || err.message,
      });
      return null;
    });

    res.json({
      success: true,
      data: {
        shipment: shipment.getSummary(),
        tracking: trackingResponse?.data || shipment.trackingEvents || [],
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_TRACKING_ERROR',
      shipmentId: req.params.shipmentId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch tracking information',
      error: error.message,
    });
  }
});

/**
 * GET /api/shipments/:accountId/:shipmentId/label
 * Get shipping label URL
 */
router.get('/:accountId/:shipmentId/label', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, shipmentId } = req.params;
    const { format = 'pdf' } = req.query;
    const account = req.mlAccount;

    const shipment = await Shipment.findOne({
      $or: [{ id: shipmentId }, { mlShipmentId: shipmentId }],
      accountId,
      userId: req.user.userId,
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    // Get label URL from ML API
    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
    };

    const labelResponse = await axios.get(
      `${ML_API_BASE}/shipment_labels`,
      {
        headers,
        params: {
          shipment_ids: shipment.mlShipmentId,
          response_type: format,
          access_token: account.accessToken,
        },
      }
    );

    res.json({
      success: true,
      data: {
        shipmentId: shipment.mlShipmentId,
        labelUrl: labelResponse.data?.url || `${ML_API_BASE}/shipment_labels?shipment_ids=${shipment.mlShipmentId}&response_type=${format}&access_token=${account.accessToken}`,
        format,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_LABEL_ERROR',
      shipmentId: req.params.shipmentId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get shipping label',
      error: error.message,
    });
  }
});

/**
 * PUT /api/shipments/:accountId/:shipmentId
 * Update shipment status on ML
 */
router.put('/:accountId/:shipmentId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, shipmentId } = req.params;
    const { status, trackingNumber, serviceId } = req.body;
    const account = req.mlAccount;

    const shipment = await Shipment.findOne({
      $or: [{ id: shipmentId }, { mlShipmentId: shipmentId }],
      accountId,
      userId: req.user.userId,
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    // Update on ML API
    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const updateData = {};
    if (status) updateData.status = status;
    if (trackingNumber) updateData.tracking_number = trackingNumber;
    if (serviceId) updateData.service_id = serviceId;

    const response = await axios.put(
      `${ML_API_BASE}/shipments/${shipment.mlShipmentId}`,
      updateData,
      { headers }
    );

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
      action: 'SHIPMENT_UPDATED',
      shipmentId: shipment.mlShipmentId,
      accountId,
      userId: req.user.userId,
      status,
    });

    res.json({
      success: true,
      message: 'Shipment updated successfully',
      data: shipment.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_SHIPMENT_ERROR',
      shipmentId: req.params.shipmentId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update shipment',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/shipments/:accountId/sync
 * Sync shipments from Mercado Livre (based on orders)
 */
router.post('/:accountId/sync', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;

    logger.info({
      action: 'SHIPMENTS_SYNC_STARTED',
      accountId,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    // Get orders with shipments
    const orders = await Order.find({
      accountId,
      userId: req.user.userId,
      'shipping.id': { $exists: true, $ne: null },
    }).limit(50);

    const shipmentIds = orders
      .map(o => o.shipping?.id)
      .filter(id => id);

    // Fetch shipment details from ML
    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const mlShipments = await Promise.all(
      shipmentIds.map(id =>
        axios
          .get(`${ML_API_BASE}/shipments/${id}`, { headers })
          .then(res => res.data)
          .catch(error => {
            logger.warn({
              action: 'FETCH_SHIPMENT_DETAILS_ERROR',
              shipmentId: id,
              error: error.message,
            });
            return null;
          })
      )
    );

    // Save shipments
    const savedShipments = await saveShipments(
      accountId,
      req.user.userId,
      mlShipments.filter(s => s !== null)
    );

    logger.info({
      action: 'SHIPMENTS_SYNC_COMPLETED',
      accountId,
      userId: req.user.userId,
      shipmentsCount: savedShipments.length,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Synchronized ${savedShipments.length} shipments`,
      data: {
        accountId,
        shipmentsCount: savedShipments.length,
        shipments: savedShipments.map(s => s.getSummary()),
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({
      action: 'SHIPMENTS_SYNC_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to sync shipments',
      error: error.message,
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

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
        carrier: mlShipment.tracking_method ? {
          name: mlShipment.tracking_method,
        } : null,
        trackingNumber: mlShipment.tracking_number,
        trackingMethod: mlShipment.tracking_method,
        shippingOption: mlShipment.shipping_option ? {
          id: mlShipment.shipping_option.id?.toString(),
          name: mlShipment.shipping_option.name,
          cost: mlShipment.shipping_option.cost,
          currencyId: mlShipment.shipping_option.currency_id,
          listCost: mlShipment.shipping_option.list_cost,
        } : null,
        receiverAddress: mlShipment.receiver_address ? {
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
        } : null,
        senderAddress: mlShipment.sender_address || null,
        dimensions: mlShipment.dimensions || null,
        cost: mlShipment.cost || 0,
        baseCost: mlShipment.base_cost || 0,
        dateCreated: new Date(mlShipment.date_created),
        dateFirstPrinted: mlShipment.date_first_printed ? new Date(mlShipment.date_first_printed) : null,
        dateHandling: mlShipment.date_handling ? new Date(mlShipment.date_handling) : null,
        dateShipped: mlShipment.date_shipped ? new Date(mlShipment.date_shipped) : null,
        dateDelivered: mlShipment.date_delivered ? new Date(mlShipment.date_delivered) : null,
        tags: mlShipment.tags || [],
        lastSyncedAt: new Date(),
      };

      // Find or create shipment
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
        action: 'SAVE_SHIPMENT_ERROR',
        mlShipmentId: mlShipment.id,
        accountId,
        error: error.message,
      });
    }
  }

  return savedShipments;
}

/**
 * GET /api/shipments/:accountId/:shipmentId/returns
 * Get return information for a shipment
 */
router.get(
  '/:accountId/:shipmentId/returns',
  authenticateToken,
  validateMLToken('accountId'),
  async (req, res) => {
    try {
      const { accountId, shipmentId } = req.params;
      const account = req.mlAccount;

      // Find shipment in DB
      const shipment = await Shipment.findOne({
        $or: [{ id: shipmentId }, { mlShipmentId: shipmentId }],
        accountId,
        userId: req.user.userId,
      });

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: 'Shipment not found',
        });
      }

      // Fetch returns from ML API
      const headers = {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      };

      const returnsResponse = await axios.get(
        `${ML_API_BASE}/shipments/${shipment.mlShipmentId}/returns`,
        { headers }
      ).catch(err => {
        logger.warn({
          action: 'FETCH_RETURNS_ERROR',
          shipmentId: shipment.mlShipmentId,
          error: err.response?.data || err.message,
        });
        return null;
      });

      res.json({
        success: true,
        data: {
          shipmentId: shipment.id,
          mlShipmentId: shipment.mlShipmentId,
          orderId: shipment.orderId,
          returns: returnsResponse?.data || [],
        },
      });
    } catch (error) {
      logger.error({
        action: 'GET_SHIPMENT_RETURNS_ERROR',
        accountId: req.params.accountId,
        shipmentId: req.params.shipmentId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch shipment returns',
        error: error.message,
      });
    }
  },
);

/**
 * POST /api/shipments/:accountId/:shipmentId/returns
 * Request a return for a shipment
 */
router.post(
  '/:accountId/:shipmentId/returns',
  authenticateToken,
  validateMLToken('accountId'),
  async (req, res) => {
    try {
      const { accountId, shipmentId } = req.params;
      const { reason, description } = req.body;
      const account = req.mlAccount;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Return reason is required',
        });
      }

      // Find shipment in DB
      const shipment = await Shipment.findOne({
        $or: [{ id: shipmentId }, { mlShipmentId: shipmentId }],
        accountId,
        userId: req.user.userId,
      });

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: 'Shipment not found',
        });
      }

      // Request return via ML API
      const headers = {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      };

      const returnPayload = {
        reason,
        description: description || `Return requested via dashboard`,
      };

      try {
        const mlResponse = await axios.post(
          `${ML_API_BASE}/shipments/${shipment.mlShipmentId}/returns`,
          returnPayload,
          { headers }
        );

        // Update shipment status
        shipment.status = 'return_requested';
        await shipment.save();

        logger.info({
          action: 'REQUEST_SHIPMENT_RETURN',
          accountId,
          shipmentId: shipment.mlShipmentId,
          reason,
          mlReturnId: mlResponse.data?.id,
        });

        res.json({
          success: true,
          message: 'Return requested successfully',
          data: {
            shipmentId: shipment.id,
            mlShipmentId: shipment.mlShipmentId,
            returnId: mlResponse.data?.id,
            status: 'return_requested',
            reason,
            requestedAt: new Date(),
            mlResponse: mlResponse.data,
          },
        });
      } catch (mlError) {
        logger.error({
          action: 'REQUEST_SHIPMENT_RETURN_ML_ERROR',
          accountId,
          shipmentId: shipment.mlShipmentId,
          mlError: mlError.response?.data || mlError.message,
        });

        res.status(400).json({
          success: false,
          message: 'Failed to request return from Mercado Livre',
          error: mlError.response?.data?.message || mlError.message,
        });
      }
    } catch (error) {
      logger.error({
        action: 'REQUEST_SHIPMENT_RETURN_ERROR',
        accountId: req.params.accountId,
        shipmentId: req.params.shipmentId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to request return',
        error: error.message,
      });
    }
  },
);

module.exports = router;
