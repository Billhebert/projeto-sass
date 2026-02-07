/**
 * Promotions Routes
 * Manage promotions and deals from Mercado Livre
 *
 * GET    /api/promotions                              - List all promotions for user
 * GET    /api/promotions/:accountId                   - List promotions for specific account
 * GET    /api/promotions/:accountId/active            - List active promotions
 * GET    /api/promotions/:accountId/campaigns         - List available campaigns
 * GET    /api/promotions/:accountId/:promotionId      - Get promotion details
 * POST   /api/promotions/:accountId                   - Create promotion
 * PUT    /api/promotions/:accountId/:promotionId      - Update promotion
 * DELETE /api/promotions/:accountId/:promotionId      - Cancel/delete promotion
 * POST   /api/promotions/:accountId/sync              - Sync promotions from ML
 * GET    /api/promotions/:accountId/stats             - Get promotion statistics
 */

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const Promotion = require('../db/models/Promotion');
const MLAccount = require('../db/models/MLAccount');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * GET /api/promotions
 * List all promotions for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0, status, type, sort = '-startDate' } = req.query;

    const query = { userId: req.user.userId };
    if (status) query.status = status;
    if (type) query.type = type;

    const promotions = await Promotion.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Promotion.countDocuments(query);

    res.json({
      success: true,
      data: {
        promotions: promotions.map(p => p.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_PROMOTIONS_ERROR',
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotions',
      error: error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/deals
 * Get deals (DOD, Lightning offers) for an account
 */
router.get('/:accountId/deals', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get deals from ML API
    let deals = [];
    
    try {
      // Try to get seller deals/offers
      const dealsResponse = await axios.get(
        `${ML_API_BASE}/users/${account.mlUserId}/deals/search`,
        { headers }
      );
      deals = dealsResponse.data.results || [];
    } catch (err) {
      logger.warn({
        action: 'FETCH_DEALS_ERROR',
        accountId,
        error: err.response?.data || err.message,
      });
    }

    // Also try to get lightning deals
    try {
      const lightningResponse = await axios.get(
        `${ML_API_BASE}/seller-promotions/users/${account.mlUserId}`,
        { 
          headers,
          params: { 
            app_version: 'v2',
            promotion_type: 'LIGHTNING'
          }
        }
      );
      
      if (lightningResponse.data?.results) {
        const lightningDeals = lightningResponse.data.results.map(deal => ({
          ...deal,
          type: 'lightning'
        }));
        deals = [...deals, ...lightningDeals];
      }
    } catch (err) {
      // Lightning deals might not be available for all accounts
      logger.debug('Lightning deals not available:', err.message);
    }

    res.json({
      success: true,
      data: {
        deals,
        total: deals.length,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_DEALS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch deals',
      error: error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/stats
 * Get promotion statistics for an account
 */
router.get('/:accountId/stats', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

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

    const { stats, activeCount } = await Promotion.getStats(accountId);

    const totalPromotions = await Promotion.countDocuments({
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: {
        accountId,
        promotions: {
          total: totalPromotions,
          active: activeCount,
        },
        statusBreakdown: stats,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_PROMOTION_STATS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get promotion statistics',
      error: error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/active
 * List active promotions for specific account
 */
router.get('/:accountId/active', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account belongs to user
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

    const promotions = await Promotion.findActive(accountId);

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        promotions: promotions.map(p => p.getSummary()),
        total: promotions.length,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ACTIVE_PROMOTIONS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch active promotions',
      error: error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/campaigns
 * List available campaigns from ML
 */
router.get('/:accountId/campaigns', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get available deals/campaigns
    const dealsResponse = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}/deals/search`,
      { headers }
    ).catch(err => {
      logger.warn({
        action: 'FETCH_DEALS_ERROR',
        accountId,
        error: err.response?.data || err.message,
      });
      return { data: { results: [] } };
    });

    res.json({
      success: true,
      data: {
        campaigns: dealsResponse.data.results || [],
        paging: dealsResponse.data.paging || { total: 0 },
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_CAMPAIGNS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns',
      error: error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId
 * List promotions for specific account
 */
router.get('/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 100, offset = 0, status, type, sort = '-startDate' } = req.query;

    // Verify account belongs to user
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

    const query = { accountId, userId: req.user.userId };
    if (status) query.status = status;
    if (type) query.type = type;

    const promotions = await Promotion.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Promotion.countDocuments(query);

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        promotions: promotions.map(p => p.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ACCOUNT_PROMOTIONS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotions',
      error: error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/:promotionId
 * Get detailed promotion information
 */
router.get('/:accountId/:promotionId', authenticateToken, async (req, res) => {
  try {
    const { accountId, promotionId } = req.params;

    const promotion = await Promotion.findOne({
      $or: [{ id: promotionId }, { mlPromotionId: promotionId }],
      accountId,
      userId: req.user.userId,
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found',
      });
    }

    res.json({
      success: true,
      data: promotion.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'GET_PROMOTION_ERROR',
      promotionId: req.params.promotionId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotion',
      error: error.message,
    });
  }
});

/**
 * POST /api/promotions/:accountId
 * Create a new promotion
 */
router.post('/:accountId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { type, itemId, discountPercentage, startDate, finishDate, dealPrice } = req.body;
    const account = req.mlAccount;

    if (!type || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Type and itemId are required',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Create promotion on ML
    const promotionData = {
      type,
      deal_price: dealPrice,
      start_date: startDate,
      finish_date: finishDate,
    };

    const response = await axios.post(
      `${ML_API_BASE}/seller-promotions/items/${itemId}`,
      promotionData,
      { headers }
    );

    // Save to local DB
    const promotion = new Promotion({
      accountId,
      userId: req.user.userId,
      mlPromotionId: response.data.id || `local_${Date.now()}`,
      type,
      status: response.data.status || 'pending',
      startDate: new Date(startDate),
      finishDate: new Date(finishDate),
      items: [{
        itemId,
        promotionPrice: dealPrice,
        discountPercentage,
      }],
      discount: {
        type: 'percentage',
        value: discountPercentage,
      },
    });
    await promotion.save();

    logger.info({
      action: 'PROMOTION_CREATED',
      promotionId: promotion.mlPromotionId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Promotion created successfully',
      data: promotion.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'CREATE_PROMOTION_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to create promotion',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * PUT /api/promotions/:accountId/:promotionId
 * Update a promotion
 */
router.put('/:accountId/:promotionId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, promotionId } = req.params;
    const { status, finishDate } = req.body;
    const account = req.mlAccount;

    const promotion = await Promotion.findOne({
      $or: [{ id: promotionId }, { mlPromotionId: promotionId }],
      accountId,
      userId: req.user.userId,
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const updateData = {};
    if (status) updateData.status = status;
    if (finishDate) updateData.finish_date = finishDate;

    // Update on ML
    await axios.put(
      `${ML_API_BASE}/seller-promotions/${promotion.mlPromotionId}`,
      updateData,
      { headers }
    ).catch(err => {
      logger.warn({
        action: 'UPDATE_PROMOTION_ML_ERROR',
        promotionId: promotion.mlPromotionId,
        error: err.response?.data || err.message,
      });
    });

    // Update local
    if (status) promotion.status = status;
    if (finishDate) promotion.finishDate = new Date(finishDate);
    promotion.lastSyncedAt = new Date();
    await promotion.save();

    logger.info({
      action: 'PROMOTION_UPDATED',
      promotionId: promotion.mlPromotionId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Promotion updated successfully',
      data: promotion.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_PROMOTION_ERROR',
      promotionId: req.params.promotionId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update promotion',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/promotions/:accountId/:promotionId
 * Cancel/delete a promotion
 */
router.delete('/:accountId/:promotionId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, promotionId } = req.params;
    const account = req.mlAccount;

    const promotion = await Promotion.findOne({
      $or: [{ id: promotionId }, { mlPromotionId: promotionId }],
      accountId,
      userId: req.user.userId,
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Cancel on ML
    await axios.delete(
      `${ML_API_BASE}/seller-promotions/${promotion.mlPromotionId}`,
      { headers }
    ).catch(err => {
      logger.warn({
        action: 'DELETE_PROMOTION_ML_ERROR',
        promotionId: promotion.mlPromotionId,
        error: err.response?.data || err.message,
      });
    });

    // Update local
    promotion.status = 'cancelled';
    await promotion.save();

    logger.info({
      action: 'PROMOTION_CANCELLED',
      promotionId: promotion.mlPromotionId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Promotion cancelled successfully',
    });
  } catch (error) {
    logger.error({
      action: 'DELETE_PROMOTION_ERROR',
      promotionId: req.params.promotionId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to cancel promotion',
      error: error.message,
    });
  }
});

/**
 * POST /api/promotions/:accountId/sync
 * Sync promotions from Mercado Livre
 */
router.post('/:accountId/sync', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;

    logger.info({
      action: 'PROMOTIONS_SYNC_STARTED',
      accountId,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get seller promotions
    const promotionsResponse = await axios.get(
      `${ML_API_BASE}/seller-promotions/search`,
      {
        headers,
        params: {
          seller_id: account.mlUserId,
        },
      }
    ).catch(err => {
      logger.warn({
        action: 'FETCH_PROMOTIONS_ERROR',
        accountId,
        error: err.response?.data || err.message,
      });
      return { data: { results: [] } };
    });

    const mlPromotions = promotionsResponse.data.results || [];

    // Save promotions
    const savedPromotions = await savePromotions(accountId, req.user.userId, mlPromotions);

    logger.info({
      action: 'PROMOTIONS_SYNC_COMPLETED',
      accountId,
      userId: req.user.userId,
      promotionsCount: savedPromotions.length,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Synchronized ${savedPromotions.length} promotions`,
      data: {
        accountId,
        promotionsCount: savedPromotions.length,
        promotions: savedPromotions.map(p => p.getSummary()),
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({
      action: 'PROMOTIONS_SYNC_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to sync promotions',
      error: error.message,
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Save or update promotions in database
 */
async function savePromotions(accountId, userId, mlPromotions) {
  const savedPromotions = [];

  for (const mlPromotion of mlPromotions) {
    try {
      const promotionData = {
        accountId,
        userId,
        mlPromotionId: mlPromotion.id?.toString() || `ml_${Date.now()}`,
        type: mlPromotion.type || 'DEAL',
        name: mlPromotion.name,
        description: mlPromotion.description,
        status: mlPromotion.status || 'pending',
        startDate: mlPromotion.start_date ? new Date(mlPromotion.start_date) : new Date(),
        finishDate: mlPromotion.finish_date ? new Date(mlPromotion.finish_date) : new Date(),
        dateCreated: mlPromotion.date_created ? new Date(mlPromotion.date_created) : new Date(),
        items: (mlPromotion.items || []).map(item => ({
          itemId: item.id || item.item_id,
          title: item.title,
          originalPrice: item.original_price,
          promotionPrice: item.deal_price || item.promotion_price,
          discountPercentage: item.discount_percentage,
          stock: item.stock,
          dealStock: item.deal_stock,
          soldQuantity: item.sold_quantity,
          status: item.status,
        })),
        discount: mlPromotion.discount || null,
        budget: mlPromotion.budget || null,
        benefits: mlPromotion.benefits || null,
        statistics: mlPromotion.statistics || null,
        tags: mlPromotion.tags || [],
        lastSyncedAt: new Date(),
      };

      // Find or create promotion
      let promotion = await Promotion.findOne({
        accountId,
        mlPromotionId: promotionData.mlPromotionId,
      });

      if (promotion) {
        Object.assign(promotion, promotionData);
        await promotion.save();
      } else {
        promotion = new Promotion(promotionData);
        await promotion.save();
      }

      savedPromotions.push(promotion);
    } catch (error) {
      logger.error({
        action: 'SAVE_PROMOTION_ERROR',
        mlPromotionId: mlPromotion.id,
        accountId,
        error: error.message,
      });
    }
  }

  return savedPromotions;
}

// ============================================
// SELLER PROMOTIONS - ADVANCED ENDPOINTS (API v2)
// ============================================

/**
 * GET /api/promotions/:accountId/seller-promotions
 * Get all seller promotions directly from ML API
 */
router.get('/:accountId/seller-promotions', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const account = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/seller-promotions/users/${account.mlUserId}`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        params: { app_version: 'v2' },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching seller promotions:', {
      error: error.message,
      response: error.response?.data,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/seller-promotions/:promotionId
 * Get promotion details
 */
router.get('/:accountId/seller-promotions/:promotionId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { promotionId } = req.params;
    const { promotion_type = 'DEAL' } = req.query;
    const account = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/seller-promotions/promotions/${promotionId}`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        params: { 
          promotion_type,
          app_version: 'v2',
        },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching promotion details:', {
      error: error.message,
      promotionId: req.params.promotionId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/seller-promotions/:promotionId/items
 * Get items in a promotion
 */
router.get('/:accountId/seller-promotions/:promotionId/items', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { promotionId } = req.params;
    const { 
      promotion_type = 'DEAL', 
      status,
      status_item,
      item_id,
      limit = 50,
      search_after,
    } = req.query;
    const account = req.mlAccount;

    const params = {
      promotion_type,
      app_version: 'v2',
      limit,
    };

    if (status) params.status = status;
    if (status_item) params.status_item = status_item;
    if (item_id) params.item_id = item_id;
    if (search_after) params.search_after = search_after;

    const response = await axios.get(
      `${ML_API_BASE}/seller-promotions/promotions/${promotionId}/items`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        params,
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching promotion items:', {
      error: error.message,
      promotionId: req.params.promotionId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/items/:itemId/promotions
 * Get all promotions for a specific item
 */
router.get('/:accountId/items/:itemId/promotions', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { itemId } = req.params;
    const account = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/seller-promotions/items/${itemId}`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        params: { app_version: 'v2' },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching item promotions:', {
      error: error.message,
      itemId: req.params.itemId,
    });

    if (error.response?.status === 404) {
      return res.json({
        success: true,
        data: [],
        message: 'No promotions found for this item',
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/promotions/:accountId/seller-promotions/:promotionId/items
 * Add items to a promotion
 */
router.post('/:accountId/seller-promotions/:promotionId/items', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { promotionId } = req.params;
    const { items, promotion_type = 'DEAL' } = req.body;
    const account = req.mlAccount;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required',
      });
    }

    const response = await axios.post(
      `${ML_API_BASE}/seller-promotions/promotions/${promotionId}/items`,
      items,
      {
        headers: { 
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
        },
        params: { 
          promotion_type,
          app_version: 'v2',
        },
      }
    );

    logger.info('Items added to promotion:', {
      promotionId,
      itemsCount: items.length,
      accountId: req.params.accountId,
    });

    res.json({
      success: true,
      data: response.data,
      message: 'Items added to promotion successfully',
    });
  } catch (error) {
    logger.error('Error adding items to promotion:', {
      error: error.message,
      response: error.response?.data,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * DELETE /api/promotions/:accountId/items/:itemId/all
 * Remove all promotions from an item (mass delete)
 */
router.delete('/:accountId/items/:itemId/all', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { itemId } = req.params;
    const account = req.mlAccount;

    const response = await axios.delete(
      `${ML_API_BASE}/seller-promotions/items/${itemId}`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        params: { app_version: 'v2' },
      }
    );

    logger.info('All promotions removed from item:', {
      itemId,
      accountId: req.params.accountId,
    });

    res.json({
      success: true,
      data: response.data,
      message: 'Promotions removed successfully',
    });
  } catch (error) {
    logger.error('Error removing promotions from item:', {
      error: error.message,
      itemId: req.params.itemId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/candidates/:candidateId
 * Get candidate details for a promotion
 */
router.get('/:accountId/candidates/:candidateId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { candidateId } = req.params;
    const account = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/seller-promotions/candidates/${candidateId}`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        params: { app_version: 'v2' },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching candidate details:', {
      error: error.message,
      candidateId: req.params.candidateId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/offers/:offerId
 * Get offer details
 */
router.get('/:accountId/offers/:offerId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { offerId } = req.params;
    const account = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/seller-promotions/offers/${offerId}`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        params: { app_version: 'v2' },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching offer details:', {
      error: error.message,
      offerId: req.params.offerId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/exclusion-list/seller
 * Check if seller is excluded from automatic promotions
 */
router.get('/:accountId/exclusion-list/seller', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const account = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/seller-promotions/exclusion-list/seller`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        params: { app_version: 'v2' },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error checking seller exclusion:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/promotions/:accountId/exclusion-list/seller
 * Add or remove seller from exclusion list
 */
router.post('/:accountId/exclusion-list/seller', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { exclusion_status } = req.body;
    const account = req.mlAccount;

    if (typeof exclusion_status !== 'boolean' && exclusion_status !== 'true' && exclusion_status !== 'false') {
      return res.status(400).json({
        success: false,
        error: 'exclusion_status must be true or false',
      });
    }

    const response = await axios.post(
      `${ML_API_BASE}/seller-promotions/exclusion-list/seller`,
      { exclusion_status: String(exclusion_status) },
      {
        headers: { 
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
        },
        params: { app_version: 'v2' },
      }
    );

    logger.info('Seller exclusion status updated:', {
      accountId: req.params.accountId,
      exclusionStatus: exclusion_status,
    });

    res.json({
      success: true,
      data: response.data,
      message: `Seller ${exclusion_status === 'true' || exclusion_status === true ? 'excluded from' : 'included in'} automatic promotions`,
    });
  } catch (error) {
    logger.error('Error updating seller exclusion:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/exclusion-list/item/:itemId
 * Check if item is excluded from automatic promotions
 */
router.get('/:accountId/exclusion-list/item/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { itemId } = req.params;
    const account = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/seller-promotions/exclusion-list/seller/${itemId}`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        params: { app_version: 'v2' },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error checking item exclusion:', {
      error: error.message,
      itemId: req.params.itemId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/promotions/:accountId/exclusion-list/item
 * Add or remove item from exclusion list
 */
router.post('/:accountId/exclusion-list/item', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { item_id, exclusion_status } = req.body;
    const account = req.mlAccount;

    if (!item_id) {
      return res.status(400).json({
        success: false,
        error: 'item_id is required',
      });
    }

    if (typeof exclusion_status !== 'boolean' && exclusion_status !== 'true' && exclusion_status !== 'false') {
      return res.status(400).json({
        success: false,
        error: 'exclusion_status must be true or false',
      });
    }

    const response = await axios.post(
      `${ML_API_BASE}/seller-promotions/exclusion-list/item`,
      { 
        item_id,
        exclusion_status: String(exclusion_status),
      },
      {
        headers: { 
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
        },
        params: { app_version: 'v2' },
      }
    );

    logger.info('Item exclusion status updated:', {
      itemId: item_id,
      exclusionStatus: exclusion_status,
    });

    res.json({
      success: true,
      data: response.data,
      message: `Item ${exclusion_status === 'true' || exclusion_status === true ? 'excluded from' : 'included in'} automatic promotions`,
    });
  } catch (error) {
    logger.error('Error updating item exclusion:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/promotions/:accountId/summary
 * Get promotions summary/dashboard
 */
router.get('/:accountId/summary', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const account = req.mlAccount;

    // Get all seller promotions
    const promotionsResponse = await axios.get(
      `${ML_API_BASE}/seller-promotions/users/${account.mlUserId}`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        params: { app_version: 'v2' },
      }
    );

    const promotions = promotionsResponse.data?.results || [];

    // Aggregate by type
    const byType = {};
    const byStatus = {};

    promotions.forEach(p => {
      // Count by type
      if (!byType[p.type]) {
        byType[p.type] = { count: 0, promotions: [] };
      }
      byType[p.type].count++;
      byType[p.type].promotions.push({
        id: p.id,
        name: p.name,
        status: p.status,
        startDate: p.start_date,
        finishDate: p.finish_date,
      });

      // Count by status
      if (!byStatus[p.status]) {
        byStatus[p.status] = 0;
      }
      byStatus[p.status]++;
    });

    // Find active and upcoming promotions
    const now = new Date();
    const activePromotions = promotions.filter(p => 
      p.status === 'started' || 
      (new Date(p.start_date) <= now && new Date(p.finish_date) >= now)
    );
    const upcomingPromotions = promotions.filter(p => 
      p.status === 'pending' || 
      new Date(p.start_date) > now
    );

    res.json({
      success: true,
      data: {
        overview: {
          total: promotions.length,
          active: activePromotions.length,
          upcoming: upcomingPromotions.length,
        },
        byType,
        byStatus,
        activePromotions: activePromotions.slice(0, 10).map(p => ({
          id: p.id,
          type: p.type,
          name: p.name,
          status: p.status,
          startDate: p.start_date,
          finishDate: p.finish_date,
          deadlineDate: p.deadline_date,
          benefits: p.benefits,
        })),
        upcomingPromotions: upcomingPromotions.slice(0, 5).map(p => ({
          id: p.id,
          type: p.type,
          name: p.name,
          status: p.status,
          startDate: p.start_date,
          finishDate: p.finish_date,
          deadlineDate: p.deadline_date,
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching promotions summary:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * Promotion Types Reference:
 * 
 * - DEAL: Traditional campaigns - seller defines price
 * - MARKETPLACE_CAMPAIGN: Co-financed campaigns with ML participation
 * - VOLUME: Volume discount campaigns (buy 3 pay 2)
 * - DOD: Day offers - time-limited daily deals
 * - LIGHTNING: Lightning offers - flash sales with stock limit
 * - PRE_NEGOTIATED: Pre-agreed discounts per item
 * - SELLER_CAMPAIGN: Seller campaigns
 * - SMART: Automated co-participation campaigns
 * - PRICE_MATCHING: Competitive pricing campaigns
 * - UNHEALTHY_STOCK: Full stock liquidation campaigns
 * - SELLER_COUPON_CAMPAIGN: Seller coupon campaigns (Brazil only)
 * - PRICE_DISCOUNT: Individual discounts
 */

module.exports = router;
