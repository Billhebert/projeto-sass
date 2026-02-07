/**
 * User Products Routes (Estoque Multi-Origem / Fulfillment)
 * Manage user products and inventory across multiple locations
 * 
 * API Mercado Livre:
 * - GET /users/{user_id}/products - List user products
 * - GET /products/{product_id} - Get product details
 * - GET /users/{user_id}/items/{item_id}/fulfillment - Fulfillment info
 * - PUT /items/{item_id}/inventory - Update inventory
 * - GET /users/{user_id}/warehouses - Get warehouses
 * 
 * Routes:
 * GET    /api/user-products/:accountId                          - List user products
 * GET    /api/user-products/:accountId/product/:productId       - Get product details
 * GET    /api/user-products/:accountId/inventory/:itemId        - Get inventory details
 * PUT    /api/user-products/:accountId/inventory/:itemId        - Update inventory
 * GET    /api/user-products/:accountId/warehouses               - List warehouses
 * GET    /api/user-products/:accountId/fulfillment/:itemId      - Get fulfillment info
 * POST   /api/user-products/:accountId/fulfillment/:itemId      - Opt-in to fulfillment
 */

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const { handleError, sendSuccess, buildHeaders } = require('../middleware/response-helpers');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * Get and validate ML account from request
 * NOTE: Custom implementation (differs from centralized version)
 * @param {Object} req - Express request object
 * @param {string} accountId - Account ID from params
 * @returns {Object} ML account object
 */
const getAndValidateAccount = async (req, accountId) => {
  const account = req.mlAccount;
  if (!account) {
    throw new Error('ML account not found');
  }
  return account;
};

// ============================================================================
// ROUTE-SPECIFIC HELPERS
// ============================================================================

/**
 * Fetch product details for each item with inventory info
 * @param {string[]} itemIds - Array of item IDs
 * @param {Object} headers - API headers
 * @param {number} limit - Limit of items to fetch (default: 20)
 * @returns {Promise<Object[]>} Array of products with details
 */
const fetchProductsWithDetails = async (itemIds, headers, limit = 20) => {
  const products = await Promise.all(
    itemIds.slice(0, limit).map(async (itemId) => {
      try {
        const [itemRes, inventoryRes] = await Promise.all([
          axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
          axios.get(`${ML_API_BASE}/items/${itemId}/stock`, { headers }).catch(() => ({ data: null })),
        ]);

        return {
          item_id: itemId,
          title: itemRes.data.title,
          status: itemRes.data.status,
          available_quantity: itemRes.data.available_quantity,
          sold_quantity: itemRes.data.sold_quantity,
          price: itemRes.data.price,
          currency_id: itemRes.data.currency_id,
          catalog_product_id: itemRes.data.catalog_product_id,
          inventory: inventoryRes.data,
          variations: itemRes.data.variations?.length || 0,
          shipping: itemRes.data.shipping,
        };
      } catch (err) {
        return null;
      }
    })
  );

  return products.filter(p => p !== null);
};

/**
 * Build inventory summary from item and stock data
 * @param {string} itemId - Item ID
 * @param {Object} itemData - Item data from ML API
 * @param {Object} stockData - Stock data from ML API
 * @param {Object} warehouseData - Warehouse data from ML API
 * @returns {Object} Inventory summary
 */
const buildInventorySummary = (itemId, itemData, stockData, warehouseData) => ({
  item_id: itemId,
  title: itemData.title,
  available_quantity: itemData.available_quantity,
  sold_quantity: itemData.sold_quantity,
  initial_quantity: itemData.initial_quantity,
  stock_info: stockData,
  warehouses: warehouseData,
  variations: itemData.variations?.map(v => ({
    id: v.id,
    available_quantity: v.available_quantity,
    sold_quantity: v.sold_quantity,
    attribute_combinations: v.attribute_combinations,
  })) || [],
});

/**
 * Build fulfillment info response
 * @param {string} itemId - Item ID
 * @param {Object} itemData - Item data from ML API
 * @param {Object} fulfillmentData - Fulfillment data from ML API
 * @returns {Object} Fulfillment info
 */
const buildFulfillmentInfo = (itemId, itemData, fulfillmentData) => {
  const isFulfillment = itemData.shipping?.logistic_type === 'fulfillment';
  return {
    item_id: itemId,
    title: itemData.title,
    is_fulfillment: isFulfillment,
    logistic_type: itemData.shipping?.logistic_type,
    fulfillment_info: fulfillmentData,
    shipping: itemData.shipping,
  };
};

/**
 * Build stock locations response
 * @param {string} itemId - Item ID
 * @param {Object} itemData - Item data from ML API
 * @param {Object[]} locationsData - Warehouse locations data
 * @returns {Object} Stock locations summary
 */
