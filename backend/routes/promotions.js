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
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const Promotion = require('../db/models/Promotion');
const MLAccount = require('../db/models/MLAccount');
const { handleError, sendSuccess } = require('../middleware/response-helpers');

const router = express.Router();

/**
 * Build MongoDB query for promotions with filters
 */
function buildPromotionQuery(userId, accountId = null, filters = {}) {
  const query = { userId };
  if (accountId) query.accountId = accountId;
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  return query;
}

/**
 * Paginate Promotion queries with consistent formatting
 */
async function paginate(query, options = {}) {
  const {
    limit = 100,
    offset = 0,
    sort = '-startDate',
  } = options;

  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  const [data, total] = await Promise.all([
    Promotion.find(query)
      .sort(sort)
      .limit(limitNum)
      .skip(offsetNum),
    Promotion.countDocuments(query),
  ]);

  return {
    data,
    total,
    limit: limitNum,
    offset: offsetNum,
  };
}

/**
 * Fetch account with validation
 */
async function fetchAccount(accountId, userId) {
  const account = await MLAccount.findOne({
    id: accountId,
    userId,
  });

  if (!account) {
    return null;
  }

  return account;
}

/**
 * Aggregate promotions by type and status
 */
function aggregatePromotions(promotions) {
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

  return { byType, byStatus };
}

/**
 * Find active and upcoming promotions from list
 */
function filterActiveAndUpcoming(promotions) {
  const now = new Date();
  const activePromotions = promotions.filter(p =>
    p.status === 'started' ||
    (new Date(p.start_date) <= now && new Date(p.finish_date) >= now)
  );
  const upcomingPromotions = promotions.filter(p =>
    p.status === 'pending' ||
    new Date(p.start_date) > now
  );

  return { activePromotions, upcomingPromotions };
}

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
// ROUTES - User promotions (local database)
// ============================================

/**
 * GET /api/promotions
 * List all promotions for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0, status, type, sort = '-startDate' } = req.query;

    const query = buildPromotionQuery(req.user.userId, null, { status, type });
    const result = await paginate(query, { limit, offset, sort });

    sendSuccess(res, {
      data: {
        promotions: result.data.map(p => p.getSummary()),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch promotions', error, {
      action: 'GET_PROMOTIONS_ERROR',
      userId: req.user.userId,
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
    const account = await fetchAccount(accountId, req.user.userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    const query = buildPromotionQuery(req.user.userId, accountId, { status, type });
    const result = await paginate(query, { limit, offset, sort });

    sendSuccess(res, {
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        promotions: result.data.map(p => p.getSummary()),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch promotions', error, {
      action: 'GET_ACCOUNT_PROMOTIONS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
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
    const account = await fetchAccount(accountId, req.user.userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    const promotions = await Promotion.findActive(accountId);

    sendSuccess(res, {
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
    handleError(res, 500, 'Failed to fetch active promotions', error, {
      action: 'GET_ACTIVE_PROMOTIONS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
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
    const account = await fetchAccount(accountId, req.user.userId);
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

    sendSuccess(res, {
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
    handleError(res, 500, 'Failed to get promotion statistics', error, {
      action: 'GET_PROMOTION_STATS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
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

    sendSuccess(res, { data: promotion.getDetails() });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch promotion', error, {
      action: 'GET_PROMOTION_ERROR',
      promotionId: req.params.promotionId,
      userId: req.user.userId,
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

    if (!type || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Type and itemId are required',
      });
    }

    const promotionData = {
      type,
      deal_price: dealPrice,
      start_date: startDate,
      finish_date: finishDate,
    };

    // Create promotion on ML using SDK execute
    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.post(
        `/seller-promotions/items/${itemId}`,
        promotionData
      );
    });

    // Save to local DB
    const promotion = new Promotion({
      accountId,
      userId: req.user.userId,
      mlPromotionId: response.data?.id || `local_${Date.now()}`,
      type,
      status: response.data?.status || 'pending',
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

    sendSuccess(res, {
      data: promotion.getDetails(),
      message: 'Promotion created successfully',
    }, null, 201);
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to create promotion', error, {
      action: 'CREATE_PROMOTION_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
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

    const headers = getMLHeaders(account.accessToken);

    const updateData = {};
    if (status) updateData.status = status;
    if (finishDate) updateData.finish_date = finishDate;

    // Update on ML (non-critical)
    await makeMLRequest('put', `/seller-promotions/${promotion.mlPromotionId}`, updateData, headers);

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

    sendSuccess(res, {
      data: promotion.getDetails(),
      message: 'Promotion updated successfully',
    });
  } catch (error) {
    handleError(res, 500, 'Failed to update promotion', error, {
      action: 'UPDATE_PROMOTION_ERROR',
      promotionId: req.params.promotionId,
      userId: req.user.userId,
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

    const headers = getMLHeaders(account.accessToken);

    // Cancel on ML (non-critical)
    await makeMLRequest('delete', `/seller-promotions/${promotion.mlPromotionId}`, null, headers);

    // Update local
    promotion.status = 'cancelled';
    await promotion.save();

    logger.info({
      action: 'PROMOTION_CANCELLED',
      promotionId: promotion.mlPromotionId,
      accountId,
      userId: req.user.userId,
    });

    sendSuccess(res, { message: 'Promotion cancelled successfully' });
  } catch (error) {
    handleError(res, 500, 'Failed to cancel promotion', error, {
      action: 'DELETE_PROMOTION_ERROR',
      promotionId: req.params.promotionId,
      userId: req.user.userId,
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
    const mlUserId = req.mlAccount.mlUserId;

    logger.info({
      action: 'PROMOTIONS_SYNC_STARTED',
      accountId,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    // Get seller promotions using SDK execute
    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(
        `/seller-promotions/search`,
        { params: { seller_id: mlUserId } }
      );
    });

    const mlPromotions = response.data?.results || [];

    // Save promotions
    const savedPromotions = await savePromotions(accountId, req.user.userId, mlPromotions);

    logger.info({
      action: 'PROMOTIONS_SYNC_COMPLETED',
      accountId,
      userId: req.user.userId,
      promotionsCount: savedPromotions.length,
      timestamp: new Date().toISOString(),
    });

    sendSuccess(res, {
      data: {
        accountId,
        promotionsCount: savedPromotions.length,
        promotions: savedPromotions.map(p => p.getSummary()),
        syncedAt: new Date().toISOString(),
      },
      message: `Synchronized ${savedPromotions.length} promotions`,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to sync promotions', error, {
      action: 'PROMOTIONS_SYNC_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// ROUTES - Deals (lightweight wrapper)
// ============================================

/**
 * GET /api/promotions/:accountId/deals
 * Get deals (DOD, Lightning offers) for an account
 */
