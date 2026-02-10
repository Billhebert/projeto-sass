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

const express = require("express");
const axios = require("axios");
const logger = require("../logger");
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require("../middleware/auth");
const { validateMLToken } = require("../middleware/ml-token-validation");
const Product = require("../db/models/Product");
const MLAccount = require("../db/models/MLAccount");

const router = express.Router();

const ML_API_BASE = "https://api.mercadolibre.com";

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
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

/**
 * Get and validate ML account
 */
async function getAndValidateAccount(accountId, userId) {
  return MLAccount.findOne({
    id: accountId,
    userId,
  });
}

// ============================================================================
// PRODUCT-SPECIFIC HELPER FUNCTIONS
// ============================================================================

/**
 * Build product search query
 */
function buildProductQuery(userId, accountId = null, status = null) {
  const query = { userId };
  if (accountId) query.accountId = accountId;
  if (status) query.status = status;
  return query;
}

/**
 * Build product search options
 */
function buildProductSearchOptions(query) {
  const limit = query.all === "true" ? 999999 : parseInt(query.queryLimit || 100);
  return {
    limit,
    offset: parseInt(query.offset || 0),
    sort: query.sort || "-createdAt",
  };
}

/**
 * Get product statistics for account
 */
async function getProductStats(accountId, userId) {
  const totalProducts = await Product.countDocuments({
    accountId,
    userId,
    status: { $ne: "removed" },
  });

  const activeProducts = await Product.countDocuments({
    accountId,
    userId,
    status: "active",
  });

  const pausedProducts = await Product.countDocuments({
    accountId,
    userId,
    status: "paused",
  });

  const lowStockProducts = await Product.countDocuments({
    accountId,
    userId,
    status: "active",
    "quantity.available": { $lte: 5, $gt: 0 },
  });

  const outOfStockProducts = await Product.countDocuments({
    accountId,
    userId,
    "quantity.available": 0,
  });

  const salesStats = await Product.aggregate([
    { $match: { accountId, userId } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$salesCount" },
        totalViews: { $sum: "$viewCount" },
        totalQuestions: { $sum: "$questionCount" },
        totalInventory: { $sum: "$quantity.available" },
        totalValue: {
          $sum: { $multiply: ["$price.amount", "$quantity.available"] },
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

  return {
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
  };
}

/**
 * Format competitor data
 */
function formatCompetitor(item) {
  return {
    id: item.id,
    seller: item.seller?.nickname || "N/A",
    seller_id: item.seller?.id,
    reputation: item.seller?.seller_reputation?.level_id || "unknown",
    totalSales: item.sold_quantity || 0,
    price: item.price,
    shipping: item.shipping?.free_shipping ? "free" : item.shipping?.cost || 0,
    listingType: item.listing_type_id,
    condition: item.condition,
    available: item.available_quantity || 0,
    permalink: item.permalink,
    thumbnail: item.thumbnail,
  };
}

/**
 * Calculate competitor statistics
 */
function calculateCompetitorStats(competitors) {
  return {
    total: competitors.length,
    avg_price: competitors.length > 0
      ? competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length
      : 0,
    min_price: competitors.length > 0
      ? Math.min(...competitors.map((c) => c.price))
      : 0,
    max_price: competitors.length > 0
      ? Math.max(...competitors.map((c) => c.price))
      : 0,
  };
}

/**
 * Fetch competitors by catalog product ID
 */
async function fetchCompetitorsByCatalog(productId, catalogId, headers, SITE_ID) {
  const searchRes = await axios.get(`${ML_API_BASE}/sites/${SITE_ID}/search`, {
    params: {
      catalog_product_id: catalogId,
      limit: 50,
    },
  });

  return searchRes.data.results
    .filter((item) => item.id !== productId)
    .map(formatCompetitor)
    .sort((a, b) => a.price - b.price);
}

/**
 * Fetch competitors by product title
 */
async function fetchCompetitorsByTitle(productId, title, headers, SITE_ID) {
  const searchRes = await axios.get(`${ML_API_BASE}/sites/${SITE_ID}/search`, {
    params: {
      q: title,
      limit: 50,
    },
  });

  return searchRes.data.results
    .filter(
      (item) =>
        item.id !== productId &&
        item.title.includes(title.split(" ")[0]),
    )
    .map(formatCompetitor)
    .sort((a, b) => a.price - b.price);
}

/**
 * GET /api/products
 * List all products for the authenticated user
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const searchOptions = buildProductSearchOptions(req.query);
    const query = buildProductQuery(req.user.userId, null, req.query.status);

    const products = await Product.find(query)
      .sort(searchOptions.sort)
      .limit(searchOptions.limit)
      .skip(searchOptions.offset);

    const total = await Product.countDocuments(query);

    return sendSuccess(res, {
      products: products.map((p) => p.getSummary()),
      total,
      limit: searchOptions.limit,
      offset: searchOptions.offset,
    });
  } catch (error) {
    return handleError(res, 500, 'Failed to fetch products', error, 'GET_PRODUCTS_ERROR', {
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/products/:accountId/stats
 * Get product statistics for an account
 */
router.get("/:accountId/stats", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await getAndValidateAccount(accountId, req.user.userId);

    if (!account) {
      return handleError(res, 404, 'Account not found', {}, 'GET_PRODUCT_STATS_ERROR', {
        accountId,
        userId: req.user.userId,
      });
    }

    const stats = await getProductStats(accountId, req.user.userId);

    return sendSuccess(res, {
      accountId,
      ...stats,
    });
  } catch (error) {
    return handleError(res, 500, 'Failed to get product statistics', error, 'GET_PRODUCT_STATS_ERROR', {
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});
router.get("/:accountId", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await getAndValidateAccount(accountId, req.user.userId);

    if (!account) {
      return handleError(res, 404, 'Account not found', {}, 'GET_ACCOUNT_PRODUCTS_ERROR', {
        accountId,
        userId: req.user.userId,
      });
    }

    const searchOptions = buildProductSearchOptions(req.query);
    const query = buildProductQuery(req.user.userId, accountId, req.query.status);

    const products = await Product.find(query)
      .sort(searchOptions.sort)
      .limit(searchOptions.limit)
      .skip(searchOptions.offset);

    const total = await Product.countDocuments(query);

    return sendSuccess(res, {
      account: {
        id: account.id,
        nickname: account.nickname,
      },
      products: products.map((p) => p.getSummary()),
      total,
      limit: searchOptions.limit,
      offset: searchOptions.offset,
    });
  } catch (error) {
    return handleError(res, 500, 'Failed to fetch products', error, 'GET_ACCOUNT_PRODUCTS_ERROR', {
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/products/:accountId/:productId
 * Get detailed product information
 */
router.get("/:accountId/:productId", authenticateToken, async (req, res) => {
  try {
    const { accountId, productId } = req.params;

    const product = await Product.findOne({
      id: productId,
      accountId,
      userId: req.user.userId,
    });

    if (!product) {
      return handleError(res, 404, 'Product not found', {}, 'GET_PRODUCT_ERROR', {
        productId,
        userId: req.user.userId,
      });
    }

    return sendSuccess(res, product.getDetails());
  } catch (error) {
    return handleError(res, 500, 'Failed to fetch product', error, 'GET_PRODUCT_ERROR', {
      productId: req.params.productId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/products/:accountId/:productId/competitors
 * Get competitors for a specific product
 */
router.get(
  "/:accountId/:productId/competitors",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, productId } = req.params;
      const account = req.mlAccount;
      const SITE_ID = 'MLB'; // Default for Brazil

      const headers = buildHeaders(account.accessToken);

      // Get the product first
      const productRes = await axios.get(`${ML_API_BASE}/items/${productId}`, {
        headers,
      });

      const product = productRes.data;
      let competitors = [];

      // Fetch competitors by catalog ID or title
      if (product.catalog_product_id) {
        competitors = await fetchCompetitorsByCatalog(productId, product.catalog_product_id, headers, SITE_ID);
      } else {
        competitors = await fetchCompetitorsByTitle(productId, product.title, headers, SITE_ID);
      }

      logger.info({
        action: "GET_PRODUCT_COMPETITORS",
        accountId,
        productId,
        competitorsFound: competitors.length,
        userId: req.user.userId,
      });

      const stats = calculateCompetitorStats(competitors);

      return sendSuccess(res, {
        product: {
          id: product.id,
          title: product.title,
          price: product.price,
          catalog_product_id: product.catalog_product_id,
        },
        competitors,
        stats,
      });
    } catch (error) {
      return handleError(
        res,
        error.response?.status || 500,
        'Failed to fetch competitors',
        error,
        'GET_PRODUCT_COMPETITORS_ERROR',
        {
          accountId: req.params.accountId,
          productId: req.params.productId,
          userId: req.user.userId,
        }
      );
    }
  },
);

/**
 * POST /api/products/:accountId/sync
 * Sync products from Mercado Livre API
 */
router.post(
  "/:accountId/sync",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { all = false } = req.body;
      const account = req.mlAccount;

      logger.info({
        action: "PRODUCTS_SYNC_STARTED",
        accountId,
        userId: req.user.userId,
        all,
        timestamp: new Date().toISOString(),
      });

      const mlProducts = await fetchMLProducts(account.mlUserId, account.accessToken, { all });
      const savedProducts = await saveProducts(accountId, req.user.userId, mlProducts);

      logger.info({
        action: "PRODUCTS_SYNC_COMPLETED",
        accountId,
        userId: req.user.userId,
        productsCount: savedProducts.length,
        timestamp: new Date().toISOString(),
      });

      return sendSuccess(res, {
        accountId,
        productsCount: savedProducts.length,
        products: savedProducts.map((p) => p.getSummary()),
        syncedAt: new Date().toISOString(),
      }, `Synchronized ${savedProducts.length} products`);
    } catch (error) {
      return handleError(res, 500, 'Failed to sync products', error, 'PRODUCTS_SYNC_ERROR', {
        accountId: req.params.accountId,
        userId: req.user.userId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * DELETE /api/products/:accountId/:productId
 * Remove a product
 */
router.delete("/:accountId/:productId", authenticateToken, async (req, res) => {
  try {
    const { accountId, productId } = req.params;

    const product = await Product.findOne({
      id: productId,
      accountId,
      userId: req.user.userId,
    });

    if (!product) {
      return handleError(res, 404, 'Product not found', {}, 'REMOVE_PRODUCT_ERROR', {
        productId,
        userId: req.user.userId,
      });
    }

    product.status = "removed";
    await product.save();

    logger.info({
      action: "PRODUCT_REMOVED",
      productId,
      accountId,
      userId: req.user.userId,
    });

    return sendSuccess(res, {}, 'Product removed successfully');
  } catch (error) {
    return handleError(res, 500, 'Failed to remove product', error, 'REMOVE_PRODUCT_ERROR', {
      productId: req.params.productId,
      userId: req.user.userId,
    });
  }
});

// ============================================================================
// PRODUCT FETCH & SAVE HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch products from Mercado Livre API
 */
async function fetchMLProducts(mlUserId, accessToken, options = {}) {
  try {
    const headers = buildHeaders(accessToken);
    const { all = false } = options;

    let allItemIds = [];
    let offset = 0;
    const limit = 50;
    let total = 0;

    // Fetch all item IDs with pagination
    do {
      const response = await axios.get(
        `${ML_API_BASE}/users/${mlUserId}/items/search?limit=${limit}&offset=${offset}`,
        { headers },
      );

      const itemIds = response.data.results || [];
      allItemIds = allItemIds.concat(itemIds);
      total = response.data.paging?.total || itemIds.length;
      offset += limit;

      logger.info({
        action: "FETCH_ML_ITEMS_PROGRESS",
        mlUserId,
        fetched: allItemIds.length,
        total,
      });

      if (!all && allItemIds.length >= 500) break;
    } while (offset < total);

    if (allItemIds.length === 0) {
      return [];
    }

    logger.info({
      action: "FETCH_ML_ITEMS_COMPLETE",
      mlUserId,
      totalItems: allItemIds.length,
    });

    // Fetch detailed info for each item in batches
    const detailedProducts = [];
    const batchSize = 20;

    for (let i = 0; i < allItemIds.length; i += batchSize) {
      const batch = allItemIds.slice(i, i + batchSize);

      try {
        const multigetResponse = await axios.get(
          `${ML_API_BASE}/items?ids=${batch.join(",")}`,
          { headers },
        );

        for (const item of multigetResponse.data) {
          if (item.code === 200 && item.body) {
            detailedProducts.push(item.body);
          } else {
            logger.warn({
              action: "FETCH_PRODUCT_SKIPPED",
              itemId: batch[multigetResponse.data.indexOf(item)],
              code: item.code,
              error: item.body?.message,
            });
          }
        }
      } catch (batchError) {
        logger.warn({
          action: "MULTIGET_FAILED_FALLBACK",
          error: batchError.message,
        });

        const batchResults = await Promise.all(
          batch.map((itemId) =>
            axios
              .get(`${ML_API_BASE}/items/${itemId}`, { headers })
              .then((res) => res.data)
              .catch((error) => {
                logger.warn({
                  action: "FETCH_PRODUCT_DETAILS_ERROR",
                  itemId,
                  error: error.message,
                });
                return null;
              }),
          ),
        );

        detailedProducts.push(...batchResults.filter((p) => p !== null));
      }
    }

    logger.info({
      action: "FETCH_ML_PRODUCTS_COMPLETE",
      mlUserId,
      totalProducts: detailedProducts.length,
    });

    return detailedProducts;
  } catch (error) {
    logger.error({
      action: "FETCH_ML_PRODUCTS_ERROR",
      mlUserId,
      error: error.response?.data || error.message,
    });
    throw new Error(
      `Failed to fetch products from Mercado Livre: ${error.message}`,
    );
  }
}

/**
 * Format product data from ML API
 */
function formatProductData(accountId, userId, mlProduct) {
  return {
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
      currency: mlProduct.currency_id || "BRL",
      amount: mlProduct.price,
      originalPrice: mlProduct.original_price,
    },
    quantity: {
      available: mlProduct.available_quantity || 0,
      sold: mlProduct.sold_quantity || 0,
      reserved: 0,
    },
    status: mlProduct.status || "active",
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
    attributes: (mlProduct.attributes || []).map((attr) => ({
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
}

/**
 * Save or update products in database
 */
async function saveProducts(accountId, userId, mlProducts) {
  const savedProducts = [];

  for (const mlProduct of mlProducts) {
    try {
      const productData = formatProductData(accountId, userId, mlProduct);

      let product = await Product.findOne({
        accountId,
        mlProductId: mlProduct.id,
      });

      if (product) {
        Object.assign(product, productData);
        product.lastSyncedAt = new Date();
        await product.save();
      } else {
        product = new Product(productData);
        await product.save();
      }

      savedProducts.push(product);
    } catch (error) {
      logger.error({
        action: "SAVE_PRODUCT_ERROR",
        mlProductId: mlProduct.id,
        accountId,
        error: error.message,
      });
    }
  }

  return savedProducts;
}

module.exports = router;
