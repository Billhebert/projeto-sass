/**
 * Items Routes - Refatorado com SDK Completa
 * Full item/listing management usando a SDK do Mercado Livre
 *
 * GET    /api/items/:accountId                   - List items
 * GET    /api/items/:accountId/:itemId           - Get item details
 * POST   /api/items/:accountId                   - Create new item
 * PUT    /api/items/:accountId/:itemId           - Update item
 * PUT    /api/items/:accountId/:itemId/description - Update description
 * PUT    /api/items/:accountId/:itemId/pictures  - Update pictures
 * PUT    /api/items/:accountId/:itemId/status    - Change status (pause/activate)
 * DELETE /api/items/:accountId/:itemId           - Close/delete item
 * POST   /api/items/:accountId/:itemId/relist    - Relist item
 */

const express = require("express");
const logger = require("../logger");
const { authenticateToken } = require("../middleware/auth");
const { validateMLToken } = require("../middleware/ml-token-validation");
const sdkManager = require("../services/sdk-manager");
const Product = require("../db/models/Product");

const router = express.Router();

// ============================================================================
// CORE HELPERS - Used across all endpoints
// ============================================================================

/**
 * Handle and log errors with consistent response format
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} message - Error message to send to client
 * @param {Error} error - Original error object
 * @param {Object} context - Additional logging context
 */
const handleError = (res, statusCode = 500, message, error = null, context = {}) => {
  logger.error({
    action: context.action || 'UNKNOWN_ERROR',
    error: error?.message || message,
    statusCode,
    ...context,
  });

  const response = { success: false, message };
  if (error?.message) response.error = error.message;
  if (context.details) response.details = context.details;
  res.status(statusCode).json(response);
};

/**
 * Send success response with consistent format
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = { success: true, data };
  if (message) response.message = message;
  res.status(statusCode).json(response);
};

/**
 * Validate item status against allowed values
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid
 */
const isValidItemStatus = (status) => {
  return ['active', 'paused', 'closed'].includes(status);
};

// ============================================================================
// ROUTE-SPECIFIC HELPERS
// ============================================================================

/**
 * Fetch items with details using batch fetching
 * @param {string} accountId - Account ID
 * @param {string[]} itemIds - Array of item IDs
 * @param {number} limit - Limit of items to fetch (default: 20)
 * @returns {Promise<Object[]>} Items with details
 */
const fetchItemsWithDetails = async (accountId, itemIds, limit = 20) => {
  const itemsPromises = itemIds
    .slice(0, limit)
    .map((itemId) =>
      sdkManager.getItem(accountId, itemId).catch(() => null),
    );

  const items = await Promise.all(itemsPromises);
  return items
    .filter((item) => item !== null)
    .map((item) => item.data);
};

/**
 * Fetch all items with auto-pagination
 * @param {string} accountId - Account ID
 * @param {string} mlUserId - ML user ID
 * @param {Object} filters - Query filters (status, etc)
 * @returns {Promise<Object[]>} All items with details
 */
const fetchAllItemsWithPagination = async (accountId, mlUserId, filters = {}) => {
  let allItems = [];
  let currentOffset = 0;
  const batchSize = 50;

  while (true) {
    const params = {
      limit: batchSize,
      offset: currentOffset,
      ...filters,
    };

    const result = await sdkManager.getItemsByUser(
      accountId,
      mlUserId,
      params,
    );

    const itemIds = result.data.results || [];
    if (itemIds.length === 0) break;

    // Fetch details in batches of 20
    for (let i = 0; i < itemIds.length; i += 20) {
      const batch = itemIds.slice(i, i + 20);
      const itemsData = await Promise.allSettled(
        batch.map((itemId) => sdkManager.getItem(accountId, itemId)),
      );

      const successfulItems = itemsData
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value.data);

      allItems.push(...successfulItems);
    }

    currentOffset += batchSize;

    // Stop if we fetched everything
    const total = result.data.paging?.total || 0;
    if (currentOffset >= total) break;
  }

  return allItems;
};

/**
 * Save product to database (with error handling)
 * @param {Object} productData - Product data to save
 * @returns {Promise<void>}
 */
const saveProductToDatabase = async (productData) => {
  try {
    await Product.create(productData);
  } catch (dbError) {
    logger.warn({
      action: "SAVE_PRODUCT_TO_DB_ERROR",
      error: dbError.message,
    });
    // Don't throw - DB errors shouldn't fail the API request
  }
};

/**
 * Update product in database (with error handling)
 * @param {string} itemId - Item ID
 * @param {string} accountId - Account ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<void>}
 */
