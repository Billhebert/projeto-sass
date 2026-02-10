/**
 * Catalog Routes
 * Manage Mercado Livre official catalog
 */

const express = require("express");
const logger = require("../logger");
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require("../middleware/auth");
const { validateMLToken } = require("../middleware/ml-token-validation");
const MLAccount = require("../db/models/MLAccount");
const { handleError, sendSuccess } = require('../middleware/response-helpers');

const router = express.Router();

const SITE_ID = "MLB";

/**
 * Extract and process catalog product search result
 */
function processCompetition(results, itemId) {
  const prices = results
    .map((r) => r.price)
    .filter((p) => p > 0);

  return {
    myItem: results.find((r) => r.id === itemId),
    competitors: results.filter((r) => r.id !== itemId),
    metrics: {
      total_sellers: results.length,
      min_price: prices.length > 0 ? Math.min(...prices) : 0,
      max_price: prices.length > 0 ? Math.max(...prices) : 0,
      avg_price: prices.length > 0 
        ? parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2))
        : 0,
      my_position: results.findIndex((r) => r.id === itemId) + 1,
    },
  };
}

/**
 * Search for items by catalog product
 */
async function searchByCatalogProduct(catalogProductId, params = {}) {
  return sdkManager.searchByQuery(null, catalogProductId, {
    catalog_product_id: catalogProductId,
    limit: 50,
    ...params,
  });
}

// ============================================
// PUBLIC CATALOG ENDPOINTS
// ============================================

/**
 * GET /api/catalog
 * List catalog items
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { q, category, limit = 100, offset = 0 } = req.query;

    const params = {
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    if (q) params.q = q;
    if (category) params.category = category;

    const searchUrl =
      q || category
        ? `/sites/${SITE_ID}/search`
        : `/sites/${SITE_ID}/search?category=MLB1648`;

    const response = await sdkManager.execute(null, async (sdk) => {
      return sdk.axiosInstance.get(searchUrl, { params, timeout: 15000 });
    });

    return sendSuccess(res, {
      data: response.data.results || [],
      pagination: {
        total: response.data.paging?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
      filters: response.data.available_filters || [],
    });
  } catch (error) {
    return handleError(
      res,
      500,
      "Failed to fetch catalog",
      error,
      "CATALOG_LIST_ERROR",
      { userId: req.user?.userId }
    );
  }
});

/**
 * GET /api/catalog/search
 * Search catalog products
 */
router.get("/search", authenticateToken, async (req, res) => {
  try {
    const { q, category } = req.query;
    if (!q && !category) {
      return sendSuccess(res, null, "Query (q) or category is required", 400);
    }

    const { limit = 100, offset = 0 } = req.query;
    const params = {
      limit: parseInt(limit),
      offset: parseInt(offset),
    };
    if (q) params.q = q;
    if (category) params.category = category;

    const results = await sdkManager.searchByQuery(null, q || category, params);

    return sendSuccess(res, {
      results: results.results || [],
      paging: results.paging || { total: 0 },
      filters: results.available_filters || [],
      sort: results.available_sorts || [],
    });
  } catch (error) {
    return handleError(
      res,
      500,
      "Failed to search catalog",
      error,
      "CATALOG_SEARCH_ERROR",
      { userId: req.user.userId }
    );
  }
});

/**
 * GET /api/catalog/categories
 * List all categories
 */
router.get("/categories", authenticateToken, async (req, res) => {
  try {
    const categories = await sdkManager.getAllSiteCategories(null, SITE_ID);

    return sendSuccess(res, categories || []);
  } catch (error) {
    return handleError(
      res,
      500,
      "Failed to fetch categories",
      error,
      "GET_CATEGORIES_ERROR",
      { userId: req.user.userId }
    );
  }
});

/**
 * GET /api/catalog/categories/:categoryId
 * Get category details
 */
router.get("/categories/:categoryId", authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await sdkManager.getCategory(null, categoryId);

    return sendSuccess(res, category);
  } catch (error) {
    return handleError(
      res,
      500,
      "Failed to fetch category",
      error,
      "GET_CATEGORY_ERROR",
      { categoryId: req.params.categoryId, userId: req.user.userId }
    );
  }
});

