/**
 * Orders Routes
 * Manage orders/sales from Mercado Livre
 *
 * GET    /api/orders                        - List all orders for user
 * GET    /api/orders/:accountId             - List orders for specific account
 * GET    /api/orders/:accountId/:orderId    - Get order details
 * POST   /api/orders/:accountId/sync        - Sync orders from ML
 * GET    /api/orders/:accountId/stats       - Get order statistics
 * GET    /api/orders/:accountId/:orderId/billing - Get billing info for NF
 */

const express = require("express");
const logger = require("../logger");
const { authenticateToken } = require("../middleware/auth");
const { validateMLToken } = require("../middleware/ml-token-validation");
const { cacheMiddleware } = require("../middleware/cache");
const sdkManager = require("../services/sdk-manager");
const Order = require("../db/models/Order");
const MLAccount = require("../db/models/MLAccount");
const mlCategoryService = require("../services/mlCategoryService");
const ProductCost = require("../db/models/ProductCost");

const router = express.Router();

/**
 * Helper function to parse multiple status values
 * Converts "paid,shipped,cancelled" to ["paid", "shipped", "cancelled"]
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
 * GET /api/orders
 * List all orders for the authenticated user
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      limit: queryLimit,
      offset = 0,
      status,
      sort = "-dateCreated",
      all,
    } = req.query;

    // If all=true, fetch everything. Otherwise use limit (default 100)
    const limit = all === "true" ? 999999 : queryLimit || 100;

    const query = { userId: req.user.userId };

    // Parse multiple status values (supports "paid,shipped,cancelled")
    if (status) {
      const parsedStatus = parseMultipleStatus(status);
      if (parsedStatus) {
        query.status = parsedStatus;
      }
    }

    const orders = await Order.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders: orders.map((o) => o.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: "GET_ORDERS_ERROR",
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

/**
 * GET /api/orders/:accountId/stats
 * Get order statistics for an account
 */
router.get(
  "/:accountId/stats",
  authenticateToken,
  cacheMiddleware(180, (req) => {
    // Cache stats for 3 minutes
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;
    return `cache:stats:${req.user.userId}:${accountId}:${startDate || "all"}:${endDate || "all"}`;
  }),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { startDate, endDate } = req.query;

      // Verify account exists
      const account = await MLAccount.findOne({
        id: accountId,
        userId: req.user.userId,
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      // Build date range
      const dateRange = {};
      if (startDate) dateRange.start = startDate;
      if (endDate) dateRange.end = endDate;

      // Get statistics
      const statusStats = await Order.getStats(accountId, dateRange);

      const totalOrders = await Order.countDocuments({
        accountId,
        userId: req.user.userId,
      });

      const paidOrders = await Order.countDocuments({
        accountId,
        userId: req.user.userId,
        status: "paid",
      });

      const pendingOrders = await Order.countDocuments({
        accountId,
        userId: req.user.userId,
        status: {
          $in: ["confirmed", "payment_required", "payment_in_process"],
        },
      });

      const cancelledOrders = await Order.countDocuments({
        accountId,
        userId: req.user.userId,
        status: "cancelled",
      });

      // Get revenue
      const revenueStats = await Order.aggregate([
        {
          $match: {
            accountId,
            userId: req.user.userId,
            status: "paid",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalPaid: { $sum: "$paidAmount" },
            averageOrderValue: { $avg: "$totalAmount" },
            totalOrders: { $sum: 1 },
          },
        },
      ]);

      const revenue = revenueStats[0] || {
        totalRevenue: 0,
        totalPaid: 0,
        averageOrderValue: 0,
        totalOrders: 0,
      };

      res.json({
        success: true,
        data: {
          accountId,
          orders: {
            total: totalOrders,
            paid: paidOrders,
            pending: pendingOrders,
            cancelled: cancelledOrders,
          },
          revenue: {
            total: revenue.totalRevenue,
            paid: revenue.totalPaid,
            average: revenue.averageOrderValue,
          },
          statusBreakdown: statusStats,
        },
      });
    } catch (error) {
      logger.error({
        action: "GET_ORDER_STATS_ERROR",
        accountId: req.params.accountId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get order statistics",
        error: error.message,
      });
    }
  },
);