const buildStockLocations = (itemId, itemData, locationsData) => ({
  item_id: itemId,
  title: itemData.title,
  total_available: itemData.available_quantity,
  locations: locationsData || [],
});

/**
 * Fetch all items with stock information
 * @param {Object} headers - API headers
 * @param {string} mlUserId - ML user ID
 * @param {number} limit - Limit of items (default: 100)
 * @returns {Promise<Object[]>} Items with stock info
 */
const fetchItemsWithStock = async (headers, mlUserId, limit = 100) => {
  const response = await axios.get(
    `${ML_API_BASE}/users/${mlUserId}/items/search`,
    {
      headers,
      params: {
        status: 'active',
        limit,
      },
    }
  );

  const itemIds = response.data.results || [];

  const itemsWithStock = await Promise.all(
    itemIds.map(async (itemId) => {
      try {
        const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers });
        return {
          item_id: itemId,
          title: itemRes.data.title,
          available_quantity: itemRes.data.available_quantity,
          status: itemRes.data.status,
        };
      } catch (err) {
        return null;
      }
    })
  );

  return itemsWithStock.filter(item => item !== null);
};

/**
 * Filter items by low stock threshold
 * @param {Object[]} items - Array of items with stock
 * @param {number} threshold - Stock threshold
 * @returns {Object[]} Filtered and sorted items
 */
const filterLowStockItems = (items, threshold) => {
  return items
    .filter(item => item.available_quantity <= parseInt(threshold))
    .sort((a, b) => a.available_quantity - b.available_quantity);
};

/**
 * GET /api/user-products/:accountId
 * List all products for user
 */
router.get('/:accountId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 50, offset = 0, status } = req.query;
    const account = await getAndValidateAccount(req, accountId);

    const headers = buildHeaders(account.accessToken);

    const params = {
      limit: parseInt(limit),
      offset: parseInt(offset),
    };
    if (status) params.status = status;

    const response = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}/items/search`,
      { headers, params }
    );

    const itemIds = response.data.results || [];
    const products = await fetchProductsWithDetails(itemIds, headers, 20);

    logger.info({
      action: 'LIST_USER_PRODUCTS',
      accountId,
      userId: req.user.userId,
      productsCount: products.length,
    });

    sendSuccess(res, {
      products,
      paging: response.data.paging,
    });
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to list user products', error, {
      action: 'LIST_USER_PRODUCTS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/user-products/:accountId/product/:productId
 * Get catalog product details
 */
router.get('/:accountId/product/:productId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, productId } = req.params;
    const account = await getAndValidateAccount(req, accountId);
    const headers = buildHeaders(account.accessToken);

    const response = await axios.get(
      `${ML_API_BASE}/products/${productId}`,
      { headers }
    );

    logger.info({
      action: 'GET_PRODUCT_DETAILS',
      accountId,
      productId,
      userId: req.user.userId,
    });

    sendSuccess(res, response.data);
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to get product details', error, {
      action: 'GET_PRODUCT_DETAILS_ERROR',
      accountId: req.params.accountId,
      productId: req.params.productId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/user-products/:accountId/inventory/:itemId
 * Get inventory details for an item
 */
router.get('/:accountId/inventory/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = await getAndValidateAccount(req, accountId);
    const headers = buildHeaders(account.accessToken);

    const [itemRes, stockRes, warehouseRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}/stock`, { headers }).catch(() => ({ data: null })),
      axios.get(`${ML_API_BASE}/items/${itemId}/stock/warehouses`, { headers }).catch(() => ({ data: null })),
    ]);

    const inventory = buildInventorySummary(itemId, itemRes.data, stockRes.data, warehouseRes.data);

    logger.info({
      action: 'GET_INVENTORY',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    sendSuccess(res, inventory);
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to get inventory', error, {
      action: 'GET_INVENTORY_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });
  }
});

/**
 * PUT /api/user-products/:accountId/inventory/:itemId
 * Update inventory for an item
 */
router.put('/:accountId/inventory/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { available_quantity, variations } = req.body;
    const account = await getAndValidateAccount(req, accountId);
    const headers = buildHeaders(account.accessToken);

    const updateData = {};

    if (available_quantity !== undefined) {
      updateData.available_quantity = available_quantity;
    }

    if (variations && Array.isArray(variations)) {
      updateData.variations = variations.map(v => ({
        id: v.id,
        available_quantity: v.available_quantity,
      }));
    }

    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      updateData,
      { headers }
    );

    logger.info({
      action: 'UPDATE_INVENTORY',
      accountId,
      itemId,
      userId: req.user.userId,
      newQuantity: available_quantity,
    });

    sendSuccess(res, {
      item_id: itemId,
      available_quantity: response.data.available_quantity,
      variations: response.data.variations?.map(v => ({
        id: v.id,
        available_quantity: v.available_quantity,
      })),
    }, 'Inventory updated successfully');
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to update inventory', error, {
      action: 'UPDATE_INVENTORY_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/user-products/:accountId/warehouses
 * List available warehouses
 */
