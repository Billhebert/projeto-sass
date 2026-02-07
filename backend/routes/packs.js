/**
 * Packs Routes (Carrinho de Compras)
 * Manage packs - multiple items purchased together
 * 
 * API Mercado Livre:
 * - GET /packs/$PACK_ID - Get pack details
 * - GET /orders/search?seller=$SELLER_ID&pack_id=$PACK_ID - Search orders by pack
 * 
 * Routes:
 * GET    /api/packs/:accountId                            - List packs for seller with filters
 * GET    /api/packs/:accountId/:packId                    - Get pack details
 * GET    /api/packs/:accountId/:packId/orders             - Get orders in pack
 * GET    /api/packs/:accountId/:packId/shipment           - Get pack shipment info
 * POST   /api/packs/:accountId                            - Create new pack
 * PUT    /api/packs/:accountId/:packId                    - Update pack
 * DELETE /api/packs/:accountId/:packId                    - Delete pack
 * GET    /api/packs/:accountId/stats                      - Get pack statistics
 * POST   /api/packs/:accountId/bulk                       - Bulk operations
 * POST   /api/packs/:accountId/:packId/items              - Add items to pack
 * PUT    /api/packs/:accountId/:packId/items/:itemId      - Update item in pack
 * DELETE /api/packs/:accountId/:packId/items/:itemId      - Remove item from pack
 * POST   /api/packs/:accountId/:packId/pricing            - Calculate pack pricing
 * POST   /api/packs/:accountId/sync                       - Sync packs from ML API
 */

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const Pack = require('../db/models/Pack');
const Order = require('../db/models/Order');
const MLAccount = require('../db/models/MLAccount');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

// ============================================================================
// CORE HELPER FUNCTIONS
// ============================================================================

/**
 * Send successful response
 */
function sendSuccess(res, data, message = '', statusCode = 200) {
  const response = { success: true };
  if (message) response.message = message;
  if (data !== undefined) response.data = data;
  return res.status(statusCode).json(response);
}

/**
 * Handle error response with logging
 */
function handleError(res, statusCode, message, error, action, context = {}) {
  logger.error({
    action,
    ...context,
    error: error.message || error,
  });
  return res.status(statusCode).json({
    success: false,
    message,
    error: error.message || error,
  });
}

/**
 * Build authorization headers
 */
function buildHeaders(accessToken) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Get and validate ML account
 */
async function getAndValidateAccount(accountId, userId) {
  const account = await MLAccount.findOne({
    id: accountId,
    userId,
  });
  return account;
}

// ============================================================================
// PACK-SPECIFIC HELPER FUNCTIONS
// ============================================================================

/**
 * Build pack search filters from query params
 */
function buildPackFilters(query) {
  return {
    status: query.status,
    paymentStatus: query.paymentStatus,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    minAmount: query.minAmount ? parseFloat(query.minAmount) : undefined,
    maxAmount: query.maxAmount ? parseFloat(query.maxAmount) : undefined,
    buyerId: query.buyerId,
    limit: parseInt(query.limit || 20),
    offset: parseInt(query.offset || 0),
    sort: query.sort || '-dateCreated',
  };
}

/**
 * Find pack by ID or mlPackId
 */
async function findPackById(packId, accountId, userId) {
  return Pack.findOne({
    $or: [{ id: packId }, { mlPackId: packId }],
    accountId,
    userId,
  });
}

/**
 * Validate required pack creation fields
 */
function validatePackCreation(buyer, items) {
  if (!buyer || !buyer.id) {
    return 'Buyer information is required';
  }
  if (!items || items.length === 0) {
    return 'At least one item is required';
  }
  return null;
}

/**
 * Create pack from request data
 */
function createPackData(accountId, userId, { buyer, items, shippingCost = 0, notes }) {
  return {
    accountId,
    userId,
    mlPackId: `pack_${Date.now()}`,
    buyer,
    items: items.map(item => ({
      ...item,
      finalPrice: (item.unitPrice || 0) * (item.quantity || 1),
    })),
    shippingCost,
    notes,
    status: 'pending',
    paymentStatus: 'pending',
    dateCreated: new Date(),
  };
}

