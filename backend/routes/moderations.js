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
 * GET    /api/moderations/:accountId/history/:itemId     - Get moderation history
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
 * GET /api/moderations/:accountId
 * List all items with moderation issues
 */
router.get('/:accountId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Search for items under review or with issues
    const [underReviewRes, inactiveRes, pausedRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/users/${account.mlUserId}/items/search`, {
        headers,
        params: { status: 'under_review', limit: parseInt(limit), offset: parseInt(offset) },
      }).catch(() => ({ data: { results: [], paging: { total: 0 } } })),
      axios.get(`${ML_API_BASE}/users/${account.mlUserId}/items/search`, {
        headers,
        params: { status: 'inactive', limit: parseInt(limit), offset: parseInt(offset) },
      }).catch(() => ({ data: { results: [], paging: { total: 0 } } })),
      axios.get(`${ML_API_BASE}/users/${account.mlUserId}/items/search`, {
        headers,
        params: { status: 'paused', sub_status: 'out_of_stock', limit: parseInt(limit), offset: parseInt(offset) },
      }).catch(() => ({ data: { results: [], paging: { total: 0 } } })),
    ]);

    // Combine all item IDs
    const allItemIds = [
      ...underReviewRes.data.results,
      ...inactiveRes.data.results,
      ...pausedRes.data.results,
    ];

    // Remove duplicates
    const uniqueItemIds = [...new Set(allItemIds)];

    // Fetch details and health for each item
    const itemsWithHealth = await Promise.all(
      uniqueItemIds.slice(0, 20).map(async (itemId) => {
        try {
          const [itemRes, healthRes] = await Promise.all([
            axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
            axios.get(`${ML_API_BASE}/items/${itemId}/health`, { headers }).catch(() => ({ data: null })),
          ]);

          return {
            item: itemRes.data,
            health: healthRes.data,
          };
        } catch (err) {
          return null;
        }
      })
    );

    const validItems = itemsWithHealth.filter(i => i !== null);

    logger.info({
      action: 'LIST_MODERATIONS',
      accountId,
      userId: req.user.userId,
      underReview: underReviewRes.data.paging?.total || 0,
      inactive: inactiveRes.data.paging?.total || 0,
      paused: pausedRes.data.paging?.total || 0,
    });

    res.json({
      success: true,
      data: {
        items: validItems,
        summary: {
          under_review: underReviewRes.data.paging?.total || 0,
          inactive: inactiveRes.data.paging?.total || 0,
          paused: pausedRes.data.paging?.total || 0,
          total: uniqueItemIds.length,
        },
      },
    });
  } catch (error) {
    logger.error({
      action: 'LIST_MODERATIONS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to list moderations',
      error: error.response?.data?.message || error.message,
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

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const [healthRes, itemRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}/health`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
    ]);

    // Calculate health score
    const health = healthRes.data;
    let healthScore = 100;
    const issues = [];

    if (health) {
      // Check for warnings
      if (health.warnings && health.warnings.length > 0) {
        health.warnings.forEach(w => {
          issues.push({ type: 'warning', message: w.message, code: w.code });
          healthScore -= 10;
        });
      }
      // Check for errors
      if (health.errors && health.errors.length > 0) {
        health.errors.forEach(e => {
          issues.push({ type: 'error', message: e.message, code: e.code });
          healthScore -= 25;
        });
      }
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

    logger.info({
      action: 'GET_ITEM_HEALTH',
      accountId,
      itemId,
      userId: req.user.userId,
      healthScore,
    });

    res.json({
      success: true,
      data: {
        item_id: itemId,
        health: healthRes.data,
        item_status: itemRes.data.status,
        item_sub_status: itemRes.data.sub_status,
        health_score: healthScore,
        issues,
        title: itemRes.data.title,
        permalink: itemRes.data.permalink,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ITEM_HEALTH_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get item health',
      error: error.response?.data?.message || error.message,
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

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get multiple health/status endpoints
    const [itemRes, healthRes, rulesRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}/health`, { headers }).catch(() => ({ data: null })),
      axios.get(`${ML_API_BASE}/items/${itemId}/rules`, { headers }).catch(() => ({ data: null })),
    ]);

    const issues = [];

    // Extract from health endpoint
    if (healthRes.data) {
      if (healthRes.data.warnings) {
        healthRes.data.warnings.forEach(w => {
          issues.push({
            source: 'health',
            type: 'warning',
            code: w.code,
            message: w.message,
            recommendation: w.recommendation || null,
          });
        });
      }
      if (healthRes.data.errors) {
        healthRes.data.errors.forEach(e => {
          issues.push({
            source: 'health',
            type: 'error',
            code: e.code,
            message: e.message,
            recommendation: e.recommendation || null,
          });
        });
      }
    }

    // Extract from item warnings
    if (itemRes.data.warnings) {
      itemRes.data.warnings.forEach(w => {
        issues.push({
          source: 'item',
          type: 'warning',
          message: w.message || w,
        });
      });
    }

    // Check item tags for issues
    if (itemRes.data.tags) {
      const problemTags = itemRes.data.tags.filter(t => 
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

    logger.info({
      action: 'GET_ITEM_ISSUES',
      accountId,
      itemId,
      userId: req.user.userId,
      issuesCount: issues.length,
    });

    res.json({
      success: true,
      data: {
        item_id: itemId,
        title: itemRes.data.title,
        status: itemRes.data.status,
        issues,
        total_issues: issues.length,
        rules: rulesRes.data,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ITEM_ISSUES_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get item issues',
      error: error.response?.data?.message || error.message,
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

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const [itemRes, healthRes, categoryRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}/health`, { headers }).catch(() => ({ data: null })),
      axios.get(`${ML_API_BASE}/categories/${(await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers })).data.category_id}/attributes`, { headers }).catch(() => ({ data: [] })),
    ]);

    const actions = [];
    const item = itemRes.data;

    // Check for missing required attributes
    const requiredAttrs = categoryRes.data.filter(a => a.tags?.required);
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

    // Check for status issues
    if (item.status === 'inactive' || item.status === 'under_review') {
      actions.push({
        type: 'review_content',
        priority: 'high',
        message: 'Review item content and ensure compliance with ML policies',
      });
    }

    // Check for missing pictures
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

    // Check for description
    if (!item.descriptions || item.descriptions.length === 0) {
      actions.push({
        type: 'add_description',
        priority: 'medium',
        message: 'Add product description',
      });
    }

    // Extract actions from health response
    if (healthRes.data?.actions) {
      healthRes.data.actions.forEach(a => {
        actions.push({
          type: 'health_action',
          priority: a.priority || 'medium',
          message: a.message,
          code: a.code,
        });
      });
    }

    logger.info({
      action: 'GET_REQUIRED_ACTIONS',
      accountId,
      itemId,
      userId: req.user.userId,
      actionsCount: actions.length,
    });

    res.json({
      success: true,
      data: {
        item_id: itemId,
        title: item.title,
        status: item.status,
        actions,
        total_actions: actions.length,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_REQUIRED_ACTIONS_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get required actions',
      error: error.response?.data?.message || error.message,
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

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

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

    res.json({
      success: true,
      message: `Applied ${successCount}/${fixes?.length || 0} fixes`,
      data: {
        item_id: itemId,
        results,
      },
    });
  } catch (error) {
    logger.error({
      action: 'FIX_ITEM_ISSUES_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fix item issues',
      error: error.response?.data?.message || error.message,
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

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

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

    res.json({
      success: true,
      data: {
        seller_id: account.mlUserId,
        nickname: userResponse.data.nickname,
        reputation: {
          level_id: reputation.level_id,
          power_seller_status: reputation.power_seller_status,
          transactions: reputation.transactions,
          metrics: reputation.metrics,
        },
        status: userResponse.data.status,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_SELLER_REPUTATION_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get seller reputation',
      error: error.response?.data?.message || error.message,
    });
  }
});

module.exports = router;
