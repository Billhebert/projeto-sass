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

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * GET /api/user-products/:accountId
 * List all products for user
 */
router.get('/:accountId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 50, offset = 0, status } = req.query;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const params = {
      limit: parseInt(limit),
      offset: parseInt(offset),
    };
    if (status) params.status = status;

    // Get user's items with product info
    const response = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}/items/search`,
      { headers, params }
    );

    const itemIds = response.data.results || [];

    // Fetch product details for each item
    const products = await Promise.all(
      itemIds.slice(0, 20).map(async (itemId) => {
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

    const validProducts = products.filter(p => p !== null);

    logger.info({
      action: 'LIST_USER_PRODUCTS',
      accountId,
      userId: req.user.userId,
      productsCount: validProducts.length,
    });

    res.json({
      success: true,
      data: {
        products: validProducts,
        paging: response.data.paging,
      },
    });
  } catch (error) {
    logger.error({
      action: 'LIST_USER_PRODUCTS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to list user products',
      error: error.response?.data?.message || error.message,
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
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

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

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'GET_PRODUCT_DETAILS_ERROR',
      accountId: req.params.accountId,
      productId: req.params.productId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get product details',
      error: error.response?.data?.message || error.message,
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
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get item and inventory info
    const [itemRes, stockRes, warehouseRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}/stock`, { headers }).catch(() => ({ data: null })),
      axios.get(`${ML_API_BASE}/items/${itemId}/stock/warehouses`, { headers }).catch(() => ({ data: null })),
    ]);

    const item = itemRes.data;

    // Build inventory summary
    const inventory = {
      item_id: itemId,
      title: item.title,
      available_quantity: item.available_quantity,
      sold_quantity: item.sold_quantity,
      initial_quantity: item.initial_quantity,
      stock_info: stockRes.data,
      warehouses: warehouseRes.data,
      variations: item.variations?.map(v => ({
        id: v.id,
        available_quantity: v.available_quantity,
        sold_quantity: v.sold_quantity,
        attribute_combinations: v.attribute_combinations,
      })) || [],
    };

    logger.info({
      action: 'GET_INVENTORY',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    logger.error({
      action: 'GET_INVENTORY_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get inventory',
      error: error.response?.data?.message || error.message,
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
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const updateData = {};

    // Update main quantity
    if (available_quantity !== undefined) {
      updateData.available_quantity = available_quantity;
    }

    // Update variation quantities
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

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: {
        item_id: itemId,
        available_quantity: response.data.available_quantity,
        variations: response.data.variations?.map(v => ({
          id: v.id,
          available_quantity: v.available_quantity,
        })),
      },
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_INVENTORY_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update inventory',
      error: error.response?.data?.message || error.message,
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
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get warehouses for the user
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

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    // Warehouses may not be available for all accounts
    if (error.response?.status === 404) {
      return res.json({
        success: true,
        data: [],
        message: 'No warehouses available for this account',
      });
    }

    logger.error({
      action: 'LIST_WAREHOUSES_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to list warehouses',
      error: error.response?.data?.message || error.message,
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
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const [itemRes, fulfillmentRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}/fulfillment`, { headers }).catch(() => ({ data: null })),
    ]);

    const item = itemRes.data;
    const isFulfillment = item.shipping?.logistic_type === 'fulfillment';

    logger.info({
      action: 'GET_FULFILLMENT_INFO',
      accountId,
      itemId,
      userId: req.user.userId,
      isFulfillment,
    });

    res.json({
      success: true,
      data: {
        item_id: itemId,
        title: item.title,
        is_fulfillment: isFulfillment,
        logistic_type: item.shipping?.logistic_type,
        fulfillment_info: fulfillmentRes.data,
        shipping: item.shipping,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_FULFILLMENT_INFO_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get fulfillment info',
      error: error.response?.data?.message || error.message,
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
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Update item to use fulfillment
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

    res.json({
      success: true,
      message: 'Item opted-in to fulfillment',
      data: {
        item_id: itemId,
        logistic_type: response.data.shipping?.logistic_type,
      },
    });
  } catch (error) {
    logger.error({
      action: 'OPT_IN_FULFILLMENT_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to opt-in to fulfillment',
      error: error.response?.data?.message || error.message,
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
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Update item to use cross_docking (self-shipping)
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

    res.json({
      success: true,
      message: 'Item opted-out from fulfillment',
      data: {
        item_id: itemId,
        logistic_type: response.data.shipping?.logistic_type,
      },
    });
  } catch (error) {
    logger.error({
      action: 'OPT_OUT_FULFILLMENT_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to opt-out from fulfillment',
      error: error.response?.data?.message || error.message,
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
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const [itemRes, stockLocationsRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}/stock/warehouses`, { headers }).catch(() => ({ data: null })),
    ]);

    logger.info({
      action: 'GET_STOCK_LOCATIONS',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: {
        item_id: itemId,
        title: itemRes.data.title,
        total_available: itemRes.data.available_quantity,
        locations: stockLocationsRes.data || [],
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_STOCK_LOCATIONS_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get stock locations',
      error: error.response?.data?.message || error.message,
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
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get all active items
    const response = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}/items/search`,
      {
        headers,
        params: {
          status: 'active',
          limit: 100,
        },
      }
    );

    const itemIds = response.data.results || [];

    // Check stock for each item
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

    // Filter low stock items
    const lowStockItems = itemsWithStock
      .filter(item => item !== null && item.available_quantity <= parseInt(threshold))
      .sort((a, b) => a.available_quantity - b.available_quantity);

    logger.info({
      action: 'GET_LOW_STOCK_ITEMS',
      accountId,
      userId: req.user.userId,
      threshold,
      lowStockCount: lowStockItems.length,
    });

    res.json({
      success: true,
      data: {
        threshold: parseInt(threshold),
        low_stock_items: lowStockItems,
        total: lowStockItems.length,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_LOW_STOCK_ITEMS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get low stock items',
      error: error.response?.data?.message || error.message,
    });
  }
});

module.exports = router;
