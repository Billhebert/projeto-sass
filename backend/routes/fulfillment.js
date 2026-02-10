/**
 * Fulfillment Routes (Envios Full)
 * Mercado Livre Fulfillment API Integration
 */

const express = require("express");
const router = express.Router();
const logger = require("../logger");
const sdkManager = require("../services/sdk-manager");
const MLAccount = require("../db/models/MLAccount");
const { authenticateToken } = require("../middleware/auth");

// ============================================
// UNIFIED HELPER FUNCTIONS (CORE)
// ============================================

/**
 * Send success response
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
 * Send error response
 */
function handleError(res, statusCode, message, error, action, context = {}) {
  logger.error({
    action,
    error: error.message || error,
    ...context,
  });

  return res.status(statusCode).json({
    success: false,
    error: message,
    details: error.message || error,
  });
}

/**
 * Get ML Account with validation
 */
async function getAndValidateAccount(accountId, userId) {
  const account = await MLAccount.findOne({ id: accountId, userId });
  if (!account) return null;
  if (account.isTokenExpired()) return null;
  return account;
}

/**
 * Fetch inventory stock
 */
async function fetchInventoryStock(inventoryId, accountId, includeConditions = false) {
  try {
    const params = includeConditions ? { include_attributes: "conditions" } : {};
    return await sdkManager.execute(accountId, async (sdk) => {
      return sdk.getFulfillmentInventoryStock(inventoryId, params);
    });
  } catch (error) {
    return null;
  }
}

/**
 * Build operation search params
 */
function buildOperationParams(query, mlUserId) {
  const today = new Date();
  const fifteenDaysAgo = new Date(today);
  fifteenDaysAgo.setDate(today.getDate() - 15);

  const params = {
    seller_id: mlUserId,
    date_from: query.date_from || fifteenDaysAgo.toISOString().split("T")[0],
    date_to: query.date_to || today.toISOString().split("T")[0],
    limit: query.limit || 50,
  };

  if (query.inventory_id) params.inventory_id = query.inventory_id;
  if (query.type) params.type = query.type;
  if (query.shipment_id) params["external_references.shipment_id"] = query.shipment_id;
  if (query.scroll) params.scroll = query.scroll;

  return params;
}

/**
 * Calculate inventory summary stats
 */
function calculateInventorySummary(inventory) {
  return {
    total: inventory.length,
    in_fulfillment: inventory.filter((i) => i.inventory_id).length,
    out_of_stock: inventory.filter((i) => i.available_quantity === 0).length,
    low_stock: inventory.filter(
      (i) => i.available_quantity > 0 && i.available_quantity <= 5,
    ).length,
  };
}

/**
 * Calculate stock aggregates
 */
function aggregateStockInfo(stockInfo) {
  const validStockInfo = stockInfo.filter((s) => s.stock !== null);
  
  const totalAvailable = validStockInfo.reduce(
    (sum, s) => sum + (s.stock?.available_quantity || 0),
    0,
  );
  const totalNotAvailable = validStockInfo.reduce(
    (sum, s) => sum + (s.stock?.not_available_quantity || 0),
    0,
  );
  const totalStock = validStockInfo.reduce(
    (sum, s) => sum + (s.stock?.total || 0),
    0,
  );

  const notAvailableBreakdown = {};
  validStockInfo.forEach((s) => {
    if (s.stock?.not_available_detail) {
      s.stock.not_available_detail.forEach((detail) => {
        notAvailableBreakdown[detail.status] =
          (notAvailableBreakdown[detail.status] || 0) + detail.quantity;
      });
    }
  });

  return {
    total: totalStock,
    available: totalAvailable,
    notAvailable: totalNotAvailable,
    notAvailableBreakdown,
  };
}

/**
 * Count operations by type
 */
function countOperationsByType(operations) {
  const count = {};
  operations.forEach((op) => {
    count[op.type] = (count[op.type] || 0) + 1;
  });
  return count;
}

// ============================================
// FULFILLMENT ENDPOINTS
// ============================================

/**
 * Middleware: Get ML account with validation
 */
