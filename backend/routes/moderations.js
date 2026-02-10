/**
 * Moderations Routes (Moderações de Itens)
 * Manage item health, moderations and quality issues
 * 
 * API Mercado Livre:
 * - GET /items/{item_id}/health - Item health status
 * - GET /items/{item_id}/sale_terms - Sale terms
 * - GET /items/{item_id}/rules - Rules applicable to item
 * - GET /users/{user_id}/items/search?status=under_review - Items under review
 * 
 * Routes:
 * GET    /api/moderations/:accountId                     - List items under moderation
 * GET    /api/moderations/:accountId/health/:itemId      - Get item health
 * GET    /api/moderations/:accountId/issues/:itemId      - Get item issues/warnings
 * GET    /api/moderations/:accountId/actions/:itemId     - Get required actions
 * POST   /api/moderations/:accountId/fix/:itemId         - Fix item issues
 * GET    /api/moderations/:accountId/seller-reputation  - Get seller reputation
 */

const express = require('express');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const { handleError, sendSuccess } = require('../middleware/response-helpers');

const router = express.Router();

/**
 * Fetch item health and calculate health score with issues
 * @param {string} itemId - Item ID
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} Health data with score and issues
 */
const getItemHealthWithScore = async (itemId, accountId) => {
  const [health, item] = await Promise.all([
    sdkManager.execute(accountId, async (sdk) => {
      const response = await sdk.axiosInstance.get(`/items/${itemId}/health`);
      return response.data;
    }).catch(() => null),
    sdkManager.getItem(accountId, itemId),
  ]);

  let healthScore = 100;
  const issues = [];

  // Process health warnings
  if (health?.warnings?.length > 0) {
    health.warnings.forEach(w => {
      issues.push({ type: 'warning', message: w.message, code: w.code });
      healthScore -= 10;
    });
  }

  // Process health errors
  if (health?.errors?.length > 0) {
    health.errors.forEach(e => {
      issues.push({ type: 'error', message: e.message, code: e.code });
      healthScore -= 25;
    });
  }

  // Check item status
  if (item.status === 'under_review') {
    issues.push({ type: 'status', message: 'Item under moderation review' });
    healthScore -= 20;
  }
  if (item.status === 'inactive') {
    issues.push({ type: 'status', message: 'Item is inactive' });
    healthScore -= 30;
  }

  healthScore = Math.max(0, healthScore);

  return { health, healthScore, issues, itemData: item };
};

/**
 * Extract issues from health and item data
 * @param {Object} itemData - Item data object
 * @param {Object} healthData - Health data object
 * @param {Object} rulesData - Rules data object
 * @returns {Array} Array of issues
 */
const extractIssues = (itemData, healthData, rulesData = null) => {
  const issues = [];

  // Health warnings and errors
  if (healthData?.warnings) {
    healthData.warnings.forEach(w => {
      issues.push({
        source: 'health',
        type: 'warning',
        code: w.code,
        message: w.message,
        recommendation: w.recommendation || null,
      });
    });
  }

  if (healthData?.errors) {
    healthData.errors.forEach(e => {
      issues.push({
        source: 'health',
        type: 'error',
        code: e.code,
        message: e.message,
        recommendation: e.recommendation || null,
      });
    });
  }

  // Item warnings
  if (itemData?.warnings) {
    itemData.warnings.forEach(w => {
      issues.push({
        source: 'item',
        type: 'warning',
        message: w.message || w,
      });
    });
  }

  // Problem tags
  if (itemData?.tags) {
    const problemTags = itemData.tags.filter(t => 
      t.includes('poor') || t.includes('bad') || t.includes('warning')
    );
    problemTags.forEach(tag => {
      issues.push({
        source: 'tags',
        type: 'warning',
        code: tag,
        message: `Item has tag: ${tag}`,
      });
    });
  }

  return issues;
};

/**
 * Generate required actions for item based on data
 * @param {Object} itemData - Item data object
 * @param {Object} categoryAttrs - Category attributes array
 * @param {Object} healthData - Health data object
 * @returns {Array} Array of required actions
 */
