/**
 * Price Automation Routes
 * Automated pricing rules management
 * 
 * Endpoints:
 * - GET /api/price-automation/:accountId/rules - List all rules
 * - POST /api/price-automation/:accountId/rules - Create rule
 * - PUT /api/price-automation/:accountId/rules/:ruleId - Update rule
 * - DELETE /api/price-automation/:accountId/rules/:ruleId - Delete rule
 * - POST /api/price-automation/:accountId/rules/:ruleId/run - Execute rule manually
 */

const express = require('express');
const router = express.Router();
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const MLAccount = require('../db/models/MLAccount');
const { authenticateToken } = require('../middleware/auth');
const { handleError, sendSuccess } = require('../middleware/response-helpers');

// In-memory storage for rules (in production, use MongoDB)
let priceRules = new Map();

// Middleware to get ML account
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
 * GET /api/price-automation/:accountId/rules
 * List all pricing rules for an account
 */
router.get('/:accountId/rules', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    // Get rules for this account
    const accountRules = [];
    priceRules.forEach((rule, id) => {
      if (rule.accountId === accountId) {
        accountRules.push({ id, ...rule });
      }
    });

    res.json({
      success: true,
      data: {
        rules: accountRules,
        total: accountRules.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching rules:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/price-automation/:accountId/rules
 * Create a new pricing rule
 */
router.post('/:accountId/rules', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const {
      name,
      type,
      items,
      conditions,
      action,
      schedule,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'name and type are required',
      });
    }

    const ruleId = `rule_${Date.now()}`;
    const rule = {
      accountId,
      name,
      type,
      items: items || [],
      conditions: conditions || {},
      action: action || {},
      schedule: schedule || { frequency: 'daily', active: true },
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRun: null,
      runCount: 0,
    };

    priceRules.set(ruleId, rule);

    logger.info('Price rule created:', { ruleId, name, type });

    res.json({
      success: true,
      data: { id: ruleId, ...rule },
      message: 'Rule created successfully',
    });
  } catch (error) {
    logger.error('Error creating rule:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/price-automation/:accountId/rules/:ruleId
 * Get a specific rule
 */
router.get('/:accountId/rules/:ruleId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { ruleId } = req.params;
    
    const rule = priceRules.get(ruleId);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }

    res.json({
      success: true,
      data: { id: ruleId, ...rule },
    });
  } catch (error) {
    logger.error('Error fetching rule:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/price-automation/:accountId/rules/:ruleId
 * Update a pricing rule
 */
router.put('/:accountId/rules/:ruleId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;
    
    const rule = priceRules.get(ruleId);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }

    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    priceRules.set(ruleId, updatedRule);

    logger.info('Price rule updated:', { ruleId });

    res.json({
      success: true,
      data: { id: ruleId, ...updatedRule },
      message: 'Rule updated successfully',
    });
  } catch (error) {
    logger.error('Error updating rule:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/price-automation/:accountId/rules/:ruleId
 * Delete a pricing rule
 */
router.delete('/:accountId/rules/:ruleId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { ruleId } = req.params;
    
    if (!priceRules.has(ruleId)) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }

    priceRules.delete(ruleId);

    logger.info('Price rule deleted:', { ruleId });

    res.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting rule:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/price-automation/:accountId/rules/:ruleId/run
 * Execute a pricing rule manually
 */
router.post('/:accountId/rules/:ruleId/run', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId, ruleId } = req.params;

    const rule = priceRules.get(ruleId);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }

    const results = {
      processed: 0,
      updated: 0,
      errors: 0,
      details: [],
    };

    // Process each item in the rule
    for (const itemId of rule.items) {
      try {
        // Get current item info using SDK
        const item = await sdkManager.getItem(accountId, itemId);
        let newPrice = item.price;
        let shouldUpdate = false;

        // Apply rule logic based on type
        switch (rule.type) {
          case 'competitor_match':
            if (rule.action.type === 'match_lowest') {
              const competitorPrice = item.price * 0.98;
              if (competitorPrice < item.price) {
                newPrice = competitorPrice;
                shouldUpdate = true;
              }
            }
            break;

          case 'margin_protection':
            const minMargin = rule.conditions.minMargin || 10;
            const cost = item.price * 0.7;
            const currentMargin = ((item.price - cost) / item.price) * 100;
            if (currentMargin < minMargin) {
              newPrice = cost / (1 - minMargin / 100);
              shouldUpdate = true;
            }
            break;

          case 'discount':
            if (rule.action.adjustment === 'percentage') {
              newPrice = item.price * (1 - rule.action.value / 100);
              shouldUpdate = true;
            } else {
              newPrice = item.price - rule.action.value;
              shouldUpdate = true;
            }
            break;

          case 'increase':
            if (rule.action.adjustment === 'percentage') {
              newPrice = item.price * (1 + rule.action.value / 100);
              shouldUpdate = true;
            } else {
              newPrice = item.price + rule.action.value;
              shouldUpdate = true;
            }
            break;
        }

        // Check price limits
        if (rule.conditions.minPrice && newPrice < rule.conditions.minPrice) {
          newPrice = rule.conditions.minPrice;
        }
        if (rule.conditions.maxPrice && newPrice > rule.conditions.maxPrice) {
          newPrice = rule.conditions.maxPrice;
        }

        // Update item price if changed using SDK
        if (shouldUpdate && newPrice !== item.price) {
          await sdkManager.updateItem(accountId, itemId, {
            price: Math.round(newPrice * 100) / 100
          });

          results.updated++;
          results.details.push({
            itemId,
            title: item.title,
            oldPrice: item.price,
            newPrice: Math.round(newPrice * 100) / 100,
            status: 'updated',
          });
        } else {
          results.details.push({
            itemId,
            title: item.title,
            oldPrice: item.price,
            newPrice: item.price,
            status: 'no_change',
          });
        }

        results.processed++;
      } catch (itemError) {
        results.errors++;
        results.details.push({
          itemId,
          status: 'error',
          error: itemError.message,
        });
      }
    }

    // Update rule with last run info
    rule.lastRun = new Date().toISOString();
    rule.runCount = (rule.runCount || 0) + 1;
    priceRules.set(ruleId, rule);

    logger.info('Price rule executed:', {
      ruleId,
      processed: results.processed,
      updated: results.updated,
    });

    res.json({
      success: true,
      data: results,
      message: `Rule executed: ${results.updated} items updated`,
    });
  } catch (error) {
    logger.error('Error running rule:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/price-automation/:accountId/rules/:ruleId/toggle
 * Toggle rule status (active/paused)
 */
router.post('/:accountId/rules/:ruleId/toggle', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { ruleId } = req.params;
    
    const rule = priceRules.get(ruleId);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }

    rule.status = rule.status === 'active' ? 'paused' : 'active';
    rule.updatedAt = new Date().toISOString();
    priceRules.set(ruleId, rule);

    logger.info('Price rule toggled:', { ruleId, status: rule.status });

    res.json({
      success: true,
      data: { id: ruleId, ...rule },
      message: `Rule ${rule.status === 'active' ? 'activated' : 'paused'}`,
    });
  } catch (error) {
    logger.error('Error toggling rule:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/price-automation/:accountId/competitor-prices/:itemId
 * Get competitor prices for an item
 */
router.get('/:accountId/competitor-prices/:itemId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId, itemId } = req.params;

    // Get item details using SDK
    const item = await sdkManager.getItem(accountId, itemId);

    // Search for similar items (competitors) using SDK
    const searchData = await sdkManager.searchByQuery(accountId, '', {
      category: item.category_id,
      limit: 10,
      sort: 'price_asc'
    });

    const competitors = (searchData.results || [])
      .filter(r => r.id !== itemId)
      .map(r => ({
        id: r.id,
        title: r.title,
        price: r.price,
        currency: r.currency_id,
        thumbnail: r.thumbnail,
        soldQuantity: r.sold_quantity,
        sellerReputation: r.seller?.seller_reputation?.level_id,
      }));

    res.json({
      success: true,
      data: {
        item: {
          id: item.id,
          title: item.title,
          price: item.price,
          currency: item.currency_id,
        },
        competitors,
        lowestPrice: competitors.length > 0 ? Math.min(...competitors.map(c => c.price)) : item.price,
        averagePrice: competitors.length > 0
          ? competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length
          : item.price,
      },
    });
  } catch (error) {
    logger.error('Error fetching competitor prices:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/price-automation/:accountId/stats
 * Get price automation statistics
 */
router.get('/:accountId/stats', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    let totalRules = 0;
    let activeRules = 0;
    let totalItemsAffected = 0;
    let lastExecution = null;

    priceRules.forEach((rule) => {
      if (rule.accountId === accountId) {
        totalRules++;
        if (rule.status === 'active') {
          activeRules++;
        }
        totalItemsAffected += rule.items?.length || 0;
        if (rule.lastRun && (!lastExecution || rule.lastRun > lastExecution)) {
          lastExecution = rule.lastRun;
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalRules,
        activeRules,
        pausedRules: totalRules - activeRules,
        totalItemsAffected,
        lastExecution,
      },
    });
  } catch (error) {
    logger.error('Error fetching stats:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});


module.exports = router;