async function validateMLAccount(req, res, next) {
  try {
    const { accountId } = req.params;
    const account = await getAndValidateAccount(accountId, req.user.userId);

    if (!account) {
      const statusCode = !account ? 404 : 401;
      const message = !account ? "ML account not found" : "Token expired. Please refresh.";
      return sendSuccess(res, null, message, statusCode);
    }

    req.mlAccount = account;
    next();
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal server error",
      error,
      "VALIDATE_ML_ACCOUNT_ERROR",
      { userId: req.user.userId }
    );
  }
}

/**
 * GET /api/fulfillment/:accountId/inventory/:inventoryId
 */
router.get(
  "/:accountId/inventory/:inventoryId",
  authenticateToken,
  validateMLAccount,
  async (req, res) => {
    try {
      const { inventoryId, accountId } = req.params;

      const stock = await fetchInventoryStock(inventoryId, accountId);
      if (!stock) {
        return sendSuccess(res, null, "Inventory not found or not in fulfillment", 404);
      }

      return sendSuccess(res, { data: stock });
    } catch (error) {
      const statusCode = error.response?.status || 500;
      const message = statusCode === 403 ? "Access denied to this inventory" : "Failed to fetch inventory";
      
      return handleError(
        res,
        statusCode,
        message,
        error,
        "GET_INVENTORY_ERROR",
        { inventoryId: req.params.inventoryId }
      );
    }
  },
);

/**
 * GET /api/fulfillment/:accountId/inventory/:inventoryId/details
 */
router.get(
  "/:accountId/inventory/:inventoryId/details",
  authenticateToken,
  validateMLAccount,
  async (req, res) => {
    try {
      const { inventoryId, accountId } = req.params;

      const stock = await fetchInventoryStock(inventoryId, accountId, true);
      if (!stock) {
        return sendSuccess(res, null, "Failed to fetch inventory details", 500);
      }

      return sendSuccess(res, { data: stock });
    } catch (error) {
      return handleError(
        res,
        error.response?.status || 500,
        "Failed to fetch inventory details",
        error,
        "GET_INVENTORY_DETAILS_ERROR",
        { inventoryId: req.params.inventoryId }
      );
    }
  },
);

/**
 * GET /api/fulfillment/:accountId/operations
 */
router.get(
  "/:accountId/operations",
  authenticateToken,
  validateMLAccount,
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const params = buildOperationParams(req.query, req.mlAccount.mlUserId);

      const operations = await sdkManager.execute(accountId, async (sdk) => {
        return sdk.searchFulfillmentOperations(params);
      });

      return sendSuccess(res, { data: operations });
    } catch (error) {
      const statusCode = error.response?.status || 500;
      const message = statusCode === 400 ? "Invalid search parameters" : "Failed to search operations";

      return handleError(
        res,
        statusCode,
        message,
        error,
        "SEARCH_OPERATIONS_ERROR",
        {}
      );
    }
  },
);

/**
 * GET /api/fulfillment/:accountId/operations/:operationId
 */
router.get(
  "/:accountId/operations/:operationId",
  authenticateToken,
  validateMLAccount,
  async (req, res) => {
    try {
      const { operationId, accountId } = req.params;

      const operation = await sdkManager.execute(accountId, async (sdk) => {
        return sdk.getFulfillmentOperation(operationId);
      });

      return sendSuccess(res, { data: operation });
    } catch (error) {
      const statusCode = error.response?.status || 500;
      const message = statusCode === 404 ? "Operation not found" : "Failed to fetch operation";

      return handleError(
        res,
        statusCode,
        message,
        error,
        "GET_OPERATION_ERROR",
        { operationId: req.params.operationId }
      );
    }
  },
);

/**
 * GET /api/fulfillment/:accountId/items
 */
router.get(
  "/:accountId/items",
  authenticateToken,
  validateMLAccount,
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const itemsResponse = await sdkManager.getAllUserItems(accountId, req.mlAccount.mlUserId, {
        status: "active",
        limit,
        offset,
      });

      const itemIds = itemsResponse.results || [];

      return sendSuccess(res, {
        items: itemIds,
        totalItems: itemIds.length,
        paging: itemsResponse.paging,
      });
    } catch (error) {
      return handleError(
        res,
        error.response?.status || 500,
        "Failed to fetch fulfillment items",
        error,
        "GET_FULFILLMENT_ITEMS_ERROR",
        {}
      );
    }
  },
);

/**
 * GET /api/fulfillment/:accountId/summary
 */