router.get('/:accountId/deals', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const mlUserId = req.mlAccount.mlUserId;

    // Get deals from ML API using SDK execute
    let deals = [];

    try {
      const dealsResponse = await sdkManager.execute(accountId, async (sdk) => {
        return await sdk.axiosInstance.get(`/users/${mlUserId}/deals/search`);
      });
      deals = dealsResponse.data?.results || [];
    } catch (e) {
      logger.info('Deals endpoint not available');
    }

    // Also try to get lightning deals
    try {
      const lightningResponse = await sdkManager.execute(accountId, async (sdk) => {
        return await sdk.axiosInstance.get(`/seller-promotions/users/${mlUserId}`, {
          params: { app_version: 'v2', promotion_type: 'LIGHTNING' }
        });
      });

      if (lightningResponse.data?.results) {
        const lightningDeals = lightningResponse.data.results.map(deal => ({
          ...deal,
          type: 'lightning'
        }));
        deals = [...deals, ...lightningDeals];
      }
    } catch (e) {
      logger.info('Lightning deals not available');
    }

    sendSuccess(res, {
      data: {
        deals,
        total: deals.length,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch deals', error, {
      action: 'GET_DEALS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
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

    const headers = getMLHeaders(account.accessToken);

    // Get available deals/campaigns
    const { success, data } = await makeMLRequest(
      'get',
      `/users/${account.mlUserId}/deals/search`,
      null,
      headers
    );

    const campaigns = data?.results || [];
    const paging = data?.paging || { total: 0 };

    sendSuccess(res, {
      data: {
        campaigns,
        paging,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch campaigns', error, {
      action: 'GET_CAMPAIGNS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

// ============================================
// ROUTES - Seller Promotions (ML API v2)
// ============================================

/**
 * GET /api/promotions/:accountId/seller-promotions
 * Get all seller promotions directly from ML API
 */
router.get('/:accountId/seller-promotions', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const mlUserId = req.mlAccount.mlUserId;

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(`/seller-promotions/users/${mlUserId}`, {
        params: { app_version: 'v2' }
      });
    });

    sendSuccess(res, { data: response.data });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch seller promotions', error, {
      action: 'GET_SELLER_PROMOTIONS_ERROR',
      accountId: req.params.accountId,
    });
  }
});

/**
 * GET /api/promotions/:accountId/seller-promotions/:promotionId
 * Get promotion details
 */
router.get('/:accountId/seller-promotions/:promotionId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, promotionId } = req.params;
    const { promotion_type = 'DEAL' } = req.query;

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(`/seller-promotions/promotions/${promotionId}`, {
        params: { promotion_type, app_version: 'v2' }
      });
    });

    sendSuccess(res, { data: response.data });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch promotion details', error, {
      action: 'GET_PROMOTION_DETAILS_ERROR',
      promotionId: req.params.promotionId,
    });
  }
});