const updateProductInDatabase = async (itemId, accountId, updates) => {
  try {
    await Product.findOneAndUpdate(
      { id: itemId, accountId },
      { $set: { ...updates, updatedAt: new Date() } },
    );
  } catch (dbError) {
    logger.warn({
      action: "UPDATE_PRODUCT_DB_ERROR",
      error: dbError.message,
    });
    // Don't throw - DB errors shouldn't fail the API request
  }
};

/**
 * Build list items response
 * @param {Object[]} items - Items array
 * @param {Object} paging - Paging info
 * @param {string} sellerId - Seller ID
 * @returns {Object} Formatted response data
 */
const buildListItemsResponse = (items, paging, sellerId) => ({
  items,
  paging: paging || { total: 0 },
  seller_id: sellerId,
});

/**
 * GET /api/items/:accountId
 * List items from ML API
 * Query params:
 *   - all=true: Fetch ALL items with auto-pagination (no limits)
 *   - limit: Items per page (default 50)
 *   - offset: Pagination offset (default 0)
 *   - status: Filter by status
 */
router.get(
  "/:accountId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { all, limit = 50, offset = 0, status } = req.query;
      const account = req.mlAccount;

      logger.info({
        action: "LIST_ITEMS_REQUEST",
        accountId,
        all: all === "true",
        limit,
        offset,
        status,
      });

      // UNLIMITED MODE: Fetch ALL items with auto-pagination
      if (all === "true") {
        const filters = status ? { status } : {};
        const allItems = await fetchAllItemsWithPagination(accountId, account.mlUserId, filters);

        logger.info({
          action: "LIST_ALL_ITEMS_SUCCESS",
          accountId,
          totalItems: allItems.length,
        });

        return sendSuccess(res, {
          items: allItems,
          paging: {
            total: allItems.length,
            limit: allItems.length,
            offset: 0,
          },
          seller_id: account.mlUserId,
        });
      }

      // NORMAL PAGINATION MODE
      const params = {
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
      if (status) params.status = status;

      const result = await sdkManager.getItemsByUser(
        accountId,
        account.mlUserId,
        params,
      );

      logger.info({
        action: "SDK_RESULT_DEBUG",
        accountId,
        resultStatus: result.status,
        resultDataKeys: Object.keys(result.data || {}),
        resultsLength: (result.data?.results || []).length,
        rawResults: result.data?.results?.slice(0, 3),
      });

      const itemIds = result.data.results || [];
      const validItems = await fetchItemsWithDetails(accountId, itemIds, 20);

      logger.info({
        action: "LIST_ITEMS_SUCCESS",
        accountId,
        count: validItems.length,
      });

      sendSuccess(res, buildListItemsResponse(validItems, result.data.paging, result.data.seller_id));
    } catch (error) {
      handleError(res, error.statusCode || 500, "Failed to list items", error, {
        action: "LIST_ITEMS_ERROR",
        accountId: req.params.accountId,
      });
    }
  },
);

/**
 * GET /api/items/:accountId/:itemId
 * Get item details
 */
router.get(
  "/:accountId/:itemId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const { includeDescription = "true" } = req.query;

      logger.info({
        action: "GET_ITEM_REQUEST",
        accountId,
        itemId,
        includeDescription,
      });

      let itemData, descriptionData;

      if (includeDescription === "true") {
        const result = await sdkManager.getItemWithDescription(accountId, itemId);
        [itemData, descriptionData] = result;
      } else {
        itemData = await sdkManager.getItem(accountId, itemId);
      }

      logger.info({
        action: "GET_ITEM_SUCCESS",
        accountId,
        itemId,
      });

      sendSuccess(res, {
        item: itemData.data,
        description: descriptionData?.data || null,
      });
    } catch (error) {
      handleError(res, error.statusCode || 500, "Failed to get item", error, {
        action: "GET_ITEM_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
      });
    }
  },
);

/**
 * POST /api/items/:accountId
 * Create new item
 */
router.post(
  "/:accountId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const itemData = req.body;

      logger.info({
        action: "CREATE_ITEM_REQUEST",
        accountId,
        title: itemData.title,
      });

      const result = await sdkManager.createItem(accountId, itemData);

      logger.info({
        action: "CREATE_ITEM_SUCCESS",
        accountId,
        itemId: result.data.id,
      });

      // Save to local database
      await saveProductToDatabase({
        id: result.data.id,
        accountId,
        userId: req.user.userId,
        title: result.data.title,
        price: result.data.price,
        status: result.data.status,
        categoryId: result.data.category_id,
        mlData: result.data,
      });

      sendSuccess(res, result.data, undefined, 201);
    } catch (error) {
      handleError(res, error.statusCode || 500, "Failed to create item", error, {
        action: "CREATE_ITEM_ERROR",
        accountId: req.params.accountId,
        details: error.apiError || null,
      });
    }
  },
);

