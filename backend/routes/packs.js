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

/**
 * GET /api/packs/:accountId
 * List packs with advanced filtering
 */
router.get('/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const {
      limit = 20,
      offset = 0,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      buyerId,
      sort = '-dateCreated',
    } = req.query;

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

    // Build search filters
    const filters = {
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      buyerId,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort,
    };

    const result = await Pack.search(accountId, filters);

    res.json({
      success: true,
      data: {
        packs: result.packs.map(p => p.getSummary()),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_PACKS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch packs',
      error: error.message,
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

    const stats = await Pack.getAccountStats(
      accountId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({
      action: 'GET_PACK_STATS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch pack statistics',
      error: error.message,
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

    const pack = await Pack.findOne({
      $or: [{ id: packId }, { mlPackId: packId }],
      accountId,
      userId: req.user.userId,
    });

    if (!pack) {
      return res.status(404).json({
        success: false,
        message: 'Pack not found',
      });
    }

    res.json({
      success: true,
      data: pack.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'GET_PACK_ERROR',
      packId: req.params.packId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch pack',
      error: error.message,
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

    // Validate required fields
    if (!buyer || !buyer.id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Buyer information and items are required',
      });
    }

    // Create pack
    const pack = new Pack({
      accountId,
      userId: req.user.userId,
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
    });

    // Calculate totals
    pack.calculateTotals();

    await pack.save();

    logger.info({
      action: 'CREATE_PACK',
      accountId,
      packId: pack.id,
      userId: req.user.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Pack created successfully',
      data: pack.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'CREATE_PACK_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to create pack',
      error: error.message,
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

    const pack = await Pack.findOne({
      $or: [{ id: packId }, { mlPackId: packId }],
      accountId,
      userId: req.user.userId,
    });

    if (!pack) {
      return res.status(404).json({
        success: false,
        message: 'Pack not found',
      });
    }

    // Update allowed fields
    if (status) pack.status = status;
    if (paymentStatus) pack.paymentStatus = paymentStatus;
    if (shippingCost !== undefined) pack.shippingCost = shippingCost;
    if (notes) pack.notes = notes;
    if (tags) pack.tags = tags;

    pack.dateLastUpdated = new Date();
    await pack.save();

    logger.info({
      action: 'UPDATE_PACK',
      accountId,
      packId: pack.id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Pack updated successfully',
      data: pack.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_PACK_ERROR',
      packId: req.params.packId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update pack',
      error: error.message,
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

    const pack = await Pack.findOne({
      $or: [{ id: packId }, { mlPackId: packId }],
      accountId,
      userId: req.user.userId,
    });

    if (!pack) {
      return res.status(404).json({
        success: false,
        message: 'Pack not found',
      });
    }

    // Only allow deletion of pending or cancelled packs
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

    res.json({
      success: true,
      message: 'Pack deleted successfully',
    });
  } catch (error) {
    logger.error({
      action: 'DELETE_PACK_ERROR',
      packId: req.params.packId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete pack',
      error: error.message,
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

    if (!itemId || !title || !quantity || !unitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Item ID, title, quantity, and unit price are required',
      });
    }

    const pack = await Pack.findOne({
      $or: [{ id: packId }, { mlPackId: packId }],
      accountId,
      userId: req.user.userId,
    });

    if (!pack) {
      return res.status(404).json({
        success: false,
        message: 'Pack not found',
      });
    }

    // Check if item already exists
    const existingItem = pack.items.find(i => i.itemId === itemId);
    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Item already exists in pack',
      });
    }

    const finalPrice = (unitPrice * quantity) - discount;
    pack.items.push({
      itemId,
      mlItemId,
      title,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      discount,
      finalPrice,
    });

    // Recalculate totals
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

    res.status(201).json({
      success: true,
      message: 'Item added to pack',
      data: pack.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'ADD_PACK_ITEM_ERROR',
      packId: req.params.packId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to add item to pack',
      error: error.message,
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

    const pack = await Pack.findOne({
      $or: [{ id: packId }, { mlPackId: packId }],
      accountId,
      userId: req.user.userId,
    });

    if (!pack) {
      return res.status(404).json({
        success: false,
        message: 'Pack not found',
      });
    }

    const item = pack.items.find(i => i.itemId === itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in pack',
      });
    }

    // Update item
    if (quantity !== undefined) item.quantity = quantity;
    if (unitPrice !== undefined) item.unitPrice = unitPrice;
    if (discount !== undefined) item.discount = discount;

    // Recalculate item prices
    item.totalPrice = (item.unitPrice || 0) * (item.quantity || 1);
    item.finalPrice = item.totalPrice - (item.discount || 0);

    // Recalculate pack totals
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

    res.json({
      success: true,
      message: 'Item updated',
      data: pack.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_PACK_ITEM_ERROR',
      packId: req.params.packId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update pack item',
      error: error.message,
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

    const pack = await Pack.findOne({
      $or: [{ id: packId }, { mlPackId: packId }],
      accountId,
      userId: req.user.userId,
    });

    if (!pack) {
      return res.status(404).json({
        success: false,
        message: 'Pack not found',
      });
    }

    const initialLength = pack.items.length;
    pack.items = pack.items.filter(i => i.itemId !== itemId);

    if (pack.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in pack',
      });
    }

    // Recalculate totals
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

    res.json({
      success: true,
      message: 'Item removed from pack',
      data: pack.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'REMOVE_PACK_ITEM_ERROR',
      packId: req.params.packId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to remove pack item',
      error: error.message,
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

    const pack = await Pack.findOne({
      $or: [{ id: packId }, { mlPackId: packId }],
      accountId,
      userId: req.user.userId,
    });

    if (!pack) {
      return res.status(404).json({
        success: false,
        message: 'Pack not found',
      });
    }

    // Calculate base amount
    let baseAmount = pack.items.reduce((sum, item) => sum + (item.finalPrice || 0), 0);

    // Apply discount strategy
    let totalDiscount = 0;
    if (discountStrategy) {
      if (discountStrategy.type === 'percentage') {
        totalDiscount = baseAmount * (discountStrategy.value / 100);
      } else if (discountStrategy.type === 'fixed') {
        totalDiscount = discountStrategy.value;
      } else if (discountStrategy.type === 'bulk') {
        // Discount based on quantity
        const totalQty = pack.items.reduce((sum, item) => sum + item.quantity, 0);
        if (totalQty >= discountStrategy.minQty) {
          totalDiscount = baseAmount * (discountStrategy.value / 100);
        }
      }
    }

    // Calculate taxes
    const taxableAmount = baseAmount - totalDiscount + (pack.shippingCost || 0);
    const taxes = taxableAmount * (taxRate / 100);

    // Add insurance if requested
    let insuranceCost = 0;
    if (insuranceOption && insuranceOption.enabled) {
      insuranceCost = (baseAmount - totalDiscount) * (insuranceOption.percentage / 100);
      pack.hasInsurance = true;
    }

    // Update pack
    pack.discountAmount = totalDiscount;
    pack.taxAmount = taxes;
    pack.grossAmount = baseAmount;
    pack.finalAmount = baseAmount - totalDiscount + (pack.shippingCost || 0) + taxes + insuranceCost;

    await pack.save();

    res.json({
      success: true,
      message: 'Pricing calculated',
      data: {
        baseAmount,
        discountAmount: totalDiscount,
        shippingCost: pack.shippingCost || 0,
        taxAmount: taxes,
        insuranceCost,
        finalAmount: pack.finalAmount,
        breakdown: {
          items: baseAmount,
          discount: -totalDiscount,
          shipping: pack.shippingCost || 0,
          taxes,
          insurance: insuranceCost,
          total: pack.finalAmount,
        },
      },
    });
  } catch (error) {
    logger.error({
      action: 'CALCULATE_PACK_PRICING_ERROR',
      packId: req.params.packId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to calculate pricing',
      error: error.message,
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
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Valid actions: update, delete, status',
        });
    }

    logger.info({
      action: `BULK_${action.toUpperCase()}`,
      accountId,
      count: packIds.length,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      data: {
        action,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        deleted: result.deletedCount,
      },
    });
  } catch (error) {
    logger.error({
      action: 'BULK_PACKS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk operation',
      error: error.message,
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

    // Fetch orders and group by pack_id
    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const ordersResponse = await axios.get(`${ML_API_BASE}/orders/search`, {
      headers,
      params: {
        seller: account.mlUserId,
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

    let syncedCount = 0;
    for (const [, packData] of packsMap) {
      try {
        const existingPack = await Pack.findOne({
          mlPackId: packData.mlPackId,
          accountId,
        });

        if (!existingPack) {
          const newPack = new Pack({
            accountId,
            userId: req.user.userId,
            mlPackId: packData.mlPackId,
            buyer: packData.buyer,
            orders: packData.orders.map(orderId => ({ orderId })),
            totalAmount: packData.totalAmount,
            dateCreated: packData.dateCreated,
            status: 'pending',
            paymentStatus: 'pending',
          });
          await newPack.save();
          syncedCount++;
        }
      } catch (error) {
        logger.error({
          action: 'SYNC_PACK_ERROR',
          mlPackId: packData.mlPackId,
          error: error.message,
        });
      }
    }

    logger.info({
      action: 'SYNC_PACKS_COMPLETED',
      accountId,
      userId: req.user.userId,
      syncedCount,
    });

    res.json({
      success: true,
      message: `Synced ${syncedCount} packs`,
      data: {
        syncedCount,
        totalFound: packsMap.size,
      },
    });
  } catch (error) {
    logger.error({
      action: 'SYNC_PACKS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to sync packs',
      error: error.message,
    });
  }
});

module.exports = router;