/**
 * GET /api/catalog/categories/:categoryId/attributes
 * Get category attributes
 */
router.get(
  "/categories/:categoryId/attributes",
  authenticateToken,
  async (req, res) => {
    try {
      const { categoryId } = req.params;

      const attributes = await sdkManager.getCategoryAttributes(null, categoryId);

      const required = attributes.filter((attr) => attr.tags?.required);
      const optional = attributes.filter((attr) => !attr.tags?.required);

      return sendSuccess(res, {
        categoryId,
        attributes,
        required,
        optional,
        total: attributes.length,
      });
    } catch (error) {
      return handleError(
        res,
        500,
        "Failed to fetch category attributes",
        error,
        "GET_CATEGORY_ATTRIBUTES_ERROR",
        { categoryId: req.params.categoryId, userId: req.user.userId }
      );
    }
  },
);

/**
 * GET /api/catalog/products/:productId
 * Get catalog product details
 */
router.get("/products/:productId", authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await sdkManager.execute(null, async (sdk) => {
      return sdk.getCatalogProduct(productId);
    });

    return sendSuccess(res, product);
  } catch (error) {
    return handleError(
      res,
      error.response?.status || 500,
      "Failed to fetch catalog product",
      error,
      "GET_CATALOG_PRODUCT_ERROR",
      { productId: req.params.productId, userId: req.user.userId }
    );
  }
});

/**
 * GET /api/catalog/trends/:categoryId
 * Get category trends
 */
router.get("/trends/:categoryId", authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.params;

    const trends = await sdkManager.getCategoryTrends(null, SITE_ID, categoryId);

    return sendSuccess(res, {
      categoryId,
      trends: trends || [],
    });
  } catch (error) {
    return handleError(
      res,
      500,
      "Failed to fetch trends",
      error,
      "GET_TRENDS_ERROR",
      { categoryId: req.params.categoryId, userId: req.user.userId }
    );
  }
});

/**
 * GET /api/catalog/predict
 * Predict category from title
 */
router.get("/predict", authenticateToken, async (req, res) => {
  try {
    const { title } = req.query;

    if (!title) {
      return sendSuccess(res, null, "Title is required", 400);
    }

    const prediction = await sdkManager.execute(null, async (sdk) => {
      return sdk.predictCategory(title);
    });

    return sendSuccess(res, prediction || []);
  } catch (error) {
    return handleError(
      res,
      500,
      "Failed to predict category",
      error,
      "PREDICT_CATEGORY_ERROR",
      { userId: req.user.userId }
    );
  }
});

/**
 * GET /api/catalog/listing-types
 * Get available listing types
 */
router.get("/listing-types", authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.query;

    let url = `/sites/${SITE_ID}/listing_types`;
    if (categoryId) {
      url = `/categories/${categoryId}/listing_types`;
    }

    const response = await sdkManager.execute(null, async (sdk) => {
      return sdk.axiosInstance.get(url);
    });

    return sendSuccess(res, response.data || []);
  } catch (error) {
    const fallbackListingTypes = [
      { id: "gold_special", name: "Clássico", site_id: "MLB" },
      { id: "gold_pro", name: "Premium", site_id: "MLB" },
      { id: "gold", name: "Ouro", site_id: "MLB" },
      { id: "silver", name: "Prata", site_id: "MLB" },
      { id: "bronze", name: "Bronze", site_id: "MLB" },
      { id: "free", name: "Grátis", site_id: "MLB" },
    ];

    logger.warn({
      action: "GET_LISTING_TYPES_FALLBACK",
      userId: req.user.userId,
      error: error.message,
    });

    return sendSuccess(res, fallbackListingTypes, null, 200);
  }
});

// ============================================
// CATALOG ELIGIBILITY & PUBLICATION
// ============================================

/**
 * GET /api/catalog/:accountId/items/:itemId/eligibility
 * Check if item is eligible for catalog
 */