/**
 * Update pack fields
 */
function updatePackFields(pack, updates) {
  if (updates.status) pack.status = updates.status;
  if (updates.paymentStatus) pack.paymentStatus = updates.paymentStatus;
  if (updates.shippingCost !== undefined) pack.shippingCost = updates.shippingCost;
  if (updates.notes) pack.notes = updates.notes;
  if (updates.tags) pack.tags = updates.tags;
  pack.dateLastUpdated = new Date();
}

/**
 * Validate item data for adding to pack
 */
function validateItemData({ itemId, title, quantity, unitPrice }) {
  const missing = [];
  if (!itemId) missing.push('itemId');
  if (!title) missing.push('title');
  if (!quantity) missing.push('quantity');
  if (!unitPrice) missing.push('unitPrice');
  return missing.length > 0 ? `Missing required fields: ${missing.join(', ')}` : null;
}

/**
 * Add item to pack
 */
function addItemToPack(pack, itemData) {
  const existingItem = pack.items.find(i => i.itemId === itemData.itemId);
  if (existingItem) {
    return { error: 'Item already exists in pack' };
  }

  const finalPrice = (itemData.unitPrice * itemData.quantity) - (itemData.discount || 0);
  pack.items.push({
    itemId: itemData.itemId,
    mlItemId: itemData.mlItemId,
    title: itemData.title,
    quantity: itemData.quantity,
    unitPrice: itemData.unitPrice,
    totalPrice: itemData.unitPrice * itemData.quantity,
    discount: itemData.discount || 0,
    finalPrice,
  });

  return { success: true };
}

/**
 * Update item in pack
 */
function updateItemInPack(item, updates) {
  if (updates.quantity !== undefined) item.quantity = updates.quantity;
  if (updates.unitPrice !== undefined) item.unitPrice = updates.unitPrice;
  if (updates.discount !== undefined) item.discount = updates.discount;

  item.totalPrice = (item.unitPrice || 0) * (item.quantity || 1);
  item.finalPrice = item.totalPrice - (item.discount || 0);
}

/**
 * Calculate pricing with strategies
 */
function calculatePackPricing(pack, { discountStrategy, taxRate = 0, insuranceOption }) {
  // Base amount
  const baseAmount = pack.items.reduce((sum, item) => sum + (item.finalPrice || 0), 0);

  // Apply discount strategy
  let totalDiscount = 0;
  if (discountStrategy) {
    if (discountStrategy.type === 'percentage') {
      totalDiscount = baseAmount * (discountStrategy.value / 100);
    } else if (discountStrategy.type === 'fixed') {
      totalDiscount = discountStrategy.value;
    } else if (discountStrategy.type === 'bulk') {
      const totalQty = pack.items.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQty >= discountStrategy.minQty) {
        totalDiscount = baseAmount * (discountStrategy.value / 100);
      }
    }
  }

  // Calculate taxes
  const taxableAmount = baseAmount - totalDiscount + (pack.shippingCost || 0);
  const taxes = taxableAmount * (taxRate / 100);

  // Insurance cost
  let insuranceCost = 0;
  if (insuranceOption && insuranceOption.enabled) {
    insuranceCost = (baseAmount - totalDiscount) * (insuranceOption.percentage / 100);
  }

  const finalAmount = baseAmount - totalDiscount + (pack.shippingCost || 0) + taxes + insuranceCost;

  return {
    baseAmount,
    totalDiscount,
    taxes,
    insuranceCost,
    finalAmount,
  };
}

/**
 * Process bulk pack operations
 */
