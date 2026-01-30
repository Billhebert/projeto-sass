/**
 * Items Routes (CRUD Completo)
 * Full item/listing management on Mercado Livre
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

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const Product = require('../db/models/Product');
const MLAccount = require('../db/models/MLAccount');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * GET /api/items/:accountId
 * List items from ML API
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

    const response = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}/items/search`,
      { headers, params }
    );

    const itemIds = response.data.results || [];

    // Fetch details for each item
    const items = await Promise.all(
      itemIds.slice(0, 20).map(itemId =>
        axios.get(`${ML_API_BASE}/items/${itemId}`, { headers })
          .then(res => res.data)
          .catch(() => null)
      )
    );

    res.json({
      success: true,
      data: {
        items: items.filter(i => i !== null),
        paging: response.data.paging || { total: 0 },
        seller_id: response.data.seller_id,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ITEMS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch items',
      error: error.message,
    });
  }
});

/**
 * GET /api/items/:accountId/list
 * Simple list of items (for dropdowns, selectors, etc)
 * Returns minimal data for performance
 */
router.get('/:accountId/list', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 50, offset = 0, status } = req.query;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const params = {
      limit: Math.min(parseInt(limit), 100),
      offset: parseInt(offset),
    };
    if (status) params.status = status;

    const response = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}/items/search`,
      { headers, params }
    );

    const itemIds = response.data.results || [];

    // Fetch basic details for each item
    const items = await Promise.all(
      itemIds.map(itemId =>
        axios.get(`${ML_API_BASE}/items/${itemId}`, { 
          headers,
          params: { attributes: 'id,title,price,currency_id,available_quantity,status,thumbnail,category_id' }
        })
          .then(res => ({
            id: res.data.id,
            title: res.data.title,
            price: res.data.price,
            currency_id: res.data.currency_id,
            available_quantity: res.data.available_quantity,
            status: res.data.status,
            thumbnail: res.data.thumbnail,
            category_id: res.data.category_id,
          }))
          .catch(() => null)
      )
    );

    res.json({
      success: true,
      items: items.filter(i => i !== null),
      paging: response.data.paging || { total: itemIds.length },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ITEMS_LIST_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch items list',
      error: error.message,
    });
  }
});

/**
 * GET /api/items/:accountId/profit-analysis
 * Get items with profit analysis data
 * NOTE: Must be defined BEFORE /:accountId/:itemId to avoid route conflicts
 */
router.get('/:accountId/profit-analysis', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get items list
    const response = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}/items/search`,
      { headers, params: { limit: parseInt(limit), offset: parseInt(offset) } }
    );

    const itemIds = response.data.results || [];

    // Fetch details for each item
    const itemsData = await Promise.all(
      itemIds.slice(0, 20).map(async (itemId) => {
        try {
          const [itemRes, visitsRes] = await Promise.all([
            axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
            axios.get(`${ML_API_BASE}/items/${itemId}/visits/time_window`, { 
              headers,
              params: { last: 30, unit: 'day' }
            }).catch(() => ({ data: { total_visits: 0 } }))
          ]);

          const item = itemRes.data;
          const visits = visitsRes.data?.total_visits || 0;

          // Calculate profit analysis (estimated values)
          // ML fee is typically 11-16% depending on listing type
          const mlFeePercent = item.listing_type_id === 'gold_special' ? 0.11 : 
                              item.listing_type_id === 'gold_pro' ? 0.16 : 0.13;
          const mlFee = item.price * mlFeePercent;
          
          // Estimated cost (would come from product database in production)
          const estimatedCost = item.price * 0.4;
          const shippingCost = item.shipping?.free_shipping ? 15 : 0;
          const profit = item.price - mlFee - estimatedCost - shippingCost;
          const margin = ((profit / item.price) * 100);

          return {
            id: item.id,
            title: item.title,
            price: item.price,
            currency_id: item.currency_id,
            available_quantity: item.available_quantity,
            sold_quantity: item.sold_quantity,
            status: item.status,
            thumbnail: item.thumbnail,
            permalink: item.permalink,
            listing_type_id: item.listing_type_id,
            visits: visits,
            // Profit analysis data
            cost: estimatedCost,
            mlFee: mlFee,
            mlFeePercent: (mlFeePercent * 100).toFixed(1),
            shippingCost: shippingCost,
            profit: profit,
            margin: margin.toFixed(1),
            roi: estimatedCost > 0 ? ((profit / estimatedCost) * 100).toFixed(1) : 0
          };
        } catch (e) {
          return null;
        }
      })
    );

    const items = itemsData.filter(i => i !== null);

    logger.info({
      action: 'GET_PROFIT_ANALYSIS',
      accountId,
      userId: req.user.userId,
      itemCount: items.length,
    });

    res.json({
      success: true,
      items: items,
      paging: response.data.paging || { total: items.length }
    });
  } catch (error) {
    logger.error({
      action: 'GET_PROFIT_ANALYSIS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    // Return fallback data
    res.json({
      success: true,
      items: [],
      paging: { total: 0 },
      source: 'fallback'
    });
  }
});

