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
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Unified error handler for all routes
 * Logs errors consistently and sends standardized error responses
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {string} message - User-facing error message
 * @param {Error} error - Error object (optional)
 * @param {Object} context - Additional logging context (optional)
 */
const handleError = (res, statusCode = 500, message, error = null, context = {}) => {
  logger.error({
    action: context.action || 'UNKNOWN_ERROR',
    error: error?.message || message,
    statusCode,
    ...context,
  });

  const response = {
    success: false,
    message,
  };
  if (error?.response?.data?.message || error?.message) {
    response.error = error.response?.data?.message || error.message;
  }
  res.status(statusCode).json(response);
};

/**
 * Unified success response handler
 * Sends standardized success responses with optional data and status code
 * @param {Object} res - Express response object
 * @param {any} data - Response data payload
 * @param {string} message - Success message (optional)
 * @param {number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = {
    success: true,
    data,
  };
  if (message) {
    response.message = message;
  }
  res.status(statusCode).json(response);
};

/**
 * Build ML API headers with authorization
 * @param {string} accessToken - ML access token
 * @returns {Object} Headers object
 */
const buildHeaders = (accessToken) => {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Fetch item health and calculate health score with issues
 * @param {string} itemId - Item ID
 * @param {string} accessToken - ML access token
 * @returns {Promise<Object>} Health data with score and issues
 */
const getItemHealthWithScore = async (itemId, accessToken) => {
  const headers = buildHeaders(accessToken);
  const [healthRes, itemRes] = await Promise.all([
    axios.get(`${ML_API_BASE}/items/${itemId}/health`, { headers }),
    axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
  ]);

  const health = healthRes.data;
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
  if (itemRes.data.status === 'under_review') {
    issues.push({ type: 'status', message: 'Item under moderation review' });
    healthScore -= 20;
  }
  if (itemRes.data.status === 'inactive') {
    issues.push({ type: 'status', message: 'Item is inactive' });
    healthScore -= 30;
  }

  healthScore = Math.max(0, healthScore);

  return { health, healthScore, issues, itemData: itemRes.data };
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
 * @param {string} mlUserId - ML user ID
 * @param {string} accessToken - ML access token
 * @param {Object} queryParams - Query parameters (limit, offset)
 * @returns {Promise<Object>} Items with health data
 */
const fetchModerationItems = async (mlUserId, accessToken, queryParams = {}) => {
  const headers = buildHeaders(accessToken);
  const { limit = 50, offset = 0 } = queryParams;

  const [underReviewRes, inactiveRes, pausedRes] = await Promise.all([
    axios.get(`${ML_API_BASE}/users/${mlUserId}/items/search`, {
      headers,
      params: { status: 'under_review', limit: parseInt(limit), offset: parseInt(offset) },
    }).catch(() => ({ data: { results: [], paging: { total: 0 } } })),
    axios.get(`${ML_API_BASE}/users/${mlUserId}/items/search`, {
      headers,
      params: { status: 'inactive', limit: parseInt(limit), offset: parseInt(offset) },
    }).catch(() => ({ data: { results: [], paging: { total: 0 } } })),
    axios.get(`${ML_API_BASE}/users/${mlUserId}/items/search`, {
      headers,
      params: { status: 'paused', sub_status: 'out_of_stock', limit: parseInt(limit), offset: parseInt(offset) },
    }).catch(() => ({ data: { results: [], paging: { total: 0 } } })),
  ]);

  const allItemIds = [
    ...underReviewRes.data.results,
    ...inactiveRes.data.results,
    ...pausedRes.data.results,
  ];

  const uniqueItemIds = [...new Set(allItemIds)];

  // Fetch details and health for each item
  const itemsWithHealth = await Promise.all(
    uniqueItemIds.slice(0, 20).map(async (itemId) => {
      try {
        const [itemRes, healthRes] = await Promise.all([
          axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
          axios.get(`${ML_API_BASE}/items/${itemId}/health`, { headers }).catch(() => ({ data: null })),
        ]);
        return { item: itemRes.data, health: healthRes.data };
      } catch (err) {
        return null;
      }
    })
  );

  return {
    items: itemsWithHealth.filter(i => i !== null),
    summary: {
      under_review: underReviewRes.data.paging?.total || 0,
      inactive: inactiveRes.data.paging?.total || 0,
      paused: pausedRes.data.paging?.total || 0,
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
    const account = req.mlAccount;

    const result = await fetchModerationItems(account.mlUserId, account.accessToken, req.query);

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
    const account = req.mlAccount;

    const healthData = await getItemHealthWithScore(itemId, account.accessToken);

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
    const account = req.mlAccount;
    const headers = buildHeaders(account.accessToken);

    const [itemRes, healthRes, rulesRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}/health`, { headers }).catch(() => ({ data: null })),
      axios.get(`${ML_API_BASE}/items/${itemId}/rules`, { headers }).catch(() => ({ data: null })),
    ]);

    const issues = extractIssues(itemRes.data, healthRes.data);

    logger.info({
      action: 'GET_ITEM_ISSUES',
      accountId,
      itemId,
      userId: req.user.userId,
      issuesCount: issues.length,
    });

    sendSuccess(res, {
      item_id: itemId,
      title: itemRes.data.title,
      status: itemRes.data.status,
      issues,
      total_issues: issues.length,
      rules: rulesRes.data,
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
    const account = req.mlAccount;
    const headers = buildHeaders(account.accessToken);

    const [itemRes, healthRes, categoryRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}/health`, { headers }).catch(() => ({ data: null })),
      axios.get(`${ML_API_BASE}/categories/${(await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers })).data.category_id}/attributes`, { headers }).catch(() => ({ data: [] })),
    ]);

    const actions = generateRequiredActions(itemRes.data, categoryRes.data, healthRes.data);

    logger.info({
      action: 'GET_REQUIRED_ACTIONS',
      accountId,
      itemId,
      userId: req.user.userId,
      actionsCount: actions.length,
    });

    sendSuccess(res, {
      item_id: itemId,
      title: itemRes.data.title,
      status: itemRes.data.status,
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
    const account = req.mlAccount;
    const headers = buildHeaders(account.accessToken);

    const results = [];

    // Apply each fix
    for (const fix of fixes || []) {
      try {
        switch (fix.type) {
          case 'update_attribute':
            await axios.put(
              `${ML_API_BASE}/items/${itemId}`,
              { attributes: [{ id: fix.attribute_id, value_name: fix.value }] },
              { headers }
            );
            results.push({ type: fix.type, success: true, attribute_id: fix.attribute_id });
            break;

          case 'activate':
            await axios.put(
              `${ML_API_BASE}/items/${itemId}`,
              { status: 'active' },
              { headers }
            );
            results.push({ type: fix.type, success: true });
            break;

          case 'add_description':
            await axios.put(
              `${ML_API_BASE}/items/${itemId}/description`,
              { plain_text: fix.description },
              { headers }
            );
            results.push({ type: fix.type, success: true });
            break;

          case 'update_pictures':
            await axios.put(
              `${ML_API_BASE}/items/${itemId}`,
              { pictures: fix.pictures },
              { headers }
            );
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
    const account = req.mlAccount;
    const headers = buildHeaders(account.accessToken);

    const userResponse = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}`,
      { headers }
    );

    const reputation = userResponse.data.seller_reputation || {};

    logger.info({
      action: 'GET_SELLER_REPUTATION',
      accountId,
      userId: req.user.userId,
    });

    sendSuccess(res, {
      seller_id: account.mlUserId,
      nickname: userResponse.data.nickname,
      reputation: {
        level_id: reputation.level_id,
        power_seller_status: reputation.power_seller_status,
        transactions: reputation.transactions,
        metrics: reputation.metrics,
      },
      status: userResponse.data.status,
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
