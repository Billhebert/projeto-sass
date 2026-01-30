/**
 * Products Routes
 * Manage synced products from Mercado Livre
 *
 * GET    /api/products                        - List all products for user
 * GET    /api/products/:accountId             - List products for specific account
 * GET    /api/products/:accountId/:productId  - Get product details
 * POST   /api/products/:accountId/sync        - Sync products from ML
 * DELETE /api/products/:accountId/:productId  - Delete/remove product
 * GET    /api/products/:accountId/stats       - Get product statistics
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
 * GET /api/products
 * List all products for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status, sort = '-createdAt' } = req.query;

    const query = { userId: req.user.userId };
    if (status) query.status = status;

    const products = await Product.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products: products.map(p => p.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_PRODUCTS_ERROR',
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    });
  }
});

/**
 * GET /api/products/:accountId/stats
 * Get product statistics for an account
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

    // Get statistics
    const totalProducts = await Product.countDocuments({
      accountId,
      userId: req.user.userId,
      status: { $ne: 'removed' },
    });

    const activeProducts = await Product.countDocuments({
      accountId,
      userId: req.user.userId,
      status: 'active',
    });

    const pausedProducts = await Product.countDocuments({
      accountId,
      userId: req.user.userId,
      status: 'paused',
    });

    const lowStockProducts = await Product.countDocuments({
      accountId,
      userId: req.user.userId,
      status: 'active',
      'quantity.available': { $lte: 5, $gt: 0 },
    });

    const outOfStockProducts = await Product.countDocuments({
      accountId,
      userId: req.user.userId,
      'quantity.available': 0,
    });

    // Get total sales and views
    const salesStats = await Product.aggregate([
      {
        $match: {
          accountId,
          userId: req.user.userId,
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$salesCount' },
          totalViews: { $sum: '$viewCount' },
          totalQuestions: { $sum: '$questionCount' },
          totalInventory: { $sum: '$quantity.available' },
          totalValue: {
            $sum: {
              $multiply: ['$price.amount', '$quantity.available'],
            },
          },
        },
      },
    ]);

    const stats = salesStats[0] || {
      totalSales: 0,
      totalViews: 0,
      totalQuestions: 0,
      totalInventory: 0,
      totalValue: 0,
    };

    res.json({
      success: true,
      data: {
        accountId,
        products: {
          total: totalProducts,
          active: activeProducts,
          paused: pausedProducts,
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts,
        },
        sales: stats.totalSales,
        views: stats.totalViews,
        questions: stats.totalQuestions,
        inventory: stats.totalInventory,
        estimatedValue: stats.totalValue,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_PRODUCT_STATS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get product statistics',
      error: error.message,
    });
  }
});
router.get('/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 20, offset = 0, status, sort = '-createdAt' } = req.query;

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

    const products = await Product.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        products: products.map(p => p.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ACCOUNT_PRODUCTS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    });
  }
});

/**
 * GET /api/products/:accountId/:productId
 * Get detailed product information
 */
router.get('/:accountId/:productId', authenticateToken, async (req, res) => {
  try {
    const { accountId, productId } = req.params;

    const product = await Product.findOne({
      id: productId,
      accountId,
      userId: req.user.userId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'GET_PRODUCT_ERROR',
      productId: req.params.productId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message,
    });
  }
});

/**
 * POST /api/products/:accountId/sync
 * Sync products from Mercado Livre usando access token do usuário
 * 
 * Middleware validateMLToken:
 * - Verifies token is not expired
 * - Auto-refreshes if about to expire (if refreshToken available)
 * - Returns error if token is invalid/expired
 */
