/**
 * Quality Routes
 * Mercado Livre Item Quality & Health API Integration
 * 
 * Endpoints:
 * - GET /api/quality/:accountId/items/:itemId/health - Get item health score
 * - GET /api/quality/:accountId/items/:itemId/opportunities - Get improvement opportunities
 * - GET /api/quality/:accountId/overview - Get overall quality metrics
 * - GET /api/quality/:accountId/items/:itemId/rules - Get moderation rules
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../logger');
const MLAccount = require('../db/models/MLAccount');
const { authenticateToken } = require('../middleware/auth');

const ML_API_BASE = 'https://api.mercadolibre.com';

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
 * GET /api/quality/:accountId
 * Get quality overview for all items in an account
 */
router.get('/:accountId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const { limit = 50 } = req.query;

    // Get user's active items
    const itemsResponse = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/items/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { status: 'active', limit: parseInt(limit) },
      }
    );

    const itemIds = itemsResponse.data.results || [];
    
    // Get details for each item with health/quality data
    const items = [];
    const batchSize = 20; // Process in batches to avoid rate limiting
    
    for (let i = 0; i < Math.min(itemIds.length, parseInt(limit)); i += batchSize) {
      const batch = itemIds.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (itemId) => {
          try {
            // Get item details
            const itemResponse = await axios.get(
              `${ML_API_BASE}/items/${itemId}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            
            const item = itemResponse.data;
            
            // Try to get health score
            let health = null;
            try {
              const healthResponse = await axios.get(
                `${ML_API_BASE}/items/${itemId}/health`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              health = healthResponse.data;
            } catch (healthErr) {
              // Health endpoint might not be available for all items
            }

            // Calculate quality level based on available data
            const qualityScore = calculateQualityScore(item, health);
            
            return {
              _id: item.id,
              mlItemId: item.id.replace('MLB', ''),
              title: item.title,
              thumbnail: item.thumbnail,
              price: item.price,
              status: item.status,
              permalink: item.permalink,
              health,
              quality: {
                level: qualityScore >= 80 ? 'professional' : qualityScore >= 60 ? 'satisfactory' : 'basic',
                score: qualityScore,
                issues: analyzeItemIssues(item, health),
              },
            };
          } catch (err) {
            logger.warn(`Failed to get item ${itemId}:`, err.message);
            return null;
          }
        })
      );
      
      items.push(...batchResults.filter(item => item !== null));
    }

    // Calculate overall stats
    const stats = {
      professional: items.filter(i => i.quality?.level === 'professional').length,
      satisfactory: items.filter(i => i.quality?.level === 'satisfactory').length,
      basic: items.filter(i => i.quality?.level === 'basic').length,
      total: items.length,
    };

    res.json({
      success: true,
      items,
      stats,
      total: itemsResponse.data.paging?.total || items.length,
    });
  } catch (error) {
    logger.error('Error fetching quality overview:', {
      error: error.message,
      accountId: req.params.accountId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * Calculate quality score based on item attributes
 */
function calculateQualityScore(item, health) {
  let score = 50; // Base score

  // Health API score if available
  if (health?.health_level) {
    if (health.health_level === 'green') return 90;
    if (health.health_level === 'yellow') return 70;
    if (health.health_level === 'red') return 40;
  }

  // Pictures quality
  const pictures = item.pictures || [];
  if (pictures.length >= 6) score += 15;
  else if (pictures.length >= 3) score += 10;
  else if (pictures.length >= 1) score += 5;

  // Description
  if (item.description || item.plain_text) score += 10;

  // Attributes filled
  const attributes = item.attributes || [];
  const filledAttributes = attributes.filter(a => a.value_name).length;
  if (filledAttributes >= 10) score += 15;
  else if (filledAttributes >= 5) score += 10;
  else if (filledAttributes >= 1) score += 5;

  // Has GTIN/EAN
  const hasGtin = attributes.some(a => 
    ['GTIN', 'EAN', 'UPC', 'ISBN'].includes(a.id) && a.value_name
  );
  if (hasGtin) score += 10;

  // Active status
  if (item.status === 'active') score += 5;

  // Has video
  if (item.video_id) score += 5;

  return Math.min(score, 100);
}

/**
 * Analyze item for potential quality issues
 */
function analyzeItemIssues(item, health) {
  const issues = [];

  // Check pictures
  const pictures = item.pictures || [];
  if (pictures.length < 3) {
    issues.push({
      code: 'missing_pictures',
      message: 'Adicione mais fotos ao anuncio (minimo 3 recomendado)',
      priority: 'high',
    });
  }

  // Check for low quality pictures (simplified check)
  if (pictures.length > 0 && pictures.some(p => p.size === 'S' || !p.max_size)) {
    issues.push({
      code: 'low_quality_pictures',
      message: 'Melhore a qualidade das fotos',
      priority: 'medium',
    });
  }

  // Check attributes
  const attributes = item.attributes || [];
  const filledAttributes = attributes.filter(a => a.value_name).length;
  if (filledAttributes < 5) {
    issues.push({
      code: 'missing_attributes',
      message: 'Complete os atributos do produto',
      priority: 'high',
    });
  }

  // Check GTIN
  const hasGtin = attributes.some(a => 
    ['GTIN', 'EAN', 'UPC', 'ISBN'].includes(a.id) && a.value_name
  );
  if (!hasGtin) {
    issues.push({
      code: 'missing_gtin',
      message: 'Adicione o codigo EAN/GTIN',
      priority: 'medium',
    });
  }

  // Add issues from health API if available
  if (health?.actions) {
    health.actions.forEach(action => {
      issues.push({
        code: action.id,
        message: action.label || action.tooltip,
        priority: action.mandatory ? 'high' : 'medium',
      });
    });
  }

  return issues;
}

/**
 * GET /api/quality/:accountId/items/:itemId/health
 * Get health score for a specific item
 */
router.get('/:accountId/items/:itemId/health', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/items/${itemId}/health`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching item health:', {
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
 * GET /api/quality/:accountId/items/:itemId/sale-terms
 * Get sale terms and quality indicators
 */
router.get('/:accountId/items/:itemId/sale-terms', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/items/${itemId}/sale_terms`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching sale terms:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/quality/:accountId/items/:itemId/rules
 * Get moderation rules for an item
 */
router.get('/:accountId/items/:itemId/rules', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/items/${itemId}/rules`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching item rules:', {
      error: error.message,
    });

    // Rules endpoint might return 404 if no rules
    if (error.response?.status === 404) {
      return res.json({
        success: true,
        data: [],
        message: 'No moderation rules for this item',
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/quality/:accountId/overview
 * Get overall quality overview for the seller
 */
router.get('/:accountId/overview', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;

    // Get user info with reputation and quality metrics
    const [userResponse, itemsResponse] = await Promise.all([
      axios.get(`${ML_API_BASE}/users/${mlUserId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      axios.get(`${ML_API_BASE}/users/${mlUserId}/items/search`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { status: 'active', limit: 100 },
      }),
    ]);

    const { seller_reputation, status } = userResponse.data;
    const items = itemsResponse.data.results || [];

    // Calculate quality metrics
    const qualityOverview = {
      seller: {
        levelId: seller_reputation?.level_id,
        powerSellerStatus: seller_reputation?.power_seller_status,
        transactions: seller_reputation?.transactions,
        metrics: seller_reputation?.metrics,
      },
      items: {
        total: itemsResponse.data.paging?.total || 0,
        active: items.length,
      },
      status: status?.site_status,
    };

    res.json({
      success: true,
      data: qualityOverview,
    });
  } catch (error) {
    logger.error('Error fetching quality overview:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/quality/:accountId/reputation
 * Get detailed reputation metrics
 */
router.get('/:accountId/reputation', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const { seller_reputation, buyer_reputation } = response.data;

    res.json({
      success: true,
      data: {
        seller: {
          levelId: seller_reputation?.level_id,
          powerSellerStatus: seller_reputation?.power_seller_status,
          transactions: {
            canceled: seller_reputation?.transactions?.canceled,
            completed: seller_reputation?.transactions?.completed,
            total: seller_reputation?.transactions?.total,
            ratings: seller_reputation?.transactions?.ratings,
            period: seller_reputation?.transactions?.period,
          },
          metrics: {
            sales: seller_reputation?.metrics?.sales,
            claims: seller_reputation?.metrics?.claims,
            delayedHandlingTime: seller_reputation?.metrics?.delayed_handling_time,
            cancellations: seller_reputation?.metrics?.cancellations,
          },
        },
        buyer: buyer_reputation,
      },
    });
  } catch (error) {
    logger.error('Error fetching reputation:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/quality/:accountId/sale-restrictions
 * Get sale restrictions for the seller
 */
router.get('/:accountId/sale-restrictions', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/sale_restrictions`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching sale restrictions:', {
      error: error.message,
    });

    if (error.response?.status === 404) {
      return res.json({
        success: true,
        data: [],
        message: 'No sale restrictions',
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/quality/:accountId/items-with-issues
 * Get items with quality issues
 */
router.get('/:accountId/items-with-issues', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const { limit = 50 } = req.query;

    // Search for items with issues (paused due to moderation)
    const response = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/items/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          status: 'paused',
          limit,
        },
      }
    );

    const itemIds = response.data.results || [];
    
    // Get details for each item
    let itemsWithIssues = [];
    if (itemIds.length > 0) {
      const itemDetails = await Promise.all(
        itemIds.slice(0, 20).map(id =>
          axios.get(`${ML_API_BASE}/items/${id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).catch(() => null)
        )
      );

      itemsWithIssues = itemDetails
        .filter(r => r !== null)
        .map(r => ({
          id: r.data.id,
          title: r.data.title,
          status: r.data.status,
          substatus: r.data.sub_status,
          thumbnail: r.data.thumbnail,
          price: r.data.price,
          permalink: r.data.permalink,
        }));
    }

    res.json({
      success: true,
      data: {
        total: response.data.paging?.total || 0,
        items: itemsWithIssues,
      },
    });
  } catch (error) {
    logger.error('Error fetching items with issues:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

module.exports = router;