/**
 * GET /api/items/:accountId/profit-stats
 * Get aggregated profit statistics
 * NOTE: Must be defined BEFORE /:accountId/:itemId to avoid route conflicts
 */
router.get('/:accountId/profit-stats', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get items list
    const response = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}/items/search`,
      { headers, params: { limit: 50 } }
    );

    const itemIds = response.data.results || [];
    const totalItems = response.data.paging?.total || itemIds.length;

    // Sample items for stats calculation
    const sampleIds = itemIds.slice(0, 20);
    const itemsData = await Promise.all(
      sampleIds.map(async (itemId) => {
        try {
          const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers });
          const item = itemRes.data;

          const mlFeePercent = item.listing_type_id === 'gold_special' ? 0.11 : 
                              item.listing_type_id === 'gold_pro' ? 0.16 : 0.13;
          const mlFee = item.price * mlFeePercent;
          const estimatedCost = item.price * 0.4;
          const shippingCost = item.shipping?.free_shipping ? 15 : 0;
          const profit = item.price - mlFee - estimatedCost - shippingCost;
          const margin = ((profit / item.price) * 100);

          return {
            price: item.price,
            profit: profit,
            margin: margin,
            soldQuantity: item.sold_quantity || 0
          };
        } catch (e) {
          return null;
        }
      })
    );

    const items = itemsData.filter(i => i !== null);

    // Calculate aggregated stats
    const profitableItems = items.filter(i => i.margin > 0).length;
    const unprofitableItems = items.filter(i => i.margin <= 0).length;
    const avgMargin = items.length > 0 
      ? items.reduce((acc, i) => acc + i.margin, 0) / items.length 
      : 0;
    const totalRevenue = items.reduce((acc, i) => acc + (i.price * i.soldQuantity), 0);
    const totalProfit = items.reduce((acc, i) => acc + (i.profit * i.soldQuantity), 0);

    logger.info({
      action: 'GET_PROFIT_STATS',
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      stats: {
        totalItems: totalItems,
        sampledItems: items.length,
        avgMargin: avgMargin.toFixed(1),
        profitableItems: Math.round((profitableItems / items.length) * totalItems) || 0,
        unprofitableItems: Math.round((unprofitableItems / items.length) * totalItems) || 0,
        totalRevenue: totalRevenue,
        totalProfit: totalProfit,
        avgPrice: items.length > 0 
          ? (items.reduce((acc, i) => acc + i.price, 0) / items.length).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    logger.error({
      action: 'GET_PROFIT_STATS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    // Return fallback stats
    res.json({
      success: true,
      stats: {
        totalItems: 0,
        avgMargin: 0,
        profitableItems: 0,
        unprofitableItems: 0,
        totalRevenue: 0,
        totalProfit: 0
      },
      source: 'fallback'
    });
  }
});

/**
 * GET /api/items/:accountId/:itemId
 * Get detailed item information
 */
router.get('/:accountId/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Fetch item, description, and attributes in parallel
    const [itemRes, descRes, visitsRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}/description`, { headers }).catch(() => ({ data: null })),
      axios.get(`${ML_API_BASE}/items/${itemId}/visits/time_window?last=30&unit=day`, { headers }).catch(() => ({ data: null })),
    ]);

    res.json({
      success: true,
      data: {
        item: itemRes.data,
        description: descRes.data,
        visits: visitsRes.data,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ITEM_ERROR',
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch item',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/items/:accountId
 * Create a new item on Mercado Livre
 */
router.post('/:accountId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;
    const itemData = req.body;

    // Validate required fields
    const required = ['title', 'category_id', 'price', 'currency_id', 'available_quantity', 'buying_mode', 'condition', 'listing_type_id'];
    const missing = required.filter(field => !itemData[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Create item on ML
    const response = await axios.post(
      `${ML_API_BASE}/items`,
      itemData,
      { headers }
    );

    // Save to local DB
    const product = new Product({
      accountId,
      userId: req.user.userId,
      mlProductId: response.data.id,
      title: response.data.title,
      price: {
        currency: response.data.currency_id,
        amount: response.data.price,
      },
      quantity: {
        available: response.data.available_quantity,
      },
      status: response.data.status,
      mlStatus: response.data.status,
      category: {
        categoryId: response.data.category_id,
      },
      permalinkUrl: response.data.permalink,
      sellerId: account.mlUserId,
      lastSyncedAt: new Date(),
    });
    await product.save();

    logger.info({
      action: 'ITEM_CREATED',
      itemId: response.data.id,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Item created successfully',
      data: {
        item: response.data,
        localProduct: product.getSummary(),
      },
    });
  } catch (error) {
    logger.error({
      action: 'CREATE_ITEM_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to create item',
      error: error.response?.data || error.message,
    });
  }
});

/**
 * PUT /api/items/:accountId/:itemId
 * Update item details
 */
router.put('/:accountId/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;
    const updateData = req.body;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Update on ML
    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      updateData,
      { headers }
    );

    // Update local DB if exists
    await Product.findOneAndUpdate(
      { accountId, mlProductId: itemId },
      {
        $set: {
          title: response.data.title,
          'price.amount': response.data.price,
          'quantity.available': response.data.available_quantity,
          status: response.data.status,
          mlStatus: response.data.status,
          lastSyncedAt: new Date(),
        },
      }
    );

    logger.info({
      action: 'ITEM_UPDATED',
      itemId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_ITEM_ERROR',
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update item',
      error: error.response?.data || error.message,
    });
  }
});