/**
 * GET /api/promotions/:accountId/seller-promotions/:promotionId/items
 * Get items in a promotion
 */
router.get('/:accountId/seller-promotions/:promotionId/items', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, promotionId } = req.params;
    const { promotion_type = 'DEAL', status, status_item, item_id, limit = 50, search_after } = req.query;

    const params = {
      promotion_type,
      app_version: 'v2',
      limit,
    };

    if (status) params.status = status;
    if (status_item) params.status_item = status_item;
    if (item_id) params.item_id = item_id;
    if (search_after) params.search_after = search_after;

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(`/seller-promotions/promotions/${promotionId}/items`, { params });
    });

    sendSuccess(res, { data: response.data });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch promotion items', error, {
      action: 'GET_PROMOTION_ITEMS_ERROR',
      promotionId: req.params.promotionId,
    });
  }
});

/**
 * GET /api/promotions/:accountId/items/:itemId/promotions
 * Get all promotions for a specific item
 */
router.get('/:accountId/items/:itemId/promotions', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(`/seller-promotions/items/${itemId}`, {
        params: { app_version: 'v2' }
      });
    });

    if (!response.data || response.data.length === 0) {
      return sendSuccess(res, {
        data: [],
        message: 'No promotions found for this item',
      });
    }

    sendSuccess(res, { data: response.data });
  } catch (error) {
    if (error.response?.status === 404) {
      return sendSuccess(res, {
        data: [],
        message: 'No promotions found for this item',
      });
    }

    handleError(res, 500, 'Failed to fetch item promotions', error, {
      action: 'GET_ITEM_PROMOTIONS_ERROR',
      itemId: req.params.itemId,
    });
  }
});

/**
 * POST /api/promotions/:accountId/seller-promotions/:promotionId/items
 * Add items to a promotion
 */
router.post('/:accountId/seller-promotions/:promotionId/items', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, promotionId } = req.params;
    const { items, promotion_type = 'DEAL' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required',
      });
    }

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.post(
        `/seller-promotions/promotions/${promotionId}/items`,
        items,
        { params: { promotion_type, app_version: 'v2' } }
      );
    });

    logger.info({
      action: 'ITEMS_ADDED_TO_PROMOTION',
      promotionId,
      itemsCount: items.length,
      accountId,
    });

    sendSuccess(res, {
      data: response.data,
      message: 'Items added to promotion successfully',
    });
  } catch (error) {
    handleError(res, 500, 'Failed to add items to promotion', error, {
      action: 'ADD_ITEMS_TO_PROMOTION_ERROR',
      promotionId: req.params.promotionId,
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

    const { success, data, error } = await makeMLRequest(
      'delete',
      `/seller-promotions/items/${itemId}`,
      null,
      getMLHeaders(account.accessToken),
      { app_version: 'v2' }
    );

    if (!success) {
      return handleError(res, error.response?.status || 500, 'Failed to remove promotions from item', error, {
        action: 'REMOVE_PROMOTIONS_FROM_ITEM_ERROR',
        itemId,
      });
    }

    logger.info({
      action: 'PROMOTIONS_REMOVED_FROM_ITEM',
      itemId,
      accountId: req.params.accountId,
    });

    sendSuccess(res, {
      data,
      message: 'Promotions removed successfully',
    });
  } catch (error) {
    handleError(res, 500, 'Failed to remove promotions from item', error, {
      action: 'REMOVE_PROMOTIONS_FROM_ITEM_ERROR',
      itemId: req.params.itemId,
    });
  }
});

// ============================================
// ROUTES - Advanced Endpoints (Candidates, Offers, Exclusions)
// ============================================

/**
 * GET /api/promotions/:accountId/candidates/:candidateId
 * Get candidate details for a promotion
 */
router.get('/:accountId/candidates/:candidateId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, candidateId } = req.params;

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(`/seller-promotions/candidates/${candidateId}`, {
        params: { app_version: 'v2' }
      });
    });

    sendSuccess(res, { data: response.data });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch candidate details', error, {
      action: 'GET_CANDIDATE_ERROR',
      candidateId: req.params.candidateId,
    });
  }
});