router.get(
  "/:accountId/summary",
  authenticateToken,
  validateMLAccount,
  async (req, res) => {
    try {
      const { accountId } = req.params;

      const itemsResponse = await sdkManager.getAllUserItems(accountId, req.mlAccount.mlUserId, {
        status: "active",
        limit: 100,
      });

      const itemIds = itemsResponse.results || [];

      const fulfillmentItems = itemIds.filter(id => {
        const item = sdkManager.execute(accountId, async (sdk) => sdk.getItem(id));
        return item?.inventory_id;
      });

      const stockPromises = fulfillmentItems.slice(0, 20).map(async (itemId) => {
        const item = await sdkManager.execute(accountId, async (sdk) => sdk.getItem(itemId));
        const stock = await fetchInventoryStock(item.inventory_id, accountId);
        return {
          itemId: item.id,
          title: item.title,
          inventoryId: item.inventory_id,
          stock,
        };
      });

      const stockInfo = await Promise.all(stockPromises);
      const aggregated = aggregateStockInfo(stockInfo);

      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      let recentOperations = [];
      try {
        const opsResponse = await sdkManager.execute(accountId, async (sdk) => {
          return sdk.searchFulfillmentOperations({
            seller_id: req.mlAccount.mlUserId,
            date_from: sevenDaysAgo.toISOString().split("T")[0],
            date_to: today.toISOString().split("T")[0],
            limit: 20,
          });
        });
        recentOperations = opsResponse.results || [];
      } catch (err) {
        logger.warn({ action: "FETCH_OPERATIONS_WARNING", error: err.message });
      }

      const operationsByType = countOperationsByType(recentOperations);

      return sendSuccess(res, {
        overview: {
          totalFulfillmentItems: fulfillmentItems.length,
          totalActiveItems: itemsResponse.paging?.total || itemIds.length,
          fulfillmentPercentage:
            itemIds.length > 0
              ? ((fulfillmentItems.length / itemIds.length) * 100).toFixed(1)
              : 0,
        },
        stock: aggregated,
        items: stockInfo.map((s) => ({
          itemId: s.itemId,
          title: s.title,
          inventoryId: s.inventoryId,
          available: s.stock?.available_quantity || 0,
          notAvailable: s.stock?.not_available_quantity || 0,
          total: s.stock?.total || 0,
          hasError: !s.stock,
        })),
        recentActivity: {
          operationsCount: recentOperations.length,
          operationsByType,
          lastOperations: recentOperations.slice(0, 5).map((op) => ({
            id: op.id,
            type: op.type,
            inventoryId: op.inventory_id,
            dateCreated: op.date_created,
            detail: op.detail,
          })),
        },
      });
    } catch (error) {
      return handleError(
        res,
        error.response?.status || 500,
        "Failed to fetch fulfillment summary",
        error,
        "GET_SUMMARY_ERROR",
        {}
      );
    }
  },
);

/**
 * GET /api/fulfillment/:accountId/items/:itemId/stock
 */
router.get(
  "/:accountId/items/:itemId/stock",
  authenticateToken,
  validateMLAccount,
  async (req, res) => {
    try {
      const { itemId, accountId } = req.params;

      const item = await sdkManager.getItem(accountId, itemId);
      if (!item) {
        return sendSuccess(res, null, "Item not found", 404);
      }

      const inventoryId = item.inventory_id;
      if (!inventoryId) {
        return sendSuccess(res, {
          item: {
            id: item.id,
            title: item.title,
            logisticType: item.shipping?.logistic_type,
          },
        }, "This item is not in fulfillment", 400);
      }

      const stock = await fetchInventoryStock(inventoryId, accountId, true);

      return sendSuccess(res, {
        item: {
          id: item.id,
          title: item.title,
          price: item.price,
          thumbnail: item.thumbnail,
          permalink: item.permalink,
        },
        inventoryId,
        stock,
      });
    } catch (error) {
      const statusCode = error.response?.status || 500;
      const message = statusCode === 404 ? "Item not found" : "Failed to fetch stock";

      return handleError(
        res,
        statusCode,
        message,
        error,
        "GET_ITEM_STOCK_ERROR",
        { itemId: req.params.itemId }
      );
    }
  },
);

/**
 * GET /api/fulfillment/:accountId/inventory
 */