/**
 * PUT /api/items/:accountId/:itemId/description
 * Update item description
 */
router.put('/:accountId/:itemId/description', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { plain_text } = req.body;
    const account = req.mlAccount;

    if (!plain_text) {
      return res.status(400).json({
        success: false,
        message: 'Description text (plain_text) is required',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}/description`,
      { plain_text },
      { headers }
    );

    logger.info({
      action: 'ITEM_DESCRIPTION_UPDATED',
      itemId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Description updated successfully',
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_DESCRIPTION_ERROR',
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update description',
      error: error.response?.data || error.message,
    });
  }
});

/**
 * PUT /api/items/:accountId/:itemId/pictures
 * Update item pictures
 */
router.put('/:accountId/:itemId/pictures', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { pictures } = req.body;
    const account = req.mlAccount;

    if (!pictures || !Array.isArray(pictures)) {
      return res.status(400).json({
        success: false,
        message: 'Pictures array is required',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      { pictures },
      { headers }
    );

    logger.info({
      action: 'ITEM_PICTURES_UPDATED',
      itemId,
      accountId,
      userId: req.user.userId,
      picturesCount: pictures.length,
    });

    res.json({
      success: true,
      message: 'Pictures updated successfully',
      data: response.data.pictures,
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_PICTURES_ERROR',
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update pictures',
      error: error.response?.data || error.message,
    });
  }
});

/**
 * PUT /api/items/:accountId/:itemId/status
 * Change item status (pause/activate/close)
 */
router.put('/:accountId/:itemId/status', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { status } = req.body;
    const account = req.mlAccount;

    const validStatuses = ['active', 'paused', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      { status },
      { headers }
    );

    // Update local DB
    await Product.findOneAndUpdate(
      { accountId, mlProductId: itemId },
      {
        $set: {
          status,
          mlStatus: status,
          lastSyncedAt: new Date(),
        },
      }
    );

    logger.info({
      action: 'ITEM_STATUS_CHANGED',
      itemId,
      accountId,
      userId: req.user.userId,
      newStatus: status,
    });

    res.json({
      success: true,
      message: `Item status changed to ${status}`,
      data: {
        itemId,
        status: response.data.status,
      },
    });
  } catch (error) {
    logger.error({
      action: 'CHANGE_STATUS_ERROR',
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to change item status',
      error: error.response?.data || error.message,
    });
  }
});

/**
 * DELETE /api/items/:accountId/:itemId
 * Close/delete item
 */
router.delete('/:accountId/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Close item on ML
    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      { status: 'closed' },
      { headers }
    );

    // Update local DB
    await Product.findOneAndUpdate(
      { accountId, mlProductId: itemId },
      {
        $set: {
          status: 'closed',
          mlStatus: 'closed',
          lastSyncedAt: new Date(),
        },
      }
    );

    logger.info({
      action: 'ITEM_CLOSED',
      itemId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Item closed successfully',
      data: {
        itemId,
        status: 'closed',
      },
    });
  } catch (error) {
    logger.error({
      action: 'CLOSE_ITEM_ERROR',
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to close item',
      error: error.response?.data || error.message,
    });
  }
});

/**
 * POST /api/items/:accountId/:itemId/relist
 * Relist a closed item
 */
router.post('/:accountId/:itemId/relist', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { price, quantity } = req.body;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const relistData = {};
    if (price) relistData.price = price;
    if (quantity) relistData.quantity = quantity;

    const response = await axios.post(
      `${ML_API_BASE}/items/${itemId}/relist`,
      relistData,
      { headers }
    );

    // Update local DB with new item ID
    const newItemId = response.data.id;
    await Product.findOneAndUpdate(
      { accountId, mlProductId: itemId },
      {
        $set: {
          mlProductId: newItemId,
          status: 'active',
          mlStatus: 'active',
          'price.amount': response.data.price,
          'quantity.available': response.data.available_quantity,
          permalinkUrl: response.data.permalink,
          lastSyncedAt: new Date(),
        },
      }
    );

    logger.info({
      action: 'ITEM_RELISTED',
      oldItemId: itemId,
      newItemId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Item relisted successfully',
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'RELIST_ITEM_ERROR',
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to relist item',
      error: error.response?.data || error.message,
    });
  }
});

// ============================================
// VARIATIONS ENDPOINTS
// ============================================

/**
 * GET /api/items/:accountId/:itemId/variations
 * Get all variations for an item
 */
router.get('/:accountId/:itemId/variations', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(
      `${ML_API_BASE}/items/${itemId}`,
      { headers }
    );

    const variations = response.data.variations || [];

    logger.info({
      action: 'GET_ITEM_VARIATIONS',
      itemId,
      accountId,
      userId: req.user.userId,
      variationsCount: variations.length,
    });

    res.json({
      success: true,
      data: {
        item_id: itemId,
        variations,
        total: variations.length,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_VARIATIONS_ERROR',
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get variations',
      error: error.response?.data || error.message,
    });
  }
});

/**
 * GET /api/items/:accountId/:itemId/variations/:variationId
 * Get specific variation details
 */
router.get('/:accountId/:itemId/variations/:variationId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId, variationId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(
      `${ML_API_BASE}/items/${itemId}/variations/${variationId}`,
      { headers }
    );

    logger.info({
      action: 'GET_VARIATION_DETAILS',
      itemId,
      variationId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'GET_VARIATION_ERROR',
      itemId: req.params.itemId,
      variationId: req.params.variationId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get variation',
      error: error.response?.data || error.message,
    });
  }
});

/**
 * POST /api/items/:accountId/:itemId/variations
 * Add a new variation to an item
 */
router.post('/:accountId/:itemId/variations', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const variationData = req.body;
    const account = req.mlAccount;

    // Validate required fields
    if (!variationData.attribute_combinations || !Array.isArray(variationData.attribute_combinations)) {
      return res.status(400).json({
        success: false,
        message: 'attribute_combinations array is required',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get current item to get existing variations
    const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers });
    const existingVariations = itemRes.data.variations || [];

    // Add new variation
    const newVariation = {
      attribute_combinations: variationData.attribute_combinations,
      price: variationData.price || itemRes.data.price,
      available_quantity: variationData.available_quantity || 1,
      picture_ids: variationData.picture_ids || [],
    };

    const updatedVariations = [...existingVariations, newVariation];

    // Update item with new variations
    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      { variations: updatedVariations },
      { headers }
    );

    logger.info({
      action: 'ADD_VARIATION',
      itemId,
      accountId,
      userId: req.user.userId,
      newVariationsCount: response.data.variations?.length,
    });

    res.json({
      success: true,
      message: 'Variation added successfully',
      data: {
        item_id: itemId,
        variations: response.data.variations,
      },
    });
  } catch (error) {
    logger.error({
      action: 'ADD_VARIATION_ERROR',
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to add variation',
      error: error.response?.data || error.message,
    });
  }
});

/**
 * PUT /api/items/:accountId/:itemId/variations/:variationId
 * Update a specific variation
 */
router.put('/:accountId/:itemId/variations/:variationId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId, variationId } = req.params;
    const updateData = req.body;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get current item
    const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers });
    const variations = itemRes.data.variations || [];

    // Find and update the variation
    const variationIndex = variations.findIndex(v => v.id.toString() === variationId);
    if (variationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Variation not found',
      });
    }

    // Update variation fields
    if (updateData.price !== undefined) {
      variations[variationIndex].price = updateData.price;
    }
    if (updateData.available_quantity !== undefined) {
      variations[variationIndex].available_quantity = updateData.available_quantity;
    }
    if (updateData.picture_ids !== undefined) {
      variations[variationIndex].picture_ids = updateData.picture_ids;
    }
    if (updateData.attribute_combinations !== undefined) {
      variations[variationIndex].attribute_combinations = updateData.attribute_combinations;
    }

    // Update item
    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      { variations },
      { headers }
    );

    logger.info({
      action: 'UPDATE_VARIATION',
      itemId,
      variationId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Variation updated successfully',
      data: response.data.variations?.find(v => v.id.toString() === variationId),
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_VARIATION_ERROR',
      itemId: req.params.itemId,
      variationId: req.params.variationId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update variation',
      error: error.response?.data || error.message,
    });
  }
});

/**
 * DELETE /api/items/:accountId/:itemId/variations/:variationId
 * Delete a variation from an item
 */
router.delete('/:accountId/:itemId/variations/:variationId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId, variationId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get current item
    const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers });
    const variations = itemRes.data.variations || [];

    // Filter out the variation to delete
    const updatedVariations = variations.filter(v => v.id.toString() !== variationId);

    if (updatedVariations.length === variations.length) {
      return res.status(404).json({
        success: false,
        message: 'Variation not found',
      });
    }

    // Must have at least one variation or none
    if (updatedVariations.length === 0 && variations.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete all variations. Item must have at least one variation or none.',
      });
    }

    // Update item
    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      { variations: updatedVariations },
      { headers }
    );

    logger.info({
      action: 'DELETE_VARIATION',
      itemId,
      variationId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Variation deleted successfully',
      data: {
        item_id: itemId,
        remaining_variations: response.data.variations?.length || 0,
      },
    });
  } catch (error) {
    logger.error({
      action: 'DELETE_VARIATION_ERROR',
      itemId: req.params.itemId,
      variationId: req.params.variationId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to delete variation',
      error: error.response?.data || error.message,
    });
  }
});

/**
 * PUT /api/items/:accountId/:itemId/variations/:variationId/stock
 * Update variation stock only
 */
router.put('/:accountId/:itemId/variations/:variationId/stock', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId, variationId } = req.params;
    const { available_quantity } = req.body;
    const account = req.mlAccount;

    if (available_quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'available_quantity is required',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get current item
    const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers });
    const variations = itemRes.data.variations || [];

    // Find and update variation stock
    const variationIndex = variations.findIndex(v => v.id.toString() === variationId);
    if (variationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Variation not found',
      });
    }

    variations[variationIndex].available_quantity = parseInt(available_quantity);

    // Update item
    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      { variations },
      { headers }
    );

    logger.info({
      action: 'UPDATE_VARIATION_STOCK',
      itemId,
      variationId,
      accountId,
      userId: req.user.userId,
      newQuantity: available_quantity,
    });

    res.json({
      success: true,
      message: 'Variation stock updated successfully',
      data: {
        item_id: itemId,
        variation_id: variationId,
        available_quantity: parseInt(available_quantity),
      },
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_VARIATION_STOCK_ERROR',
      itemId: req.params.itemId,
      variationId: req.params.variationId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update variation stock',
      error: error.response?.data || error.message,
    });
  }
});

/**
 * GET /api/items/:accountId/:itemId/attributes
 * Get item attributes and available values
 */
router.get('/:accountId/:itemId/attributes', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get item to find category
    const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers });
    const categoryId = itemRes.data.category_id;

    // Get category attributes
    const categoryRes = await axios.get(
      `${ML_API_BASE}/categories/${categoryId}/attributes`,
      { headers }
    );

    logger.info({
      action: 'GET_ITEM_ATTRIBUTES',
      itemId,
      categoryId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: {
        item_id: itemId,
        category_id: categoryId,
        item_attributes: itemRes.data.attributes,
        category_attributes: categoryRes.data,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ATTRIBUTES_ERROR',
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get attributes',
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