/**
 * GET /api/promotions/:accountId/offers/:offerId
 * Get offer details
 */
router.get('/:accountId/offers/:offerId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, offerId } = req.params;

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(`/seller-promotions/offers/${offerId}`, {
        params: { app_version: 'v2' }
      });
    });

    sendSuccess(res, { data: response.data });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch offer details', error, {
      action: 'GET_OFFER_ERROR',
      offerId: req.params.offerId,
    });
  }
});

/**
 * GET /api/promotions/:accountId/exclusion-list/seller
 * Check if seller is excluded from automatic promotions
 */
router.get('/:accountId/exclusion-list/seller', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get('/seller-promotions/exclusion-list/seller', {
        params: { app_version: 'v2' }
      });
    });

    sendSuccess(res, { data: response.data });
  } catch (error) {
    handleError(res, 500, 'Failed to check seller exclusion', error, {
      action: 'GET_SELLER_EXCLUSION_ERROR',
      accountId: req.params.accountId,
    });
  }
});

/**
 * POST /api/promotions/:accountId/exclusion-list/seller
 * Add or remove seller from exclusion list
 */
router.post('/:accountId/exclusion-list/seller', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { exclusion_status } = req.body;

    if (typeof exclusion_status !== 'boolean' && exclusion_status !== 'true' && exclusion_status !== 'false') {
      return res.status(400).json({
        success: false,
        error: 'exclusion_status must be true or false',
      });
    }

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.post(
        '/seller-promotions/exclusion-list/seller',
        { exclusion_status: String(exclusion_status) },
        { params: { app_version: 'v2' } }
      );
    });

    logger.info({
      action: 'SELLER_EXCLUSION_STATUS_UPDATED',
      accountId,
      exclusionStatus: exclusion_status,
    });

    sendSuccess(res, {
      data: response.data,
      message: `Seller ${exclusion_status === 'true' || exclusion_status === true ? 'excluded from' : 'included in'} automatic promotions`,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to update seller exclusion', error, {
      action: 'UPDATE_SELLER_EXCLUSION_ERROR',
      accountId: req.params.accountId,
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

    const { success, data, error } = await makeMLRequest(
      'get',
      `/seller-promotions/exclusion-list/seller/${itemId}`,
      null,
      getMLHeaders(account.accessToken),
      { app_version: 'v2' }
    );

    if (!success) {
      return handleError(res, error.response?.status || 500, 'Failed to check item exclusion', error, {
        action: 'GET_ITEM_EXCLUSION_ERROR',
        itemId,
      });
    }

    sendSuccess(res, { data });
  } catch (error) {
    handleError(res, 500, 'Failed to check item exclusion', error, {
      action: 'GET_ITEM_EXCLUSION_ERROR',
      itemId: req.params.itemId,
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

    const { success, data, error } = await makeMLRequest(
      'post',
      '/seller-promotions/exclusion-list/item',
      {
        item_id,
        exclusion_status: String(exclusion_status),
      },
      getMLHeaders(account.accessToken),
      { app_version: 'v2' }
    );

    if (!success) {
      return handleError(res, error.response?.status || 500, 'Failed to update item exclusion', error, {
        action: 'UPDATE_ITEM_EXCLUSION_ERROR',
        itemId: item_id,
      });
    }

    logger.info({
      action: 'ITEM_EXCLUSION_STATUS_UPDATED',
      itemId: item_id,
      exclusionStatus: exclusion_status,
    });

    sendSuccess(res, {
      data,
      message: `Item ${exclusion_status === 'true' || exclusion_status === true ? 'excluded from' : 'included in'} automatic promotions`,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to update item exclusion', error, {
      action: 'UPDATE_ITEM_EXCLUSION_ERROR',
      itemId: req.body.item_id,
    });
  }
});

/**
 * GET /api/promotions/:accountId/summary
 * Get promotions summary/dashboard
 */
router.get('/:accountId/summary', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const mlUserId = req.mlAccount.mlUserId;

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(`/seller-promotions/users/${mlUserId}`, {
        params: { app_version: 'v2' }
      });
    });

    const promotions = response.data?.results || [];

    // Aggregate data
    const { byType, byStatus } = aggregatePromotions(promotions);
    const { activePromotions, upcomingPromotions } = filterActiveAndUpcoming(promotions);

    sendSuccess(res, {
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
    handleError(res, 500, 'Failed to fetch promotions summary', error, {
      action: 'GET_PROMOTIONS_SUMMARY_ERROR',
      accountId: req.params.accountId,
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