router.get('/:accountId/warehouses', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await getAndValidateAccount(req, accountId);
    const headers = buildHeaders(account.accessToken);

    const response = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}/warehouses`,
      { headers }
    );

    logger.info({
      action: 'LIST_WAREHOUSES',
      accountId,
      userId: req.user.userId,
      warehousesCount: response.data?.length || 0,
    });

    sendSuccess(res, response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      logger.info({
        action: 'LIST_WAREHOUSES_NOT_FOUND',
        accountId: req.params.accountId,
        userId: req.user.userId,
      });
      return sendSuccess(res, [], 'No warehouses available for this account');
    }

    handleError(res, error.response?.status || 500, 'Failed to list warehouses', error, {
      action: 'LIST_WAREHOUSES_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/user-products/:accountId/fulfillment/:itemId
 * Get fulfillment info for an item
 */
router.get('/:accountId/fulfillment/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = await getAndValidateAccount(req, accountId);
    const headers = buildHeaders(account.accessToken);

    const [itemRes, fulfillmentRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}/fulfillment`, { headers }).catch(() => ({ data: null })),
    ]);

    const fulfillmentInfo = buildFulfillmentInfo(itemId, itemRes.data, fulfillmentRes.data);

    logger.info({
      action: 'GET_FULFILLMENT_INFO',
      accountId,
      itemId,
      userId: req.user.userId,
      isFulfillment: fulfillmentInfo.is_fulfillment,
    });

    sendSuccess(res, fulfillmentInfo);
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to get fulfillment info', error, {
      action: 'GET_FULFILLMENT_INFO_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });
  }
});

/**
 * POST /api/user-products/:accountId/fulfillment/:itemId
 * Opt-in item to fulfillment
 */
router.post('/:accountId/fulfillment/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = await getAndValidateAccount(req, accountId);
    const headers = buildHeaders(account.accessToken);

    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      {
        shipping: {
          logistic_type: 'fulfillment',
        },
      },
      { headers }
    );

    logger.info({
      action: 'OPT_IN_FULFILLMENT',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    sendSuccess(res, {
      item_id: itemId,
      logistic_type: response.data.shipping?.logistic_type,
    }, 'Item opted-in to fulfillment');
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to opt-in to fulfillment', error, {
      action: 'OPT_IN_FULFILLMENT_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });
  }
});

/**
 * DELETE /api/user-products/:accountId/fulfillment/:itemId
 * Opt-out item from fulfillment
 */
router.delete('/:accountId/fulfillment/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = await getAndValidateAccount(req, accountId);
    const headers = buildHeaders(account.accessToken);

    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      {
        shipping: {
          logistic_type: 'cross_docking',
        },
      },
      { headers }
    );

    logger.info({
      action: 'OPT_OUT_FULFILLMENT',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    sendSuccess(res, {
      item_id: itemId,
      logistic_type: response.data.shipping?.logistic_type,
    }, 'Item opted-out from fulfillment');
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to opt-out from fulfillment', error, {
      action: 'OPT_OUT_FULFILLMENT_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/user-products/:accountId/stock-locations/:itemId
 * Get stock by location/warehouse
 */
router.get('/:accountId/stock-locations/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = await getAndValidateAccount(req, accountId);
    const headers = buildHeaders(account.accessToken);

    const [itemRes, stockLocationsRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}/stock/warehouses`, { headers }).catch(() => ({ data: null })),
    ]);

    const stockLocations = buildStockLocations(itemId, itemRes.data, stockLocationsRes.data);

    logger.info({
      action: 'GET_STOCK_LOCATIONS',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    sendSuccess(res, stockLocations);
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to get stock locations', error, {
      action: 'GET_STOCK_LOCATIONS_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/user-products/:accountId/low-stock
 * Get items with low stock
 */
router.get('/:accountId/low-stock', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { threshold = 5 } = req.query;
    const account = await getAndValidateAccount(req, accountId);
    const headers = buildHeaders(account.accessToken);

    const itemsWithStock = await fetchItemsWithStock(headers, account.mlUserId, 100);
    const lowStockItems = filterLowStockItems(itemsWithStock, threshold);

    logger.info({
      action: 'GET_LOW_STOCK_ITEMS',
      accountId,
      userId: req.user.userId,
      threshold,
      lowStockCount: lowStockItems.length,
    });

    sendSuccess(res, {
      threshold: parseInt(threshold),
      low_stock_items: lowStockItems,
      total: lowStockItems.length,
    });
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to get low stock items', error, {
      action: 'GET_LOW_STOCK_ITEMS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

module.exports = router;