async function processBulkOperation(action, packIds, accountId, updateData) {
  let result;

  switch (action) {
    case 'update':
      result = await Pack.updateMany(
        { $or: [{ id: { $in: packIds } }, { mlPackId: { $in: packIds } }], accountId },
        { ...updateData, dateLastUpdated: new Date() }
      );
      break;

    case 'delete':
      result = await Pack.deleteMany(
        { $or: [{ id: { $in: packIds } }, { mlPackId: { $in: packIds } }], accountId }
      );
      break;

    case 'status':
      result = await Pack.updateMany(
        { $or: [{ id: { $in: packIds } }, { mlPackId: { $in: packIds } }], accountId },
        { status: updateData.status, dateLastUpdated: new Date() }
      );
      break;

    default:
      return { error: 'Invalid action. Valid actions: update, delete, status' };
  }

  return { success: true, result };
}

/**
 * Fetch and group orders by pack_id from ML API
 */
async function fetchAndGroupOrdersByPack(headers, mlUserId) {
  const ordersResponse = await axios.get(`${ML_API_BASE}/orders/search`, {
    headers,
    params: {
      seller: mlUserId,
      limit: 100,
    },
  });

  const orders = ordersResponse.data.results || [];
  const packsMap = new Map();

  orders.forEach(order => {
    if (order.pack_id) {
      if (!packsMap.has(order.pack_id)) {
        packsMap.set(order.pack_id, {
          mlPackId: order.pack_id,
          orders: [],
          totalAmount: 0,
          dateCreated: new Date(order.date_created),
          buyer: order.buyer,
        });
      }
      const pack = packsMap.get(order.pack_id);
      pack.orders.push(order.id);
      pack.totalAmount += order.total_amount || 0;
    }
  });

  return packsMap;
}

/**
 * Sync pack from API data
 */
async function syncPackFromData(packData, accountId, userId) {
  try {
    const existingPack = await Pack.findOne({
      mlPackId: packData.mlPackId,
      accountId,
    });

    if (!existingPack) {
      const newPack = new Pack({
        accountId,
        userId,
        mlPackId: packData.mlPackId,
        buyer: packData.buyer,
        orders: packData.orders.map(orderId => ({ orderId })),
        totalAmount: packData.totalAmount,
        dateCreated: packData.dateCreated,
        status: 'pending',
        paymentStatus: 'pending',
      });
      await newPack.save();
      return true;
    }
    return false;
  } catch (error) {
    logger.error({
      action: 'SYNC_PACK_ERROR',
      mlPackId: packData.mlPackId,
      error: error.message,
    });
    return false;
  }
}

/**
 * GET /api/packs/:accountId
 * List packs with advanced filtering
 */