/**
 * PUT /api/items/:accountId/:itemId
 * Update item
 */
router.put(
  "/:accountId/:itemId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const updates = req.body;

      logger.info({
        action: "UPDATE_ITEM_REQUEST",
        accountId,
        itemId,
        updates: Object.keys(updates),
      });

      const result = await sdkManager.updateItem(accountId, itemId, updates);

      logger.info({
        action: "UPDATE_ITEM_SUCCESS",
        accountId,
        itemId,
      });

      await updateProductInDatabase(itemId, accountId, updates);

      sendSuccess(res, result.data);
    } catch (error) {
      handleError(res, error.statusCode || 500, "Failed to update item", error, {
        action: "UPDATE_ITEM_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
      });
    }
  },
);

/**
 * PUT /api/items/:accountId/:itemId/description
 * Update item description
 */
router.put(
  "/:accountId/:itemId/description",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const { plain_text } = req.body;

      logger.info({
        action: "UPDATE_DESCRIPTION_REQUEST",
        accountId,
        itemId,
      });

      const sdk = await sdkManager.getSDK(accountId);
      const result = await sdk.items.updateDescription(itemId, { plain_text });

      logger.info({
        action: "UPDATE_DESCRIPTION_SUCCESS",
        accountId,
        itemId,
      });

      sendSuccess(res, result.data);
    } catch (error) {
      handleError(res, error.statusCode || 500, "Failed to update description", error, {
        action: "UPDATE_DESCRIPTION_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
      });
    }
  },
);

/**
 * PUT /api/items/:accountId/:itemId/status
 * Change item status (pause/activate)
 */
router.put(
  "/:accountId/:itemId/status",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const { status } = req.body;

      if (!isValidItemStatus(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be: active, paused, or closed",
        });
      }

      logger.info({
        action: "CHANGE_ITEM_STATUS_REQUEST",
        accountId,
        itemId,
        newStatus: status,
      });

      const result = await sdkManager.updateItem(accountId, itemId, { status });

      logger.info({
        action: "CHANGE_ITEM_STATUS_SUCCESS",
        accountId,
        itemId,
        newStatus: status,
      });

      sendSuccess(res, result.data);
    } catch (error) {
      handleError(res, error.statusCode || 500, "Failed to change item status", error, {
        action: "CHANGE_ITEM_STATUS_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
      });
    }
  },
);

/**
 * DELETE /api/items/:accountId/:itemId
 * Close/delete item
 */
router.delete(
  "/:accountId/:itemId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;

      logger.info({
        action: "DELETE_ITEM_REQUEST",
        accountId,
        itemId,
      });

      const result = await sdkManager.deleteItem(accountId, itemId);

      logger.info({
        action: "DELETE_ITEM_SUCCESS",
        accountId,
        itemId,
      });

      await updateProductInDatabase(itemId, accountId, { status: "closed" });

      sendSuccess(res, result.data);
    } catch (error) {
      handleError(res, error.statusCode || 500, "Failed to delete item", error, {
        action: "DELETE_ITEM_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
      });
    }
  },
);

/**
 * POST /api/items/:accountId/:itemId/relist
 * Relist item
 */
router.post(
  "/:accountId/:itemId/relist",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const relistData = req.body;

      logger.info({
        action: "RELIST_ITEM_REQUEST",
        accountId,
        itemId,
      });

      const sdk = await sdkManager.getSDK(accountId);
      const result = await sdk.items.relistItem(itemId, relistData);

      logger.info({
        action: "RELIST_ITEM_SUCCESS",
        accountId,
        oldItemId: itemId,
        newItemId: result.data.id,
      });

      sendSuccess(res, result.data);
    } catch (error) {
      handleError(res, error.statusCode || 500, "Failed to relist item", error, {
        action: "RELIST_ITEM_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
      });
    }
  },
);

/**
 * GET /api/items/:accountId/:itemId/visits
 * Get item visits/views statistics
 */
router.get(
  "/:accountId/:itemId/visits",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;

      logger.info({
        action: "GET_ITEM_VISITS_REQUEST",
        accountId,
        itemId,
      });

      const sdk = await sdkManager.getSDK(accountId);
      const result = await sdk.visits.getItemVisits(itemId);

      logger.info({
        action: "GET_ITEM_VISITS_SUCCESS",
        accountId,
        itemId,
      });

      sendSuccess(res, result.data);
    } catch (error) {
      handleError(res, error.statusCode || 500, "Failed to get item visits", error, {
        action: "GET_ITEM_VISITS_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
      });
    }
  },
);

module.exports = router;
