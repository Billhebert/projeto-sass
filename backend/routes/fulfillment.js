/**
 * Fulfillment Routes (Envios Full)
 * Mercado Livre Fulfillment API Integration
 *
 * Endpoints:
 * - GET /api/fulfillment/:accountId/inventory/:inventoryId - Get inventory stock info
 * - GET /api/fulfillment/:accountId/inventory/:inventoryId/details - Get stock with conditions
 * - GET /api/fulfillment/:accountId/operations - Search stock operations
 * - GET /api/fulfillment/:accountId/operations/:operationId - Get operation details
 * - GET /api/fulfillment/:accountId/items - Get all fulfillment items for seller
 * - GET /api/fulfillment/:accountId/summary - Get fulfillment summary/dashboard
 */

const express = require("express");
const router = express.Router();
const axios = require("axios");
const logger = require("../logger");
const sdkManager = require("../services/sdk-manager");
const MLAccount = require("../db/models/MLAccount");
const { authenticateToken } = require("../middleware/auth");

const ML_API_BASE = "https://api.mercadolibre.com";

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
 * Build authorization headers
 */
function buildHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
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
 * Fetch item details
 */
async function fetchItem(itemId, headers) {
  try {
    const response = await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers });
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Fetch inventory stock
 */
async function fetchInventoryStock(inventoryId, headers, includeConditions = false) {
  try {
    const params = includeConditions ? { include_attributes: "conditions" } : {};
    const response = await axios.get(
      `${ML_API_BASE}/inventories/${inventoryId}/stock/fulfillment`,
      { headers, params }
    );
    return response.data;
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
 * Fetch items with fulfillment details
 */
async function fetchFulfillmentItems(itemIds, headers, limit = 50) {
  const itemDetails = await Promise.all(
    itemIds.map((id) =>
      axios
        .get(`${ML_API_BASE}/items/${id}`, { headers })
        .catch(() => null)
    )
  );

  return itemDetails
    .filter((r) => r !== null && r.data.inventory_id)
    .map((r) => ({
      id: r.data.id,
      title: r.data.title,
      price: r.data.price,
      currencyId: r.data.currency_id,
      thumbnail: r.data.thumbnail,
      permalink: r.data.permalink,
      status: r.data.status,
      availableQuantity: r.data.available_quantity,
      soldQuantity: r.data.sold_quantity,
      inventoryId: r.data.inventory_id,
      logisticType: r.data.shipping?.logistic_type,
      variations: r.data.variations?.map((v) => ({
        id: v.id,
        inventoryId: v.inventory_id,
        attributeCombinations: v.attribute_combinations,
        availableQuantity: v.available_quantity,
      })),
    }));
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

/**
 * Fetch all items with pagination
 */
async function fetchAllItems(headers, mlUserId, fetchAll = false) {
  let itemIds = [];

  if (fetchAll) {
    let currentOffset = 0;
    const batchSize = 50;

    while (true) {
      const response = await axios.get(
        `${ML_API_BASE}/users/${mlUserId}/items/search`,
        {
          headers,
          params: { status: "active", limit: batchSize, offset: currentOffset },
        },
      );

      const batch = response.data.results || [];
      if (batch.length === 0) break;

      itemIds.push(...batch);
      currentOffset += batchSize;

      if (currentOffset >= (response.data.paging?.total || 0)) break;
    }
  } else {
    const response = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/items/search`,
      {
        headers,
        params: { status: "active", limit: 100, offset: 0 },
      },
    );
    itemIds = response.data.results || [];
  }

  return itemIds;
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
      const { inventoryId } = req.params;
      const { accessToken } = req.mlAccount;
      const headers = buildHeaders(accessToken);

      const stock = await fetchInventoryStock(inventoryId, headers);
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
      const { inventoryId } = req.params;
      const { accessToken } = req.mlAccount;
      const headers = buildHeaders(accessToken);

      const stock = await fetchInventoryStock(inventoryId, headers, true);
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
      const { accessToken, mlUserId } = req.mlAccount;
      const headers = buildHeaders(accessToken);
      const params = buildOperationParams(req.query, mlUserId);

      const response = await axios.get(
        `${ML_API_BASE}/stock/fulfillment/operations/search`,
        { headers, params }
      );

      return sendSuccess(res, { data: response.data });
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
      const { operationId } = req.params;
      const { accessToken } = req.mlAccount;
      const headers = buildHeaders(accessToken);

      const response = await axios.get(
        `${ML_API_BASE}/stock/fulfillment/operations/${operationId}`,
        { headers }
      );

      return sendSuccess(res, { data: response.data });
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
      const { accessToken, mlUserId } = req.mlAccount;
      const { limit = 50, offset = 0 } = req.query;
      const headers = buildHeaders(accessToken);

      const response = await axios.get(
        `${ML_API_BASE}/users/${mlUserId}/items/search`,
        {
          headers,
          params: { status: "active", limit, offset },
        },
      );

      const itemIds = response.data.results || [];
      if (itemIds.length === 0) {
        return sendSuccess(res, {
          items: [],
          paging: response.data.paging,
        });
      }

      const fulfillmentItems = await fetchFulfillmentItems(itemIds, headers);

      return sendSuccess(res, {
        items: fulfillmentItems,
        totalItems: itemIds.length,
        fulfillmentItems: fulfillmentItems.length,
        paging: response.data.paging,
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
      const { accessToken, mlUserId } = req.mlAccount;
      const headers = buildHeaders(accessToken);

      // Get items
      const itemsResponse = await axios.get(
        `${ML_API_BASE}/users/${mlUserId}/items/search`,
        {
          headers,
          params: { status: "active", limit: 100 },
        },
      );

      const itemIds = itemsResponse.data.results || [];
      const itemDetails = await Promise.all(
        itemIds.slice(0, 50).map((id) =>
          axios.get(`${ML_API_BASE}/items/${id}`, { headers }).catch(() => null)
        )
      );

      const fulfillmentItems = itemDetails
        .filter((r) => r !== null && r.data.inventory_id)
        .map((r) => r.data);

      // Get stock for fulfillment items
      const stockPromises = fulfillmentItems.slice(0, 20).map(async (item) => {
        const stock = await fetchInventoryStock(item.inventory_id, headers);
        return {
          itemId: item.id,
          title: item.title,
          inventoryId: item.inventory_id,
          stock,
        };
      });

      const stockInfo = await Promise.all(stockPromises);
      const aggregated = aggregateStockInfo(stockInfo);

      // Get recent operations
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      let recentOperations = [];
      try {
        const opsResponse = await axios.get(
          `${ML_API_BASE}/stock/fulfillment/operations/search`,
          {
            headers,
            params: {
              seller_id: mlUserId,
              date_from: sevenDaysAgo.toISOString().split("T")[0],
              date_to: today.toISOString().split("T")[0],
              limit: 20,
            },
          },
        );
        recentOperations = opsResponse.data.results || [];
      } catch (err) {
        logger.warn({ action: "FETCH_OPERATIONS_WARNING", error: err.message });
      }

      const operationsByType = countOperationsByType(recentOperations);

      return sendSuccess(res, {
        overview: {
          totalFulfillmentItems: fulfillmentItems.length,
          totalActiveItems: itemsResponse.data.paging?.total || itemIds.length,
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
      const { itemId } = req.params;
      const { accessToken } = req.mlAccount;
      const headers = buildHeaders(accessToken);

      const item = await fetchItem(itemId, headers);
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

      const stock = await fetchInventoryStock(inventoryId, headers, true);

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
      const { accessToken, mlUserId } = req.mlAccount;
      const { all, limit = 100, offset = 0 } = req.query;
      const headers = buildHeaders(accessToken);

      const itemIds = await fetchAllItems(headers, mlUserId, all === "true");

      if (itemIds.length === 0) {
        return sendSuccess(res, {
          inventory: [],
          paging: { total: 0, limit: parseInt(limit), offset: parseInt(offset) },
        });
      }

      const itemDetails = await Promise.all(
        itemIds.slice(0, 100).map((id) =>
          axios.get(`${ML_API_BASE}/items/${id}`, { headers }).catch(() => null)
        )
      );

      const inventory = itemDetails
        .filter((r) => r !== null)
        .map((r) => ({
          id: r.data.id,
          title: r.data.title,
          price: r.data.price,
          currency_id: r.data.currency_id,
          thumbnail: r.data.thumbnail,
          available_quantity: r.data.available_quantity,
          sold_quantity: r.data.sold_quantity,
          status: r.data.status,
          inventory_id: r.data.inventory_id,
          logistic_type: r.data.shipping?.logistic_type,
          in_fulfillment: !!r.data.inventory_id,
        }));

      const summary = calculateInventorySummary(inventory);

      return sendSuccess(res, {
        inventory,
        paging: { total: inventory.length, limit: parseInt(limit), offset: parseInt(offset) },
        summary,
      });
    } catch (error) {
      logger.warn({ action: "FETCH_INVENTORY_WARNING", error: error.message });

      // Return fallback
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
      const { accessToken, mlUserId } = req.mlAccount;
      const { limit = 100, offset = 0 } = req.query;
      const headers = buildHeaders(accessToken);

      const ordersResponse = await axios.get(`${ML_API_BASE}/orders/search`, {
        headers,
        params: { seller: mlUserId, limit, offset, sort: "date_desc" },
      });

      const orders = ordersResponse.data.results || [];

      const shipments = await Promise.all(
        orders.slice(0, 10).map(async (order) => {
          if (!order.shipping?.id) return null;
          try {
            const shipRes = await axios.get(
              `${ML_API_BASE}/shipments/${order.shipping.id}`,
              { headers }
            );
            return {
              id: shipRes.data.id,
              order_id: order.id,
              status: shipRes.data.status,
              substatus: shipRes.data.substatus,
              date_created: shipRes.data.date_created,
              receiver_address: shipRes.data.receiver_address,
              logistic_type: shipRes.data.logistic_type,
            };
          } catch (e) {
            return null;
          }
        })
      );

      return sendSuccess(res, {
        shipments: shipments.filter((s) => s !== null),
        paging: ordersResponse.data.paging,
      });
    } catch (error) {
      logger.warn({ action: "FETCH_SHIPMENTS_WARNING", error: error.message });

      // Return fallback
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
      const { accessToken, mlUserId } = req.mlAccount;
      const headers = buildHeaders(accessToken);

      const itemsResponse = await axios.get(
        `${ML_API_BASE}/users/${mlUserId}/items/search`,
        {
          headers,
          params: { status: "active", limit: 100 },
        },
      );

      const itemIds = itemsResponse.data.results || [];

      const itemDetails = await Promise.all(
        itemIds.slice(0, 100).map((id) =>
          axios.get(`${ML_API_BASE}/items/${id}`, { headers }).catch(() => null)
        )
      );

      const items = itemDetails.filter((r) => r !== null).map((r) => r.data);

      const stats = {
        totalItems: items.length,
        inFulfillment: items.filter((i) => i.inventory_id).length,
        outOfStock: items.filter((i) => i.available_quantity === 0).length,
        lowStock: items.filter(
          (i) => i.available_quantity > 0 && i.available_quantity <= 5,
        ).length,
        totalStock: items.reduce(
          (sum, i) => sum + (i.available_quantity || 0),
          0,
        ),
      };

      return sendSuccess(res, { stats });
    } catch (error) {
      logger.warn({ action: "FETCH_STATS_WARNING", error: error.message });

      // Return fallback
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