router.get(
  "/:accountId/items/:itemId/eligibility",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;

      const item = await sdkManager.getItem(accountId, itemId);
      if (!item) {
        return handleError(
          res,
          404,
          "Item not found",
          new Error("Item not found"),
          "CHECK_ELIGIBILITY_ERROR",
          { accountId, itemId, userId: req.user.userId }
        );
      }

      const eligibility = await sdkManager.execute(accountId, async (sdk) => {
        return sdk.checkCatalogEligibility(itemId);
      });

      const suggestions = await sdkManager.execute(accountId, async (sdk) => {
        return sdk.getCatalogSuggestions(itemId);
      });

      logger.info({
        action: "CHECK_CATALOG_ELIGIBILITY",
        accountId,
        itemId,
        userId: req.user.userId,
      });

      return sendSuccess(res, {
        item_id: itemId,
        title: item.title,
        current_catalog_product_id: item.catalog_product_id,
        eligibility,
        suggestions,
        is_in_catalog: !!item.catalog_product_id,
      });
    } catch (error) {
      return handleError(
        res,
        error.response?.status || 500,
        "Failed to check catalog eligibility",
        error,
        "CHECK_ELIGIBILITY_ERROR",
        { accountId: req.params.accountId, itemId: req.params.itemId, userId: req.user.userId }
      );
    }
  },
);

/**
 * GET /api/catalog/:accountId/products/search
 * Search catalog products for account
 */
router.get(
  "/:accountId/products/search",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { q, category, limit = 50, offset = 0 } = req.query;

      if (!q && !category) {
        return sendSuccess(res, null, "Query (q) or category is required", 400);
      }

      const params = {
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
      if (q) params.q = q;
      if (category) params.category = category;

      const results = await sdkManager.searchByQuery(accountId, q || category, params);

      logger.info({
        action: "SEARCH_CATALOG_PRODUCTS",
        accountId,
        query: q,
        userId: req.user.userId,
      });

      return sendSuccess(res, {
        products: results.results || [],
        pagination: {
          total: results.paging?.total || 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      });
    } catch (error) {
      return handleError(
        res,
        500,
        "Failed to search catalog products",
        error,
        "SEARCH_CATALOG_PRODUCTS_ERROR",
        { accountId: req.params.accountId, userId: req.user.userId }
      );
    }
  },
);

/**
 * POST /api/catalog/:accountId/items/:itemId/catalog
 * Publish item to catalog
 */
router.post(
  "/:accountId/items/:itemId/catalog",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const { catalog_product_id } = req.body;

      const validation = validateRequired(req, ["catalog_product_id"], 'body');
      if (validation) {
        return sendSuccess(res, null, validation.message, validation.statusCode);
      }

      const item = await sdkManager.updateItem(accountId, itemId, { catalog_product_id });

      logger.info({
        action: "PUBLISH_TO_CATALOG",
        accountId,
        itemId,
        catalogProductId: catalog_product_id,
        userId: req.user.userId,
      });

      return sendSuccess(res, {
        item_id: itemId,
        catalog_product_id,
        item,
      }, "Item published to catalog successfully");
    } catch (error) {
      return handleError(
        res,
        error.response?.status || 500,
        "Failed to publish to catalog",
        error,
        "PUBLISH_TO_CATALOG_ERROR",
        { accountId: req.params.accountId, itemId: req.params.itemId, userId: req.user.userId }
      );
    }
  },
);

/**
 * DELETE /api/catalog/:accountId/publish/:itemId
 * Remove item from catalog
 */
router.delete(
  "/:accountId/publish/:itemId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;

      const item = await sdkManager.updateItem(accountId, itemId, { catalog_product_id: null });

      logger.info({
        action: "REMOVE_FROM_CATALOG",
        accountId,
        itemId,
        userId: req.user.userId,
      });

      return sendSuccess(res, {
        item_id: itemId,
        item,
      }, "Item removed from catalog successfully");
    } catch (error) {
      return handleError(
        res,
        error.response?.status || 500,
        "Failed to remove from catalog",
        error,
        "REMOVE_FROM_CATALOG_ERROR",
        { accountId: req.params.accountId, itemId: req.params.itemId, userId: req.user.userId }
      );
    }
  },
);