const generateRequiredActions = (itemData, categoryAttrs = [], healthData = null) => {
  const actions = [];
  const item = itemData;

  // Missing required attributes
  if (categoryAttrs.length > 0) {
    const requiredAttrs = categoryAttrs.filter(a => a.tags?.includes('required'));
    const itemAttrIds = (item.attributes || []).map(a => a.id);
    
    requiredAttrs.forEach(attr => {
      if (!itemAttrIds.includes(attr.id)) {
        actions.push({
          type: 'add_attribute',
          priority: 'high',
          attribute_id: attr.id,
          attribute_name: attr.name,
          message: `Add required attribute: ${attr.name}`,
        });
      }
    });
  }

  // Status issues
  if (item.status === 'inactive' || item.status === 'under_review') {
    actions.push({
      type: 'review_content',
      priority: 'high',
      message: 'Review item content and ensure compliance with ML policies',
    });
  }

  // Picture requirements
  if (!item.pictures || item.pictures.length === 0) {
    actions.push({
      type: 'add_pictures',
      priority: 'high',
      message: 'Add at least one product image',
    });
  } else if (item.pictures.length < 3) {
    actions.push({
      type: 'add_pictures',
      priority: 'medium',
      message: 'Add more pictures (recommended: at least 3)',
    });
  }

  // Description requirement
  if (!item.descriptions || item.descriptions.length === 0) {
    actions.push({
      type: 'add_description',
      priority: 'medium',
      message: 'Add product description',
    });
  }

  // Health-based actions
  if (healthData?.actions) {
    healthData.actions.forEach(a => {
      actions.push({
        type: 'health_action',
        priority: a.priority || 'medium',
        message: a.message,
        code: a.code,
      });
    });
  }

  return actions;
};

/**
 * Fetch items under moderation with multiple statuses
 * @param {string} accountId - Account ID
 * @param {string} mlUserId - ML user ID
 * @param {Object} queryParams - Query parameters (limit, offset)
 * @returns {Promise<Object>} Items with health data
 */
const fetchModerationItems = async (accountId, mlUserId, queryParams = {}) => {
  const { limit = 50, offset = 0 } = queryParams;

  const [underReviewData, inactiveData, pausedData] = await Promise.all([
    sdkManager.getAllUserItems(accountId, mlUserId, {
      status: 'under_review',
      limit: parseInt(limit),
      offset: parseInt(offset)
    }).catch(() => ({ results: [], paging: { total: 0 } })),
    sdkManager.getAllUserItems(accountId, mlUserId, {
      status: 'inactive',
      limit: parseInt(limit),
      offset: parseInt(offset)
    }).catch(() => ({ results: [], paging: { total: 0 } })),
    sdkManager.getAllUserItems(accountId, mlUserId, {
      status: 'paused',
      limit: parseInt(limit),
      offset: parseInt(offset)
    }).catch(() => ({ results: [], paging: { total: 0 } })),
  ]);

  const allItemIds = [
    ...(underReviewData.results || []),
    ...(inactiveData.results || []),
    ...(pausedData.results || []),
  ];

  const uniqueItemIds = [...new Set(allItemIds)];

  // Fetch details and health for each item using SDK
  const itemsWithHealth = await Promise.all(
    uniqueItemIds.slice(0, 20).map(async (itemId) => {
      try {
        const [item, health] = await Promise.all([
          sdkManager.getItem(accountId, itemId),
          sdkManager.execute(accountId, async (sdk) => {
            const response = await sdk.axiosInstance.get(`/items/${itemId}/health`);
            return response.data;
          }).catch(() => null),
        ]);
        return { item, health };
      } catch (err) {
        return null;
      }
    })
  );

  return {
    items: itemsWithHealth.filter(i => i !== null),
    summary: {
      under_review: underReviewData.paging?.total || 0,
      inactive: inactiveData.paging?.total || 0,
      paused: pausedData.paging?.total || 0,
      total: uniqueItemIds.length,
    },
  };
};

/**
 * GET /api/moderations/:accountId
 * List all items with moderation issues
 */
