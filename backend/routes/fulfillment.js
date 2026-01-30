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

const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../logger');
const MLAccount = require('../db/models/MLAccount');
const { authenticateToken } = require('../middleware/auth');

const ML_API_BASE = 'https://api.mercadolibre.com';

// Middleware to get ML account and validate token
async function getMLAccount(req, res, next) {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;

    const account = await MLAccount.findOne({ id: accountId, userId });
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'ML account not found',
      });
    }

    if (account.isTokenExpired()) {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please refresh.',
      });
    }

    req.mlAccount = account;
    next();
  } catch (error) {
    logger.error('Error getting ML account:', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * GET /api/fulfillment/:accountId/inventory/:inventoryId
 * Get fulfillment stock info for a specific inventory
 */
router.get('/:accountId/inventory/:inventoryId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/inventories/${inventoryId}/stock/fulfillment`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching fulfillment inventory:', {
      error: error.message,
      inventoryId: req.params.inventoryId,
      status: error.response?.status,
    });

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Inventory not found or not in fulfillment',
      });
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this inventory',
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/fulfillment/:accountId/inventory/:inventoryId/details
 * Get fulfillment stock with detailed conditions (damaged, not_supported, etc.)
 */
router.get('/:accountId/inventory/:inventoryId/details', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/inventories/${inventoryId}/stock/fulfillment`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          include_attributes: 'conditions',
        },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching fulfillment inventory details:', {
      error: error.message,
      inventoryId: req.params.inventoryId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/fulfillment/:accountId/operations
 * Search stock operations for the seller
 */
router.get('/:accountId/operations', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const {
      inventory_id,
      date_from,
      date_to,
      type,
      shipment_id,
      limit = 50,
      scroll,
    } = req.query;

    // Calculate default dates (last 15 days if not provided)
    const today = new Date();
    const fifteenDaysAgo = new Date(today);
    fifteenDaysAgo.setDate(today.getDate() - 15);

    const params = {
      seller_id: mlUserId,
      date_from: date_from || fifteenDaysAgo.toISOString().split('T')[0],
      date_to: date_to || today.toISOString().split('T')[0],
      limit,
    };

    if (inventory_id) params.inventory_id = inventory_id;
    if (type) params.type = type;
    if (shipment_id) params['external_references.shipment_id'] = shipment_id;
    if (scroll) params.scroll = scroll;

    const response = await axios.get(
      `${ML_API_BASE}/stock/fulfillment/operations/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error searching fulfillment operations:', {
      error: error.message,
      response: error.response?.data,
    });

    if (error.response?.status === 400) {
      return res.status(400).json({
        success: false,
        error: error.response?.data?.message || 'Invalid search parameters',
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/fulfillment/:accountId/operations/:operationId
 * Get details of a specific stock operation
 */
router.get('/:accountId/operations/:operationId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { operationId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/stock/fulfillment/operations/${operationId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching operation details:', {
      error: error.message,
      operationId: req.params.operationId,
    });

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Operation not found',
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/fulfillment/:accountId/items
 * Get all items with fulfillment (inventory_id) for the seller
 */
router.get('/:accountId/items', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const { limit = 50, offset = 0, status = 'active' } = req.query;

    // First, get all active items
    const itemsResponse = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/items/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          status,
          limit,
          offset,
        },
      }
    );

    const itemIds = itemsResponse.data.results || [];
    
    if (itemIds.length === 0) {
      return res.json({
        success: true,
        data: {
          items: [],
          paging: itemsResponse.data.paging,
        },
      });
    }

    // Get details for each item including inventory_id
    const itemDetails = await Promise.all(
      itemIds.map(id =>
        axios.get(`${ML_API_BASE}/items/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => null)
      )
    );

    // Filter items that have inventory_id (are in fulfillment)
    const fulfillmentItems = itemDetails
      .filter(r => r !== null && r.data.inventory_id)
      .map(r => ({
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
        variations: r.data.variations?.map(v => ({
          id: v.id,
          inventoryId: v.inventory_id,
          attributeCombinations: v.attribute_combinations,
          availableQuantity: v.available_quantity,
        })),
      }));

    res.json({
      success: true,
      data: {
        items: fulfillmentItems,
        totalItems: itemIds.length,
        fulfillmentItems: fulfillmentItems.length,
        paging: itemsResponse.data.paging,
      },
    });
  } catch (error) {
    logger.error('Error fetching fulfillment items:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/fulfillment/:accountId/summary
 * Get fulfillment dashboard summary
 */
router.get('/:accountId/summary', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;

    // Get active items to find fulfillment items
    const itemsResponse = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/items/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          status: 'active',
          limit: 100,
        },
      }
    );

    const itemIds = itemsResponse.data.results || [];
    
    // Get item details
    const itemDetails = await Promise.all(
      itemIds.slice(0, 50).map(id =>
        axios.get(`${ML_API_BASE}/items/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => null)
      )
    );

    // Filter fulfillment items
    const fulfillmentItems = itemDetails
      .filter(r => r !== null && r.data.inventory_id)
      .map(r => r.data);

    // Get stock info for each fulfillment item
    const stockPromises = fulfillmentItems.slice(0, 20).map(async (item) => {
      try {
        const stockResponse = await axios.get(
          `${ML_API_BASE}/inventories/${item.inventory_id}/stock/fulfillment`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        return {
          itemId: item.id,
          title: item.title,
          inventoryId: item.inventory_id,
          stock: stockResponse.data,
        };
      } catch (err) {
        return {
          itemId: item.id,
          title: item.title,
          inventoryId: item.inventory_id,
          stock: null,
          error: err.response?.data?.message || err.message,
        };
      }
    });

    const stockInfo = await Promise.all(stockPromises);

    // Calculate summary statistics
    const validStockInfo = stockInfo.filter(s => s.stock !== null);
    const totalAvailable = validStockInfo.reduce((sum, s) => sum + (s.stock?.available_quantity || 0), 0);
    const totalNotAvailable = validStockInfo.reduce((sum, s) => sum + (s.stock?.not_available_quantity || 0), 0);
    const totalStock = validStockInfo.reduce((sum, s) => sum + (s.stock?.total || 0), 0);

    // Aggregate not_available_detail
    const notAvailableBreakdown = {};
    validStockInfo.forEach(s => {
      if (s.stock?.not_available_detail) {
        s.stock.not_available_detail.forEach(detail => {
          if (!notAvailableBreakdown[detail.status]) {
            notAvailableBreakdown[detail.status] = 0;
          }
          notAvailableBreakdown[detail.status] += detail.quantity;
        });
      }
    });

    // Get recent operations
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    let recentOperations = [];
    try {
      const opsResponse = await axios.get(
        `${ML_API_BASE}/stock/fulfillment/operations/search`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            seller_id: mlUserId,
            date_from: sevenDaysAgo.toISOString().split('T')[0],
            date_to: today.toISOString().split('T')[0],
            limit: 20,
          },
        }
      );
      recentOperations = opsResponse.data.results || [];
    } catch (err) {
      logger.warn('Error fetching recent operations for summary:', { error: err.message });
    }

    // Count operations by type
    const operationsByType = {};
    recentOperations.forEach(op => {
      if (!operationsByType[op.type]) {
        operationsByType[op.type] = 0;
      }
      operationsByType[op.type]++;
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalFulfillmentItems: fulfillmentItems.length,
          totalActiveItems: itemsResponse.data.paging?.total || itemIds.length,
          fulfillmentPercentage: itemIds.length > 0 
            ? ((fulfillmentItems.length / itemIds.length) * 100).toFixed(1) 
            : 0,
        },
        stock: {
          total: totalStock,
          available: totalAvailable,
          notAvailable: totalNotAvailable,
          notAvailableBreakdown,
        },
        items: stockInfo.map(s => ({
          itemId: s.itemId,
          title: s.title,
          inventoryId: s.inventoryId,
          available: s.stock?.available_quantity || 0,
          notAvailable: s.stock?.not_available_quantity || 0,
          total: s.stock?.total || 0,
          hasError: !!s.error,
        })),
        recentActivity: {
          operationsCount: recentOperations.length,
          operationsByType,
          lastOperations: recentOperations.slice(0, 5).map(op => ({
            id: op.id,
            type: op.type,
            inventoryId: op.inventory_id,
            dateCreated: op.date_created,
            detail: op.detail,
          })),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching fulfillment summary:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/fulfillment/:accountId/items/:itemId/stock
 * Get fulfillment stock for a specific item (by item ID, not inventory ID)
 */
router.get('/:accountId/items/:itemId/stock', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { accessToken } = req.mlAccount;

    // First get the item to find inventory_id
    const itemResponse = await axios.get(
      `${ML_API_BASE}/items/${itemId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const inventoryId = itemResponse.data.inventory_id;

    if (!inventoryId) {
      return res.status(400).json({
        success: false,
        error: 'This item is not in fulfillment (no inventory_id)',
        data: {
          itemId,
          title: itemResponse.data.title,
          logisticType: itemResponse.data.shipping?.logistic_type,
        },
      });
    }

    // Get fulfillment stock
    const stockResponse = await axios.get(
      `${ML_API_BASE}/inventories/${inventoryId}/stock/fulfillment`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          include_attributes: 'conditions',
        },
      }
    );

    res.json({
      success: true,
      data: {
        item: {
          id: itemResponse.data.id,
          title: itemResponse.data.title,
          price: itemResponse.data.price,
          thumbnail: itemResponse.data.thumbnail,
          permalink: itemResponse.data.permalink,
        },
        inventoryId,
        stock: stockResponse.data,
      },
    });
  } catch (error) {
    logger.error('Error fetching item fulfillment stock:', {
      error: error.message,
      itemId: req.params.itemId,
    });

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * Operation types reference
 * 
 * Inbound:
 * - INBOUND_RECEPTION: New stock received at fulfillment center
 * - FISCAL_COVERAGE_ADJUSTMENT: Tax coverage adjustment (Brazil only)
 * 
 * Outbound (Sales):
 * - SALE_CONFIRMATION: Units reserved for sale
 * - SALE_CANCELATION: Sale reservation cancelled
 * - SALE_DELIVERY_CANCELATION: Delivery failed, returned to warehouse
 * - SALE_RETURN: Buyer returned the product
 * 
 * Withdrawal (Seller):
 * - WITHDRAWAL_RESERVATION: Units reserved for withdrawal
 * - WITHDRAWAL_CANCELATION: Withdrawal cancelled
 * - WITHDRAWAL_DELIVERY: Seller picked up units
 * - WITHDRAWAL_REMOVAL: Units removed due to abandoned withdrawal
 * - WITHDRAWAL_DISCARDED: Withdrawal discarded by seller
 * 
 * Transfer (Internal):
 * - TRANSFER_RESERVATION: Units reserved for transfer
 * - TRANSFER_ADJUSTMENT: Quality inspection completed
 * - TRANSFER_DELIVERY: Units transferred
 * 
 * Quality/Quarantine:
 * - QUARANTINE_RESERVATION: Units reserved for inspection
 * - QUARANTINE_RESTOCK: Units returned after inspection
 * - LOST_REFUND: Lost units refunded
 * - DAMAGED_REMOVAL: Damaged units removed and refunded
 * - DISPOSED_TAINTED: Product disposed (contaminated)
 * - DISPOSED_EXPIRED: Product disposed (expired)
 * 
 * Adjustments:
 * - ADJUSTMENT: Internal stock adjustments
 * - IDENTIFICATION_PROBLEM_REMOVE: SKU correction - remove
 * - IDENTIFICATION_PROBLEM_ADD: SKU correction - add
 */

/**
 * GET /api/fulfillment/:accountId/inventory
 * Get all inventory items for the account (list view)
 */
router.get('/:accountId/inventory', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const { limit = 50, offset = 0 } = req.query;

    // Get all active items
    const itemsResponse = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/items/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          status: 'active',
          limit,
          offset,
        },
      }
    );

    const itemIds = itemsResponse.data.results || [];
    
    if (itemIds.length === 0) {
      return res.json({
        success: true,
        inventory: [],
        paging: itemsResponse.data.paging,
      });
    }

    // Get details for each item
    const itemDetails = await Promise.all(
      itemIds.slice(0, 20).map(id =>
        axios.get(`${ML_API_BASE}/items/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => null)
      )
    );

    // Build inventory list
    const inventory = itemDetails
      .filter(r => r !== null)
      .map(r => ({
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

    res.json({
      success: true,
      inventory,
      paging: itemsResponse.data.paging,
      summary: {
        total: inventory.length,
        in_fulfillment: inventory.filter(i => i.in_fulfillment).length,
        out_of_stock: inventory.filter(i => i.available_quantity === 0).length,
        low_stock: inventory.filter(i => i.available_quantity > 0 && i.available_quantity <= 5).length,
      },
    });
  } catch (error) {
    logger.error('Error fetching inventory:', {
      error: error.message,
    });

    // Return fallback empty inventory
    res.json({
      success: true,
      inventory: [],
      paging: { total: 0, offset: 0, limit: 50 },
      summary: {
        total: 0,
        in_fulfillment: 0,
        out_of_stock: 0,
        low_stock: 0,
      },
      fallback: true,
    });
  }
});

/**
 * GET /api/fulfillment/:accountId/shipments
 * Get recent shipments for the account
 */
router.get('/:accountId/shipments', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const { limit = 20, offset = 0 } = req.query;

    // Get recent orders
    const ordersResponse = await axios.get(
      `${ML_API_BASE}/orders/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          seller: mlUserId,
          limit,
          offset,
          sort: 'date_desc',
        },
      }
    );

    const orders = ordersResponse.data.results || [];

    // Get shipment info for each order
    const shipments = await Promise.all(
      orders.slice(0, 10).map(async (order) => {
        try {
          if (!order.shipping?.id) return null;
          const shipRes = await axios.get(
            `${ML_API_BASE}/shipments/${order.shipping.id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
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

    res.json({
      success: true,
      shipments: shipments.filter(s => s !== null),
      paging: ordersResponse.data.paging,
    });
  } catch (error) {
    logger.error('Error fetching shipments:', {
      error: error.message,
    });

    // Return fallback empty shipments
    res.json({
      success: true,
      shipments: [],
      paging: { total: 0, offset: 0, limit: 20 },
      fallback: true,
    });
  }
});

/**
 * GET /api/fulfillment/:accountId/stats
 * Get fulfillment stats for the account
 */
router.get('/:accountId/stats', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;

    // Get all active items
    const itemsResponse = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/items/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { status: 'active', limit: 50 },
      }
    );

    const itemIds = itemsResponse.data.results || [];
    
    // Get item details
    const itemDetails = await Promise.all(
      itemIds.slice(0, 20).map(id =>
        axios.get(`${ML_API_BASE}/items/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => null)
      )
    );

    const items = itemDetails.filter(r => r !== null).map(r => r.data);
    
    const stats = {
      totalItems: items.length,
      inFulfillment: items.filter(i => i.inventory_id).length,
      outOfStock: items.filter(i => i.available_quantity === 0).length,
      lowStock: items.filter(i => i.available_quantity > 0 && i.available_quantity <= 5).length,
      totalStock: items.reduce((sum, i) => sum + (i.available_quantity || 0), 0),
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching fulfillment stats:', {
      error: error.message,
    });

    // Return fallback stats
    res.json({
      success: true,
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
});

module.exports = router;