/**
 * GET /api/catalog/:accountId/competition/:itemId
 * Get catalog competition info
 */
router.get(
  "/:accountId/competition/:itemId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;

      const item = await sdkManager.getItem(accountId, itemId);
      if (!item) {
        return sendSuccess(res, {
          item_id: itemId,
          in_catalog: false,
          message: "Item not found",
        });
      }

      const catalogProductId = item.catalog_product_id;
      if (!catalogProductId) {
        return sendSuccess(res, {
          item_id: itemId,
          in_catalog: false,
          message: "Item is not in catalog",
        });
      }

      const [catalogRes, searchRes] = await Promise.all([
        sdkManager.execute(accountId, async (sdk) => {
          return sdk.getCatalogProduct(catalogProductId);
        }),
        searchByCatalogProduct(catalogProductId),
      ]);

      const results = searchRes || [];
      const competition = processCompetition(results, itemId);

      logger.info({
        action: "GET_CATALOG_COMPETITION",
        accountId,
        itemId,
        catalogProductId,
        userId: req.user.userId,
      });

      return sendSuccess(res, {
        item_id: itemId,
        catalog_product_id: catalogProductId,
        catalog_product: catalogRes,
        my_item: competition.myItem,
        competitors: competition.competitors.map((c) => ({
          id: c.id,
          title: c.title,
          price: c.price,
          seller: c.seller,
          shipping: c.shipping,
          condition: c.condition,
        })),
        metrics: competition.metrics,
      });
    } catch (error) {
      return handleError(
        res,
        error.response?.status || 500,
        "Failed to get competition info",
        error,
        "GET_COMPETITION_ERROR",
        { accountId: req.params.accountId, itemId: req.params.itemId, userId: req.user.userId }
      );
    }
  },
);

/**
 * GET /api/catalog/:accountId/buybox/:itemId
 * Get buy box status for catalog item
 */
router.get(
  "/:accountId/buybox/:itemId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;

      const item = await sdkManager.getItem(accountId, itemId);
      if (!item) {
        return sendSuccess(res, {
          item_id: itemId,
          in_catalog: false,
          has_buybox: false,
          message: "Item not found",
        });
      }

      if (!item.catalog_product_id) {
        return sendSuccess(res, {
          item_id: itemId,
          in_catalog: false,
          has_buybox: false,
          message: "Item is not in catalog",
        });
      }

      const buyBoxRes = await sdkManager.execute(accountId, async (sdk) => {
        return sdk.getBuyBoxWinner(itemId);
      });
      const isWinner = buyBoxRes?.winner_item_id === itemId;

      logger.info({
        action: "GET_BUYBOX_STATUS",
        accountId,
        itemId,
        isWinner,
        userId: req.user.userId,
      });

      return sendSuccess(res, {
        item_id: itemId,
        catalog_product_id: item.catalog_product_id,
        in_catalog: true,
        is_buybox_winner: isWinner,
        buybox_info: buyBoxRes,
        my_price: item.price,
        my_shipping: item.shipping,
      });
    } catch (error) {
      return handleError(
        res,
        error.response?.status || 500,
        "Failed to get buy box status",
        error,
        "GET_BUYBOX_ERROR",
        { accountId: req.params.accountId, itemId: req.params.itemId, userId: req.user.userId }
      );
    }
  },
);

/**
 * GET /api/catalog/:accountId/items
 * Get all catalog items for account
 */