/**
 * GET /api/orders/:accountId
 * List orders for specific account
 * Query params:
 *   - limit: number of results (default 20)
 *   - offset: pagination offset (default 0)
 *   - status: order status filter (comma-separated for multiple: paid,shipped,cancelled)
 *   - date_created.from: RFC 3339 format (2024-01-31T18:03:35.000-04:00)
 *   - date_created.to: RFC 3339 format
 *   - sort: sort field (default -dateCreated)
 */
router.get("/:accountId", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const {
      limit: queryLimit,
      offset = 0,
      status,
      sort = "-dateCreated",
      "date_created.from": dateFrom,
      "date_created.to": dateTo,
      all,
    } = req.query;

    // If all=true, fetch everything. Otherwise use limit (default 100)
    const limit = all === "true" ? 999999 : queryLimit || 100;

    // Verify account belongs to user
    const account = await MLAccount.findOne({
      id: accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const query = { accountId, userId: req.user.userId };

    // Parse multiple status values (supports "paid,shipped,cancelled")
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

    const orders = await Order.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        orders: orders.map((o) => o.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: "GET_ACCOUNT_ORDERS_ERROR",
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

/**
 * GET /api/orders/:accountId/:orderId
 * Get detailed order information
 */
router.get("/:accountId/:orderId", authenticateToken, async (req, res) => {
  try {
    const { accountId, orderId } = req.params;

    const order = await Order.findOne({
      $or: [{ id: orderId }, { mlOrderId: orderId }],
      accountId,
      userId: req.user.userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: "GET_ORDER_ERROR",
      orderId: req.params.orderId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
});

/**
 * GET /api/orders/:accountId/:orderId/billing
 * Get billing information for invoice/NF
 */
router.get(
  "/:accountId/:orderId/billing",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, orderId } = req.params;
      const account = req.mlAccount;

      // Find order in DB
      const order = await Order.findOne({
        $or: [{ id: orderId }, { mlOrderId: orderId }],
        accountId,
        userId: req.user.userId,
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Fetch billing info using SDK Manager
      const billingResponse = await sdkManager
        .execute(accountId, async (sdk) => {
          return await sdk.orders.getOrderBillingInfo(order.mlOrderId);
        })
        .catch((err) => {
          logger.warn({
            action: "FETCH_BILLING_INFO_ERROR",
            orderId: order.mlOrderId,
            error: err.message,
          });
          return null;
        });

      res.json({
        success: true,
        data: {
          order: order.getSummary(),
          billingInfo: billingResponse || order.billingInfo || null,
          buyer: order.buyer,
        },
      });
    } catch (error) {
      logger.error({
        action: "GET_ORDER_BILLING_ERROR",
        orderId: req.params.orderId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: "Failed to fetch billing information",
        error: error.message,
      });
    }
  },
);

/**
 * POST /api/orders/:accountId/sync
 * Sync orders from Mercado Livre
 * Body params:
 *   - status: Order status (default 'paid')
 *   - days: Date range in days (default 30)
 *   - all: If true, fetch ALL orders with auto-pagination (default false)
 */
router.post(
  "/:accountId/sync",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { status = "paid", days = 30, all = false } = req.body;
      const account = req.mlAccount;

      logger.info({
        action: "ORDERS_SYNC_STARTED",
        accountId,
        userId: req.user.userId,
        all,
        timestamp: new Date().toISOString(),
      });

      // Fetch orders from ML using SDK Manager
      const mlOrders = await fetchMLOrders(account.mlUserId, accountId, {
        status,
        days,
        all,
      });

      // Store/update orders in database
      const savedOrders = await saveOrders(
        accountId,
        req.user.userId,
        mlOrders,
      );

      logger.info({
        action: "ORDERS_SYNC_COMPLETED",
        accountId,
        userId: req.user.userId,
        ordersCount: savedOrders.length,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: `Synchronized ${savedOrders.length} orders`,
        data: {
          accountId,
          ordersCount: savedOrders.length,
          orders: savedOrders.map((o) => o.getSummary()),
          syncedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error({
        action: "ORDERS_SYNC_ERROR",
        accountId: req.params.accountId,
        userId: req.user.userId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        success: false,
        message: "Failed to sync orders",
        error: error.message,
      });
    }
  },
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetch orders from Mercado Livre API using SDK Manager
 * Options:
 *   - accountId: Account ID for SDK Manager
 *   - status: Order status filter (default 'paid')
 *   - days: Date range in days (default 30)
 *   - all: If true, fetch ALL orders with auto-pagination (default false)
 */
async function fetchMLOrders(mlUserId, accountId, options = {}) {
  try {
    const { status = "paid", days = 30, all = false } = options;

    // Base search params
    const searchParams = {
      seller: mlUserId,
      sort: "date_desc",
    };

    // Only apply filters if NOT in unlimited mode
    if (!all) {
      searchParams["order.status"] = status;
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      searchParams["order.date_created.from"] = dateFrom.toISOString();
    }

    // UNLIMITED MODE: Fetch ALL orders with auto-pagination
    if (all) {
      let allOrders = [];
      let currentOffset = 0;
      const batchSize = 50; // ML API max per request

      logger.info({
        action: "FETCH_ALL_ORDERS_START",
        mlUserId,
        note: "Fetching ALL orders (all statuses, all dates)",
      });

      while (true) {
        const response = await sdkManager.execute(accountId, async (sdk) => {
          return await sdk.orders.searchOrders({
            ...searchParams,
            limit: batchSize,
            offset: currentOffset,
          });
        });

        const orders = response.results || [];
        if (orders.length === 0) break;

        allOrders.push(...orders);
        currentOffset += batchSize;

        // Stop if we've fetched everything
        const total = response.paging?.total || 0;
        if (currentOffset >= total) break;
      }

      // Fetch detailed info for all orders in batches
      const detailedOrders = [];
      for (let i = 0; i < allOrders.length; i += 20) {
        const batch = allOrders.slice(i, i + 20);
        const batchDetails = await Promise.all(
          batch.map((order) =>
            sdkManager.getOrder(accountId, order.id).catch((error) => {
              logger.warn({
                action: "FETCH_ORDER_DETAILS_ERROR",
                orderId: order.id,
                error: error.message,
              });
              return order;
            }),
          ),
        );
        detailedOrders.push(...batchDetails);
      }

      logger.info({
        action: "FETCH_ALL_ORDERS_SUCCESS",
        mlUserId,
        totalOrders: detailedOrders.length,
      });

      return detailedOrders;
    }

    // NORMAL MODE: Single request with limit
    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.orders.searchOrders({
        ...searchParams,
        limit: 50,
      });
    });

    const orders = response.results || [];

    // Fetch detailed info for each order
    const detailedOrders = await Promise.all(
      orders.map((order) =>
        sdkManager.getOrder(accountId, order.id).catch((error) => {
          logger.warn({
            action: "FETCH_ORDER_DETAILS_ERROR",
            orderId: order.id,
            error: error.message,
          });
          return order; // Return basic order if detailed fetch fails
        }),
      ),
    );

    return detailedOrders;
  } catch (error) {
    logger.error({
      action: "FETCH_ML_ORDERS_ERROR",
      mlUserId,
      error: error.message,
    });
    throw new Error(
      `Failed to fetch orders from Mercado Livre: ${error.message}`,
    );
  }
}

/**
 * Save or update orders in database
 */
async function saveOrders(accountId, userId, mlOrders) {
  const savedOrders = [];

  for (const mlOrder of mlOrders) {
    try {
      const orderData = {
        accountId,
        userId,
        mlOrderId: mlOrder.id.toString(),
        packId: mlOrder.pack_id?.toString() || null,
        status: mlOrder.status,
        statusDetail: mlOrder.status_detail,
        dateCreated: new Date(mlOrder.date_created),
        dateClosed: mlOrder.date_closed ? new Date(mlOrder.date_closed) : null,
        dateLastUpdated: mlOrder.last_updated
          ? new Date(mlOrder.last_updated)
          : null,
        expirationDate: mlOrder.expiration_date
          ? new Date(mlOrder.expiration_date)
          : null,
        buyer: mlOrder.buyer
          ? {
              id: mlOrder.buyer.id?.toString(),
              nickname: mlOrder.buyer.nickname,
              firstName: mlOrder.buyer.first_name,
              lastName: mlOrder.buyer.last_name,
              email: mlOrder.buyer.email,
              phone: mlOrder.buyer.phone
                ? {
                    areaCode: mlOrder.buyer.phone.area_code,
                    number: mlOrder.buyer.phone.number,
                    extension: mlOrder.buyer.phone.extension,
                  }
                : null,
              billingInfo: mlOrder.buyer.billing_info
                ? {
                    docType: mlOrder.buyer.billing_info.doc_type,
                    docNumber: mlOrder.buyer.billing_info.doc_number,
                  }
                : null,
            }
          : null,
        seller: mlOrder.seller
          ? {
              id: mlOrder.seller.id?.toString(),
              nickname: mlOrder.seller.nickname,
            }
          : null,
        orderItems: (mlOrder.order_items || []).map((item) => ({
          itemId: item.item?.id,
          title: item.item?.title,
          categoryId: item.item?.category_id,
          variationId: item.item?.variation_id?.toString(),
          variationAttributes:
            item.item?.variation_attributes?.map((attr) => ({
              name: attr.name,
              valueName: attr.value_name,
            })) || [],
          quantity: item.quantity,
          unitPrice: item.unit_price,
          fullUnitPrice: item.full_unit_price,
          currencyId: item.currency_id,
          manufacturingDays: item.manufacturing_days,
          saleFee: item.sale_fee,
          listingTypeId: item.listing_type_id,
        })),
        payments: (mlOrder.payments || []).map((payment) => ({
          id: payment.id?.toString(),
          orderId: payment.order_id?.toString(),
          payerId: payment.payer_id?.toString(),
          collector: payment.collector
            ? { id: payment.collector.id?.toString() }
            : null,
          currencyId: payment.currency_id,
          status: payment.status,
          statusDetail: payment.status_detail,
          transactionAmount: payment.transaction_amount,
          shippingCost: payment.shipping_cost,
          overpaidAmount: payment.overpaid_amount,
          totalPaidAmount: payment.total_paid_amount,
          marketplaceFee: payment.marketplace_fee,
          couponAmount: payment.coupon_amount,
          dateCreated: payment.date_created
            ? new Date(payment.date_created)
            : null,
          dateLastModified: payment.date_last_modified
            ? new Date(payment.date_last_modified)
            : null,
          dateApproved: payment.date_approved
            ? new Date(payment.date_approved)
            : null,
          paymentMethodId: payment.payment_method_id,
          paymentType: payment.payment_type,
          installments: payment.installments,
        })),
        shipping: mlOrder.shipping
          ? {
              id: mlOrder.shipping.id?.toString(),
              status: mlOrder.shipping.status,
              substatus: mlOrder.shipping.substatus,
              mode: mlOrder.shipping.mode,
              receiverAddress: mlOrder.shipping.receiver_address
                ? {
                    id: mlOrder.shipping.receiver_address.id?.toString(),
                    addressLine: mlOrder.shipping.receiver_address.address_line,
                    streetName: mlOrder.shipping.receiver_address.street_name,
                    streetNumber:
                      mlOrder.shipping.receiver_address.street_number,
                    comment: mlOrder.shipping.receiver_address.comment,
                    zipCode: mlOrder.shipping.receiver_address.zip_code,
                    city: mlOrder.shipping.receiver_address.city
                      ? {
                          id: mlOrder.shipping.receiver_address.city.id,
                          name: mlOrder.shipping.receiver_address.city.name,
                        }
                      : null,
                    state: mlOrder.shipping.receiver_address.state
                      ? {
                          id: mlOrder.shipping.receiver_address.state.id,
                          name: mlOrder.shipping.receiver_address.state.name,
                        }
                      : null,
                    country: mlOrder.shipping.receiver_address.country
                      ? {
                          id: mlOrder.shipping.receiver_address.country.id,
                          name: mlOrder.shipping.receiver_address.country.name,
                        }
                      : null,
                    receiverName:
                      mlOrder.shipping.receiver_address.receiver_name,
                    receiverPhone:
                      mlOrder.shipping.receiver_address.receiver_phone,
                  }
                : null,
            }
          : null,
        totalAmount: mlOrder.total_amount || 0,
        paidAmount: mlOrder.paid_amount || 0,
        couponAmount: mlOrder.coupon?.amount || 0,
        currencyId: mlOrder.currency_id || "BRL",
        tags: mlOrder.tags || [],
        feedback: mlOrder.feedback
          ? {
              buyer: mlOrder.feedback.buyer,
              seller: mlOrder.feedback.seller,
            }
          : null,
        lastSyncedAt: new Date(),
      };

      // Find or create order
      let order = await Order.findOne({
        accountId,
        mlOrderId: mlOrder.id.toString(),
      });

      if (order) {
        // Update existing order
        Object.assign(order, orderData);
        await order.save();
      } else {
        // Create new order
        order = new Order(orderData);
        await order.save();
      }

      savedOrders.push(order);
    } catch (error) {
      logger.error({
        action: "SAVE_ORDER_ERROR",
        mlOrderId: mlOrder.id,
        accountId,
        error: error.message,
      });
    }
  }

  return savedOrders;
}

/**
 * POST /api/orders/:accountId/:orderId
 * Update order status or perform actions
 * Body:
 *   - action: 'cancel' | 'complete' | 'update_status'
 *   - reason: cancellation reason (for cancel action)
 *   - status: new status (for update_status action)
 */
router.post(
  "/:accountId/:orderId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, orderId } = req.params;
      const { action, reason, status } = req.body;
      const account = req.mlAccount;

      // Validate action
      if (
        !action ||
        !["cancel", "complete", "update_status"].includes(action)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid action. Must be: cancel, complete, or update_status",
        });
      }

      // Find order
      const order = await Order.findOne({
        $or: [{ id: orderId }, { mlOrderId: orderId }],
        accountId,
        userId: req.user.userId,
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      let mlResponse;
      let newStatus = order.status;

      try {
        switch (action) {
          case "cancel":
            // Call ML API to cancel order using SDK Manager
            mlResponse = await sdkManager.execute(accountId, async (sdk) => {
              return await sdk.orders.performOrderAction(order.mlOrderId, {
                action: "cancel",
                reason: reason || "Cancelled via dashboard",
              });
            });
            newStatus = "cancelled";
            break;

          case "complete":
            // Mark order as complete using SDK Manager
            mlResponse = await sdkManager.execute(accountId, async (sdk) => {
              return await sdk.orders.performOrderAction(order.mlOrderId, {
                action: "complete",
              });
            });
            newStatus = "completed";
            break;

          case "update_status":
            // Update order status
            if (!status) {
              return res.status(400).json({
                success: false,
                message: "Status is required for update_status action",
              });
            }

            mlResponse = await sdkManager.execute(accountId, async (sdk) => {
              return await sdk.orders.updateOrder(order.mlOrderId, { status });
            });
            newStatus = status;
            break;
        }

        // Update local database
        order.status = newStatus;
        order.dateLastUpdated = new Date();
        await order.save();

        logger.info({
          action: "ORDER_ACTION_EXECUTED",
          accountId,
          orderId: order.mlOrderId,
          orderAction: action,
          newStatus,
          userId: req.user.userId,
        });

        res.json({
          success: true,
          message: `Order ${action} executed successfully`,
          data: {
            orderId: order.id,
            mlOrderId: order.mlOrderId,
            newStatus,
            action,
            updatedAt: order.dateLastUpdated,
            mlResponse: mlResponse,
          },
        });
      } catch (mlError) {
        logger.error({
          action: "ORDER_ACTION_ML_ERROR",
          accountId,
          orderId: order.mlOrderId,
          orderAction: action,
          mlError: mlError.response?.data || mlError.message,
        });

        res.status(400).json({
          success: false,
          message: `Failed to ${action} order on Mercado Livre`,
          error: mlError.message,
        });
      }
    } catch (error) {
      logger.error({
        action: "ORDER_ACTION_ERROR",
        accountId: req.params.accountId,
        orderId: req.params.orderId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: "Failed to execute order action",
        error: error.message,
      });
    }
  },
);

/**
 * GET /api/orders/:accountId/analytics
 * Get analytics data with product aggregation
 * Query params:
 *   - date_created.from: RFC 3339 format
 *   - date_created.to: RFC 3339 format
 */
router.get(
  "/:accountId/analytics",
  authenticateToken,
  cacheMiddleware(300, (req) => {
    // Cache key includes accountId, userId, and date range
    const { accountId } = req.params;
    const { "date_created.from": dateFrom, "date_created.to": dateTo } =
      req.query;
    return `cache:analytics:${req.user.userId}:${accountId}:${dateFrom || "all"}:${dateTo || "all"}`;
  }),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { "date_created.from": dateFrom, "date_created.to": dateTo } =
        req.query;

      // Verify account belongs to user
      const account = await MLAccount.findOne({
        id: accountId,
        userId: req.user.userId,
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      const query = { accountId, userId: req.user.userId };

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

      // Fetch all orders with full details
      const orders = await Order.find(query).sort("-dateCreated");

      // Aggregate product data
      const productStats = {};
      const categoryStats = {};
      let totalFees = 0;
      let totalMarketplaceFees = 0;
      let totalShippingCost = 0;

      orders.forEach((order) => {
        // Extract real fees from payments
        if (order.payments && order.payments.length > 0) {
          order.payments.forEach((payment) => {
            totalMarketplaceFees += payment.marketplaceFee || 0;
            totalShippingCost += payment.shippingCost || 0;
          });
        }

        if (!order.orderItems || order.orderItems.length === 0) return;

        order.orderItems.forEach((item) => {
          const itemId = item.itemId;
          const categoryId = item.categoryId || "Sem Categoria";

          // Aggregate by product
          if (!productStats[itemId]) {
            productStats[itemId] = {
              itemId: itemId,
              title: item.title || "Produto sem título",
              totalSales: 0,
              quantity: 0,
              revenue: 0,
              fees: 0,
              avgPrice: 0,
            };
          }

          const itemRevenue = (item.unitPrice || 0) * (item.quantity || 0);
          const itemFee = item.saleFee || 0;

          productStats[itemId].totalSales += 1;
          productStats[itemId].quantity += item.quantity || 0;
          productStats[itemId].revenue += itemRevenue;
          productStats[itemId].fees += itemFee;

          totalFees += itemFee;

          // Aggregate by category
          if (!categoryStats[categoryId]) {
            categoryStats[categoryId] = {
              categoryId: categoryId,
              name: categoryId,
              revenue: 0,
              quantity: 0,
              orderCount: 0,
            };
          }

          categoryStats[categoryId].revenue += itemRevenue;
          categoryStats[categoryId].quantity += item.quantity || 0;
        });
      });

      // Calculate average price for each product
      Object.values(productStats).forEach((product) => {
        if (product.quantity > 0) {
          product.avgPrice = product.revenue / product.quantity;
        }
      });

      // Sort products by revenue - Return ALL products (no limit!)
      const topProducts = Object.values(productStats).sort(
        (a, b) => b.revenue - a.revenue,
      );

      // Sort categories by revenue - Return ALL categories (no limit!)
      const topCategories = Object.values(categoryStats).sort(
        (a, b) => b.revenue - a.revenue,
      );

      // Enrich categories with translated names from ML API
      const enrichedCategories =
        await mlCategoryService.enrichCategories(topCategories);

      // Enrich products with COGS data for accurate margin calculation
      const productCosts = await ProductCost.find({
        userId: req.user.userId,
        accountId: req.params.accountId,
      });

      const cogsMap = {};
      productCosts.forEach((cost) => {
        cogsMap[cost.itemId] = cost.cogs;
      });

      // Calculate true profit margin with COGS
      const enrichedProducts = topProducts.map((product) => {
        const cogs = cogsMap[product.itemId] || 0;
        const totalCost = cogs * product.quantity;
        const netRevenue = product.revenue - product.fees;
        const profit = netRevenue - totalCost;
        const trueMargin =
          product.revenue > 0 ? (profit / product.revenue) * 100 : 0;

        return {
          ...product,
          cogs,
          totalCost,
          profit,
          trueMargin,
          // Keep simple margin for comparison (without COGS)
          simpleMargin:
            product.revenue > 0
              ? ((product.revenue - product.fees) / product.revenue) * 100
              : 0,
        };
      });

      res.json({
        success: true,
        data: {
          products: enrichedProducts,
          categories: enrichedCategories,
          fees: {
            totalFees: totalFees,
            marketplaceFees: totalMarketplaceFees,
            shippingCost: totalShippingCost,
          },
          orderCount: orders.length,
        },
      });
    } catch (error) {
      logger.error({
        action: "GET_ANALYTICS_ERROR",
        accountId: req.params.accountId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get analytics data",
        error: error.message,
      });
    }
  },
);

module.exports = router;