router.get('/:accountId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const mlUserId = req.mlAccount.mlUserId;

    const result = await fetchModerationItems(accountId, mlUserId, req.query);

    logger.info({
      action: 'LIST_MODERATIONS',
      accountId,
      userId: req.user.userId,
      underReview: result.summary.under_review,
      inactive: result.summary.inactive,
      paused: result.summary.paused,
    });

    sendSuccess(res, {
      items: result.items,
      summary: result.summary,
    });
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to list moderations', error, {
      action: 'LIST_MODERATIONS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/moderations/:accountId/health/:itemId
 * Get detailed health status for an item
 */
router.get('/:accountId/health/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;

    const healthData = await getItemHealthWithScore(itemId, accountId);

    logger.info({
      action: 'GET_ITEM_HEALTH',
      accountId,
      itemId,
      userId: req.user.userId,
      healthScore: healthData.healthScore,
    });

    sendSuccess(res, {
      item_id: itemId,
      health: healthData.health,
      item_status: healthData.itemData.status,
      item_sub_status: healthData.itemData.sub_status,
      health_score: healthData.healthScore,
      issues: healthData.issues,
      title: healthData.itemData.title,
      permalink: healthData.itemData.permalink,
    });
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to get item health', error, {
      action: 'GET_ITEM_HEALTH_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/moderations/:accountId/issues/:itemId
 * Get all issues/warnings for an item
 */
router.get('/:accountId/issues/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;

    const [item, health, rules] = await Promise.all([
      sdkManager.getItem(accountId, itemId),
      sdkManager.execute(accountId, async (sdk) => {
        const response = await sdk.axiosInstance.get(`/items/${itemId}/health`);
        return response.data;
      }).catch(() => null),
      sdkManager.execute(accountId, async (sdk) => {
        const response = await sdk.axiosInstance.get(`/items/${itemId}/rules`);
        return response.data;
      }).catch(() => null),
    ]);

    const issues = extractIssues(item, health);

    logger.info({
      action: 'GET_ITEM_ISSUES',
      accountId,
      itemId,
      userId: req.user.userId,
      issuesCount: issues.length,
    });

    sendSuccess(res, {
      item_id: itemId,
      title: item.title,
      status: item.status,
      issues,
      total_issues: issues.length,
      rules,
    });
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to get item issues', error, {
      action: 'GET_ITEM_ISSUES_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/moderations/:accountId/actions/:itemId
 * Get required actions to fix item
 */
router.get('/:accountId/actions/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;

    const [item, health] = await Promise.all([
      sdkManager.getItem(accountId, itemId),
      sdkManager.execute(accountId, async (sdk) => {
        const response = await sdk.axiosInstance.get(`/items/${itemId}/health`);
        return response.data;
      }).catch(() => null),
    ]);

    const categoryAttrs = await sdkManager.execute(accountId, async (sdk) => {
      const response = await sdk.axiosInstance.get(`/categories/${item.category_id}/attributes`);
      return response.data;
    }).catch(() => []);

    const actions = generateRequiredActions(item, categoryAttrs, health);

    logger.info({
      action: 'GET_REQUIRED_ACTIONS',
      accountId,
      itemId,
      userId: req.user.userId,
      actionsCount: actions.length,
    });

    sendSuccess(res, {
      item_id: itemId,
      title: item.title,
      status: item.status,
      actions,
      total_actions: actions.length,
    });
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to get required actions', error, {
      action: 'GET_REQUIRED_ACTIONS_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });
  }
});

/**
 * POST /api/moderations/:accountId/fix/:itemId
 * Attempt to fix item issues
 */
router.post('/:accountId/fix/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { fixes } = req.body;

    const results = [];

    // Apply each fix
    for (const fix of fixes || []) {
      try {
        switch (fix.type) {
          case 'update_attribute':
            await sdkManager.updateItem(accountId, itemId, {
              attributes: [{ id: fix.attribute_id, value_name: fix.value }]
            });
            results.push({ type: fix.type, success: true, attribute_id: fix.attribute_id });
            break;

          case 'activate':
            await sdkManager.updateItem(accountId, itemId, { status: 'active' });
            results.push({ type: fix.type, success: true });
            break;

          case 'add_description':
            await sdkManager.execute(accountId, async (sdk) => {
              await sdk.axiosInstance.put(`/items/${itemId}/description`, { plain_text: fix.description });
            });
            results.push({ type: fix.type, success: true });
            break;

          case 'update_pictures':
            await sdkManager.updateItem(accountId, itemId, { pictures: fix.pictures });
            results.push({ type: fix.type, success: true });
            break;

          default:
            results.push({ type: fix.type, success: false, error: 'Unknown fix type' });
        }
      } catch (fixError) {
        results.push({
          type: fix.type,
          success: false,
          error: fixError.response?.data?.message || fixError.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    logger.info({
      action: 'FIX_ITEM_ISSUES',
      accountId,
      itemId,
      userId: req.user.userId,
      totalFixes: fixes?.length || 0,
      successFixes: successCount,
    });

    sendSuccess(res, {
      item_id: itemId,
      results,
    }, `Applied ${successCount}/${fixes?.length || 0} fixes`);
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to fix item issues', error, {
      action: 'FIX_ITEM_ISSUES_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/moderations/:accountId/seller-reputation
 * Get seller reputation and health overview
 */
router.get('/:accountId/seller-reputation', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const mlUserId = req.mlAccount.mlUserId;

    const userData = await sdkManager.getUser(accountId, mlUserId);
    const reputation = userData.seller_reputation || {};

    logger.info({
      action: 'GET_SELLER_REPUTATION',
      accountId,
      userId: req.user.userId,
    });

    sendSuccess(res, {
      seller_id: mlUserId,
      nickname: userData.nickname,
      reputation: {
        level_id: reputation.level_id,
        power_seller_status: reputation.power_seller_status,
        transactions: reputation.transactions,
        metrics: reputation.metrics,
      },
      status: userData.status,
    });
  } catch (error) {
    handleError(res, error.response?.status || 500, 'Failed to get seller reputation', error, {
      action: 'GET_SELLER_REPUTATION_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

module.exports = router;