router.get('/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await getAndValidateAccount(accountId, req.user.userId);

    if (!account) {
      return handleError(res, 404, 'Account not found', {}, 'GET_PACKS_ERROR', {
        accountId,
        userId: req.user.userId,
      });
    }

    const filters = buildPackFilters(req.query);
    const result = await Pack.search(accountId, filters);

    return sendSuccess(res, {
      packs: result.packs.map(p => p.getSummary()),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (error) {
    return handleError(res, 500, 'Failed to fetch packs', error, 'GET_PACKS_ERROR', {
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/packs/:accountId/stats
 * Get pack statistics
 */
router.get('/:accountId/stats', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;

    const account = await getAndValidateAccount(accountId, req.user.userId);

    if (!account) {
      return handleError(res, 404, 'Account not found', {}, 'GET_PACK_STATS_ERROR', {
        accountId,
        userId: req.user.userId,
      });
    }

    const stats = await Pack.getAccountStats(
      accountId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return sendSuccess(res, stats);
  } catch (error) {
    return handleError(res, 500, 'Failed to fetch pack statistics', error, 'GET_PACK_STATS_ERROR', {
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/packs/:accountId/:packId
 * Get pack details
 */
router.get('/:accountId/:packId', authenticateToken, async (req, res) => {
  try {
    const { accountId, packId } = req.params;

    const pack = await findPackById(packId, accountId, req.user.userId);

    if (!pack) {
      return handleError(res, 404, 'Pack not found', {}, 'GET_PACK_ERROR', {
        packId,
        userId: req.user.userId,
      });
    }

    return sendSuccess(res, pack.getDetails());
  } catch (error) {
    return handleError(res, 500, 'Failed to fetch pack', error, 'GET_PACK_ERROR', {
      packId: req.params.packId,
      userId: req.user.userId,
    });
  }
});

/**
 * POST /api/packs/:accountId
 * Create new pack
 */
router.post('/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { buyer, items, shippingCost = 0, notes } = req.body;

    const account = await getAndValidateAccount(accountId, req.user.userId);

    if (!account) {
      return handleError(res, 404, 'Account not found', {}, 'CREATE_PACK_ERROR', {
        accountId,
        userId: req.user.userId,
      });
    }

    const validationError = validatePackCreation(buyer, items);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const packData = createPackData(accountId, req.user.userId, {
      buyer,
      items,
      shippingCost,
      notes,
    });

    const pack = new Pack(packData);
    pack.calculateTotals();
    await pack.save();

    logger.info({
      action: 'CREATE_PACK',
      accountId,
      packId: pack.id,
      userId: req.user.userId,
    });

    return sendSuccess(res, pack.getDetails(), 'Pack created successfully', 201);
  } catch (error) {
    return handleError(res, 500, 'Failed to create pack', error, 'CREATE_PACK_ERROR', {
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * PUT /api/packs/:accountId/:packId
 * Update pack
 */
router.put('/:accountId/:packId', authenticateToken, async (req, res) => {
  try {
    const { accountId, packId } = req.params;
    const { status, paymentStatus, shippingCost, notes, tags } = req.body;

    const pack = await findPackById(packId, accountId, req.user.userId);

    if (!pack) {
      return handleError(res, 404, 'Pack not found', {}, 'UPDATE_PACK_ERROR', {
        packId,
        userId: req.user.userId,
      });
    }

    updatePackFields(pack, { status, paymentStatus, shippingCost, notes, tags });
    await pack.save();

    logger.info({
      action: 'UPDATE_PACK',
      accountId,
      packId: pack.id,
      userId: req.user.userId,
    });

    return sendSuccess(res, pack.getDetails(), 'Pack updated successfully');
  } catch (error) {
    return handleError(res, 500, 'Failed to update pack', error, 'UPDATE_PACK_ERROR', {
      packId: req.params.packId,
      userId: req.user.userId,
    });
  }
});

/**
 * DELETE /api/packs/:accountId/:packId
 * Delete pack
 */
router.delete('/:accountId/:packId', authenticateToken, async (req, res) => {
  try {
    const { accountId, packId } = req.params;

    const pack = await findPackById(packId, accountId, req.user.userId);

    if (!pack) {
      return handleError(res, 404, 'Pack not found', {}, 'DELETE_PACK_ERROR', {
        packId,
        userId: req.user.userId,
      });
    }

    if (!['pending', 'cancelled'].includes(pack.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete pack with status: ${pack.status}`,
      });
    }

    await Pack.deleteOne({ _id: pack._id });

    logger.info({
      action: 'DELETE_PACK',
      accountId,
      packId: pack.id,
      userId: req.user.userId,
    });

    return sendSuccess(res, {}, 'Pack deleted successfully');
  } catch (error) {
    return handleError(res, 500, 'Failed to delete pack', error, 'DELETE_PACK_ERROR', {
      packId: req.params.packId,
      userId: req.user.userId,
    });
  }
});

/**
 * POST /api/packs/:accountId/:packId/items
 * Add item to pack
 */
router.post('/:accountId/:packId/items', authenticateToken, async (req, res) => {
  try {
    const { accountId, packId } = req.params;
    const { itemId, mlItemId, title, quantity, unitPrice, discount = 0 } = req.body;

    const validationError = validateItemData({ itemId, title, quantity, unitPrice });
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const pack = await findPackById(packId, accountId, req.user.userId);

    if (!pack) {
      return handleError(res, 404, 'Pack not found', {}, 'ADD_PACK_ITEM_ERROR', {
        packId,
        userId: req.user.userId,
      });
    }

    const addResult = addItemToPack(pack, { itemId, mlItemId, title, quantity, unitPrice, discount });
    if (addResult.error) {
      return res.status(400).json({
        success: false,
        message: addResult.error,
      });
    }

    pack.calculateTotals();
    pack.dateLastUpdated = new Date();
    await pack.save();

    logger.info({
      action: 'ADD_PACK_ITEM',
      accountId,
      packId: pack.id,
      itemId,
      userId: req.user.userId,
    });

    return sendSuccess(res, pack.getDetails(), 'Item added to pack', 201);
  } catch (error) {
    return handleError(res, 500, 'Failed to add item to pack', error, 'ADD_PACK_ITEM_ERROR', {
      packId: req.params.packId,
      userId: req.user.userId,
    });
  }
});

/**
 * PUT /api/packs/:accountId/:packId/items/:itemId
 * Update item in pack
 */
router.put('/:accountId/:packId/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const { accountId, packId, itemId } = req.params;
    const { quantity, unitPrice, discount } = req.body;

    const pack = await findPackById(packId, accountId, req.user.userId);

    if (!pack) {
      return handleError(res, 404, 'Pack not found', {}, 'UPDATE_PACK_ITEM_ERROR', {
        packId,
        userId: req.user.userId,
      });
    }

    const item = pack.items.find(i => i.itemId === itemId);
    if (!item) {
      return handleError(res, 404, 'Item not found in pack', {}, 'UPDATE_PACK_ITEM_ERROR', {
        packId,
        itemId,
        userId: req.user.userId,
      });
    }

    updateItemInPack(item, { quantity, unitPrice, discount });

    pack.calculateTotals();
    pack.dateLastUpdated = new Date();
    await pack.save();

    logger.info({
      action: 'UPDATE_PACK_ITEM',
      accountId,
      packId: pack.id,
      itemId,
      userId: req.user.userId,
    });

    return sendSuccess(res, pack.getDetails(), 'Item updated');
  } catch (error) {
    return handleError(res, 500, 'Failed to update pack item', error, 'UPDATE_PACK_ITEM_ERROR', {
      packId: req.params.packId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });
  }
});

/**
 * DELETE /api/packs/:accountId/:packId/items/:itemId
 * Remove item from pack
 */
router.delete('/:accountId/:packId/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const { accountId, packId, itemId } = req.params;

    const pack = await findPackById(packId, accountId, req.user.userId);

    if (!pack) {
      return handleError(res, 404, 'Pack not found', {}, 'REMOVE_PACK_ITEM_ERROR', {
        packId,
        userId: req.user.userId,
      });
    }

    const initialLength = pack.items.length;
    pack.items = pack.items.filter(i => i.itemId !== itemId);

    if (pack.items.length === initialLength) {
      return handleError(res, 404, 'Item not found in pack', {}, 'REMOVE_PACK_ITEM_ERROR', {
        packId,
        itemId,
        userId: req.user.userId,
      });
    }

    pack.calculateTotals();
    pack.dateLastUpdated = new Date();
    await pack.save();

    logger.info({
      action: 'REMOVE_PACK_ITEM',
      accountId,
      packId: pack.id,
      itemId,
      userId: req.user.userId,
    });

    return sendSuccess(res, pack.getDetails(), 'Item removed from pack');
  } catch (error) {
    return handleError(res, 500, 'Failed to remove pack item', error, 'REMOVE_PACK_ITEM_ERROR', {
      packId: req.params.packId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });
  }
});

/**
 * POST /api/packs/:accountId/:packId/pricing
 * Calculate pack pricing with strategies
 */
router.post('/:accountId/:packId/pricing', authenticateToken, async (req, res) => {
  try {
    const { accountId, packId } = req.params;
    const { discountStrategy, taxRate = 0, insuranceOption } = req.body;

    const pack = await findPackById(packId, accountId, req.user.userId);

    if (!pack) {
      return handleError(res, 404, 'Pack not found', {}, 'CALCULATE_PACK_PRICING_ERROR', {
        packId,
        userId: req.user.userId,
      });
    }

    const pricing = calculatePackPricing(pack, { discountStrategy, taxRate, insuranceOption });

    pack.discountAmount = pricing.totalDiscount;
    pack.taxAmount = pricing.taxes;
    pack.grossAmount = pricing.baseAmount;
    pack.finalAmount = pricing.finalAmount;

    if (insuranceOption && insuranceOption.enabled) {
      pack.hasInsurance = true;
    }

    await pack.save();

    return sendSuccess(res, {
      baseAmount: pricing.baseAmount,
      discountAmount: pricing.totalDiscount,
      shippingCost: pack.shippingCost || 0,
      taxAmount: pricing.taxes,
      insuranceCost: pricing.insuranceCost,
      finalAmount: pricing.finalAmount,
      breakdown: {
        items: pricing.baseAmount,
        discount: -pricing.totalDiscount,
        shipping: pack.shippingCost || 0,
        taxes: pricing.taxes,
        insurance: pricing.insuranceCost,
        total: pricing.finalAmount,
      },
    }, 'Pricing calculated');
  } catch (error) {
    return handleError(res, 500, 'Failed to calculate pricing', error, 'CALCULATE_PACK_PRICING_ERROR', {
      packId: req.params.packId,
      userId: req.user.userId,
    });
  }
});

/**
 * POST /api/packs/:accountId/bulk
 * Bulk operations on packs
 */
router.post('/:accountId/bulk', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { action, packIds, updateData } = req.body;

    if (!action || !packIds || packIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Action and packIds are required',
      });
    }

    const account = await getAndValidateAccount(accountId, req.user.userId);

    if (!account) {
      return handleError(res, 404, 'Account not found', {}, 'BULK_PACKS_ERROR', {
        accountId,
        userId: req.user.userId,
      });
    }

    const bulkResult = await processBulkOperation(action, packIds, accountId, updateData);
    if (bulkResult.error) {
      return res.status(400).json({
        success: false,
        message: bulkResult.error,
      });
    }

    logger.info({
      action: `BULK_${action.toUpperCase()}`,
      accountId,
      count: packIds.length,
      userId: req.user.userId,
    });

    return sendSuccess(res, {
      action,
      matched: bulkResult.result.matchedCount,
      modified: bulkResult.result.modifiedCount,
      deleted: bulkResult.result.deletedCount,
    }, `Bulk ${action} completed`);
  } catch (error) {
    return handleError(res, 500, 'Failed to perform bulk operation', error, 'BULK_PACKS_ERROR', {
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * POST /api/packs/:accountId/sync
 * Sync packs from ML API
 */
router.post('/:accountId/sync', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;

    logger.info({
      action: 'SYNC_PACKS_STARTED',
      accountId,
      userId: req.user.userId,
    });

    const headers = buildHeaders(account.accessToken);
    const packsMap = await fetchAndGroupOrdersByPack(headers, account.mlUserId);

    let syncedCount = 0;
    for (const [, packData] of packsMap) {
      const synced = await syncPackFromData(packData, accountId, req.user.userId);
      if (synced) syncedCount++;
    }

    logger.info({
      action: 'SYNC_PACKS_COMPLETED',
      accountId,
      userId: req.user.userId,
      syncedCount,
    });

    return sendSuccess(res, {
      syncedCount,
      totalFound: packsMap.size,
    }, `Synced ${syncedCount} packs`);
  } catch (error) {
    return handleError(res, 500, 'Failed to sync packs', error, 'SYNC_PACKS_ERROR', {
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

module.exports = router;