router.get(
  "/:accountId/inventory",
  authenticateToken,
  validateMLAccount,
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { all, limit = 100, offset = 0 } = req.query;

      const itemsResponse = await sdkManager.getAllUserItems(accountId, req.mlAccount.mlUserId, {
        status: "active",
        limit: all === "true" ? 100 : limit,
        offset: all === "true" ? 0 : offset,
      });

      const itemIds = itemsResponse.results || [];

      const inventory = itemIds.slice(0, 100).map(id => {
        const item = sdkManager.execute(accountId, async (sdk) => sdk.getItem(id));
        return {
          id: item.id,
          title: item.title,
          price: item.price,
          currency_id: item.currency_id,
          thumbnail: item.thumbnail,
          available_quantity: item.available_quantity,
          sold_quantity: item.sold_quantity,
          status: item.status,
          inventory_id: item.inventory_id,
          logistic_type: item.shipping?.logistic_type,
          in_fulfillment: !!item.inventory_id,
        };
      });

      const summary = calculateInventorySummary(inventory);

      return sendSuccess(res, {
        inventory,
        paging: { total: inventory.length, limit: parseInt(limit), offset: parseInt(offset) },
        summary,
      });
    } catch (error) {
      logger.warn({ action: "FETCH_INVENTORY_WARNING", error: error.message });

      return sendSuccess(res, {
        inventory: [],
        paging: { total: 0, offset: 0, limit: 100 },
        summary: { total: 0, in_fulfillment: 0, out_of_stock: 0, low_stock: 0 },
        fallback: true,
      });
    }
  },
);

/**
 * GET /api/fulfillment/:accountId/shipments
 */
router.get(
  "/:accountId/shipments",
  authenticateToken,
  validateMLAccount,
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      const orders = await sdkManager.searchOrders(accountId, {
        seller: req.mlAccount.mlUserId,
        limit,
        offset,
        sort: "date_desc",
      });

      const orderResults = orders.results || [];

      const shipments = await Promise.all(
        orderResults.slice(0, 10).map(async (order) => {
          if (!order.shipping?.id) return null;
          try {
            const shipRes = await sdkManager.execute(accountId, async (sdk) => {
              return sdk.getShipment(order.shipping.id);
            });
            return {
              id: shipRes.id,
              order_id: order.id,
              status: shipRes.status,
              substatus: shipRes.substatus,
              date_created: shipRes.date_created,
              receiver_address: shipRes.receiver_address,
              logistic_type: shipRes.logistic_type,
            };
          } catch (e) {
            return null;
          }
        })
      );

      return sendSuccess(res, {
        shipments: shipments.filter((s) => s !== null),
        paging: orders.paging,
      });
    } catch (error) {
      logger.warn({ action: "FETCH_SHIPMENTS_WARNING", error: error.message });

      return sendSuccess(res, {
        shipments: [],
        paging: { total: 0, offset: 0, limit: 20 },
        fallback: true,
      });
    }
  },
);

/**
 * GET /api/fulfillment/:accountId/stats
 */
router.get(
  "/:accountId/stats",
  authenticateToken,
  validateMLAccount,
  async (req, res) => {
    try {
      const { accountId } = req.params;

      const itemsResponse = await sdkManager.getAllUserItems(accountId, req.mlAccount.mlUserId, {
        status: "active",
        limit: 100,
      });

      const itemIds = itemsResponse.results || [];

      const items = await Promise.all(
        itemIds.slice(0, 100).map(async (id) => {
          try {
            return await sdkManager.getItem(accountId, id);
          } catch (e) {
            return null;
          }
        })
      );

      const validItems = items.filter(i => i !== null);

      const stats = {
        totalItems: validItems.length,
        inFulfillment: validItems.filter((i) => i.inventory_id).length,
        outOfStock: validItems.filter((i) => i.available_quantity === 0).length,
        lowStock: validItems.filter(
          (i) => i.available_quantity > 0 && i.available_quantity <= 5,
        ).length,
        totalStock: validItems.reduce(
          (sum, i) => sum + (i.available_quantity || 0),
          0,
        ),
      };

      return sendSuccess(res, { stats });
    } catch (error) {
      logger.warn({ action: "FETCH_STATS_WARNING", error: error.message });

      return sendSuccess(res, {
        stats: {
          totalItems: 0,
          inFulfillment: 0,
          outOfStock: 0,
          lowStock: 0,
          totalStock: 0,
        },
        fallback: true,
      });
    }
  },
);

module.exports = router;