router.post('/:accountId/sync', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    // Use account from middleware instead of fetching again
    const account = req.mlAccount;

    logger.info({
      action: 'PRODUCTS_SYNC_STARTED',
      accountId,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    // Fetch products from ML usando o token do usuário
    const mlProducts = await fetchMLProducts(account.mlUserId, account.accessToken);

    // Store/update products in database
    const savedProducts = await saveProducts(accountId, req.user.userId, mlProducts);

    logger.info({
      action: 'PRODUCTS_SYNC_COMPLETED',
      accountId,
      userId: req.user.userId,
      productsCount: savedProducts.length,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Synchronized ${savedProducts.length} products`,
      data: {
        accountId,
        productsCount: savedProducts.length,
        products: savedProducts.map(p => p.getSummary()),
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({
      action: 'PRODUCTS_SYNC_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to sync products',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/products/:accountId/:productId
 * Remove a product
 */
router.delete('/:accountId/:productId', authenticateToken, async (req, res) => {
  try {
    const { accountId, productId } = req.params;

    const product = await Product.findOne({
      id: productId,
      accountId,
      userId: req.user.userId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Mark as removed instead of deleting
    product.status = 'removed';
    await product.save();

    logger.info({
      action: 'PRODUCT_REMOVED',
      productId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Product removed successfully',
    });
  } catch (error) {
    logger.error({
      action: 'REMOVE_PRODUCT_ERROR',
      productId: req.params.productId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to remove product',
      error: error.message,
    });
  }
});

/**

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Buscar produtos do Mercado Livre API usando token do usuário
 * Busca todos os produtos usando paginação
 */
async function fetchMLProducts(mlUserId, accessToken) {
  try {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // First, get the total count and first batch of items
    let allItemIds = [];
    let offset = 0;
    const limit = 50;
    let total = 0;

    // Fetch all item IDs with pagination
    do {
      const response = await axios.get(
        `${ML_API_BASE}/users/${mlUserId}/items/search?limit=${limit}&offset=${offset}`,
        { headers }
      );

      const itemIds = response.data.results || [];
      allItemIds = allItemIds.concat(itemIds);
      total = response.data.paging?.total || itemIds.length;
      offset += limit;

      logger.info({
        action: 'FETCH_ML_ITEMS_PROGRESS',
        mlUserId,
        fetched: allItemIds.length,
        total,
      });
    } while (offset < total && allItemIds.length < 500); // Limit to 500 products max

    if (allItemIds.length === 0) {
      return [];
    }

    logger.info({
      action: 'FETCH_ML_ITEMS_COMPLETE',
      mlUserId,
      totalItems: allItemIds.length,
    });

    // Fetch detailed info for each item in batches of 20 (ML API allows multiget)
    const detailedProducts = [];
    const batchSize = 20;

    for (let i = 0; i < allItemIds.length; i += batchSize) {
      const batch = allItemIds.slice(i, i + batchSize);
      
      // Use multiget endpoint for better performance
      try {
        const multigetResponse = await axios.get(
          `${ML_API_BASE}/items?ids=${batch.join(',')}`,
          { headers }
        );
        
        // Multiget returns array of objects with body property
        for (const item of multigetResponse.data) {
          if (item.code === 200 && item.body) {
            detailedProducts.push(item.body);
          } else {
            logger.warn({
              action: 'FETCH_PRODUCT_SKIPPED',
              itemId: batch[multigetResponse.data.indexOf(item)],
              code: item.code,
              error: item.body?.message,
            });
          }
        }
      } catch (batchError) {
        // Fallback to individual requests if multiget fails
        logger.warn({
          action: 'MULTIGET_FAILED_FALLBACK',
          error: batchError.message,
        });
        
        const batchResults = await Promise.all(
          batch.map(itemId =>
            axios
              .get(`${ML_API_BASE}/items/${itemId}`, { headers })
              .then(res => res.data)
              .catch(error => {
                logger.warn({
                  action: 'FETCH_PRODUCT_DETAILS_ERROR',
                  itemId,
                  error: error.message,
                });
                return null;
              })
          )
        );
        
        detailedProducts.push(...batchResults.filter(p => p !== null));
      }
    }

    logger.info({
      action: 'FETCH_ML_PRODUCTS_COMPLETE',
      mlUserId,
      totalProducts: detailedProducts.length,
    });

    return detailedProducts;
  } catch (error) {
    logger.error({
      action: 'FETCH_ML_PRODUCTS_ERROR',
      mlUserId,
      error: error.response?.data || error.message,
    });
    throw new Error(`Failed to fetch products from Mercado Livre: ${error.message}`);
  }
}

/**
 * Save or update products in database
 */
async function saveProducts(accountId, userId, mlProducts) {
  const savedProducts = [];

  for (const mlProduct of mlProducts) {
    try {
      const productData = {
        accountId,
        userId,
        mlProductId: mlProduct.id,
        title: mlProduct.title,
        description: mlProduct.description,
        category: {
          categoryId: mlProduct.category_id,
          categoryName: mlProduct.category_name,
        },
        price: {
          currency: mlProduct.currency_id || 'BRL',
          amount: mlProduct.price,
          originalPrice: mlProduct.original_price,
        },
        quantity: {
          available: mlProduct.available_quantity || 0,
          sold: mlProduct.sold_quantity || 0,
          reserved: 0,
        },
        status: mlProduct.status || 'active',
        mlStatus: mlProduct.status,
        images: (mlProduct.pictures || []).map((pic, idx) => ({
          url: pic.url,
          position: idx,
        })),
        thumbnailUrl: mlProduct.thumbnail,
        shipping: {
          freeShipping: mlProduct.shipping?.free_shipping || false,
          acceptsMercadopagoShipping:
            mlProduct.shipping?.accepts_mercadopago_shipping || false,
          mode: mlProduct.shipping?.mode,
          acceptsPickup: mlProduct.shipping?.accepts_pickup || false,
        },
        sellerId: mlProduct.seller_id,
        sellerNickname: mlProduct.seller_custom_fields?.nickname,
        ratings: {
          averageScore: mlProduct.rating,
          totalRatings: mlProduct.ratingcount || 0,
        },
        attributes: (mlProduct.attributes || []).map(attr => ({
          name: attr.name,
          value: attr.value_name || attr.value_id,
        })),
        permalinkUrl: mlProduct.permalink,
        mlUrl: mlProduct.secure_url || mlProduct.permalink,
        viewCount: mlProduct.views || 0,
        questionCount: mlProduct.questions || 0,
        salesCount: mlProduct.sold_quantity || 0,
        startTime: mlProduct.start_time,
        stopTime: mlProduct.stop_time,
        buyingMode: mlProduct.buying_mode,
        condition: mlProduct.condition,
        acceptsMercadocredits: mlProduct.accepts_mercadocredits,
      };

      // Find or create product
      let product = await Product.findOne({
        accountId,
        mlProductId: mlProduct.id,
      });

      if (product) {
        // Update existing product
        Object.assign(product, productData);
        product.lastSyncedAt = new Date();
        await product.save();
      } else {
        // Create new product
        product = new Product(productData);
        await product.save();
      }

      savedProducts.push(product);
    } catch (error) {
      logger.error({
        action: 'SAVE_PRODUCT_ERROR',
        mlProductId: mlProduct.id,
        accountId,
        error: error.message,
      });
    }
  }

  return savedProducts;
}

module.exports = router;