router.get(
  "/:accountId/items",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { all, limit = 50, offset = 0 } = req.query;

      let itemIds = [];
      let searchRes;

      if (all === "true") {
        let currentOffset = 0;
        const batchSize = 50;

        logger.info({
          action: "FETCH_ALL_CATALOG_ITEMS_START",
          accountId,
        });

        while (true) {
          searchRes = await sdkManager.getAllUserItems(accountId, req.mlAccount.mlUserId, {
            limit: batchSize,
            offset: currentOffset,
          });

          const batch = searchRes.results || [];
          if (batch.length === 0) break;

          itemIds.push(...batch);
          currentOffset += batchSize;

          const total = searchRes.paging?.total || 0;
          if (currentOffset >= total) break;
        }
      } else {
        searchRes = await sdkManager.getAllUserItems(accountId, req.mlAccount.mlUserId, {
          limit: parseInt(limit),
          offset: parseInt(offset),
        });

        itemIds = searchRes.results || [];
      }

      const items = [];
      const batchSize = 100;

      for (const itemId of itemIds.slice(0, batchSize)) {
        try {
          const item = await sdkManager.getItem(accountId, itemId);
          if (!item) continue;

          let catalogStatus = "not_eligible";

          if (item.catalog_product_id) {
            catalogStatus = "catalog_listed";
          } else {
            try {
              const eligibilityRes = await sdkManager.execute(accountId, async (sdk) => {
                return sdk.checkCatalogEligibility(itemId);
              });
              if (eligibilityRes?.eligible) {
                catalogStatus = "eligible";
              }
            } catch (eligErr) {
            }
          }

          items.push({
            id: itemId,
            title: item.title,
            price: item.price,
            thumbnail: item.thumbnail,
            permalink: item.permalink,
            catalogProductId: item.catalog_product_id,
            catalogListed: !!item.catalog_product_id,
            catalogStatus,
            status: item.status,
            availableQuantity: item.available_quantity,
          });
        } catch (err) {
          logger.error({
            action: "GET_ITEM_ERROR",
            itemId,
            error: err.message,
          });
        }
      }

      logger.info({
        action: "LIST_CATALOG_ITEMS",
        accountId,
        userId: req.user.userId,
        itemsCount: items.length,
      });

      return sendSuccess(res, {
        items,
        total: searchRes?.paging?.total || items.length,
        paging: searchRes?.paging,
      });
    } catch (error) {
      return handleError(
        res,
        error.response?.status || 500,
        "Failed to list catalog items",
        error,
        "LIST_CATALOG_ITEMS_ERROR",
        { accountId: req.params.accountId, userId: req.user.userId }
      );
    }
  },
);

/**
 * GET /api/catalog/:accountId/stats
 * Get catalog statistics for account
 */
router.get(
  "/:accountId/stats",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;

      const searchRes = await sdkManager.getAllUserItems(accountId, req.mlAccount.mlUserId, {
        limit: 50,
      });

      const itemIds = searchRes.results || [];
      let catalogCount = 0;
      let buyboxWins = 0;
      const totalItems = itemIds.length;

      for (const itemId of itemIds.slice(0, 20)) {
        try {
          const item = await sdkManager.getItem(accountId, itemId);
          if (!item) continue;

          if (item.catalog_product_id) {
            catalogCount++;

            try {
              const buyboxRes = await sdkManager.execute(accountId, async (sdk) => {
                return sdk.getBuyBoxWinner(itemId);
              });
              if (buyboxRes?.winner_item_id === itemId) {
                buyboxWins++;
              }
            } catch (e) {
            }
          }
        } catch (err) {
        }
      }

      logger.info({
        action: "GET_CATALOG_STATS",
        accountId,
        userId: req.user.userId,
      });

      return sendSuccess(res, {
        stats: {
          total: totalItems,
          catalogListed: catalogCount,
          eligible: Math.max(0, totalItems - catalogCount),
          buyBoxWinner: buyboxWins,
          catalogPercentage:
            totalItems > 0 ? Math.round((catalogCount / totalItems) * 100) : 0,
        },
      });
    } catch (error) {
      logger.warn({
        action: "GET_CATALOG_STATS_ERROR",
        accountId: req.params.accountId,
        userId: req.user.userId,
        error: error.response?.data || error.message,
      });

      return sendSuccess(res, {
        stats: {
          total: 0,
          catalogListed: 0,
          eligible: 0,
          buyBoxWinner: 0,
          catalogPercentage: 0,
        },
        fallback: true,
      });
    }
  },
);

module.exports = router;
