/**
 * Catalog Routes
 * Manage Mercado Livre official catalog
 *
 * GET    /api/catalog/search                   - Search catalog products
 * GET    /api/catalog/categories               - List categories
 * GET    /api/catalog/categories/:categoryId   - Get category details
 * GET    /api/catalog/categories/:categoryId/attributes - Get category attributes
 * GET    /api/catalog/products/:productId      - Get catalog product details
 * GET    /api/catalog/trends/:categoryId       - Get category trends
 */

const express = require("express");
const axios = require("axios");
const logger = require("../logger");
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require("../middleware/auth");
const { validateMLToken } = require("../middleware/ml-token-validation");
const MLAccount = require("../db/models/MLAccount");

const router = express.Router();

const ML_API_BASE = "https://api.mercadolibre.com";
const SITE_ID = "MLB"; // Brazil

/**
 * GET /api/catalog
 * List catalog items (products from official catalog)
 * Query params: q, category, limit, offset
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { q, category, limit = 100, offset = 0 } = req.query;

    const params = {
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    // If search query provided, search catalog
    if (q) params.q = q;
    if (category) params.category = category;

    // Default to popular products if no query
    const searchUrl =
      q || category
        ? `${ML_API_BASE}/sites/${SITE_ID}/search`
        : `${ML_API_BASE}/sites/${SITE_ID}/search?category=MLB1648`;

    const response = await axios.get(searchUrl, { params, timeout: 15000 });

    res.json({
      success: true,
      data: response.data.results || [],
      pagination: {
        total: response.data.paging?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
      filters: response.data.available_filters || [],
    });
  } catch (error) {
    logger.error({
      action: "CATALOG_LIST_ERROR",
      userId: req.user?.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch catalog",
      error: error.message,
    });
  }
});

/**
 * GET /api/catalog/search
 * Search catalog products
 */
router.get("/search", authenticateToken, async (req, res) => {
  try {
    const { q, category, limit = 100, offset = 0 } = req.query;

    if (!q && !category) {
      return res.status(400).json({
        success: false,
        message: "Query (q) or category is required",
      });
    }

    const params = {
      limit: parseInt(limit),
      offset: parseInt(offset),
    };
    if (q) params.q = q;
    if (category) params.category = category;

    const response = await axios.get(`${ML_API_BASE}/sites/${SITE_ID}/search`, {
      params,
    });

    res.json({
      success: true,
      data: {
        results: response.data.results || [],
        paging: response.data.paging || { total: 0 },
        filters: response.data.available_filters || [],
        sort: response.data.available_sorts || [],
      },
    });
  } catch (error) {
    logger.error({
      action: "CATALOG_SEARCH_ERROR",
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to search catalog",
      error: error.message,
    });
  }
});

/**
 * GET /api/catalog/categories
 * List all categories
 */
router.get("/categories", authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(
      `${ML_API_BASE}/sites/${SITE_ID}/categories`,
    );

    res.json({
      success: true,
      data: response.data || [],
    });
  } catch (error) {
    logger.error({
      action: "GET_CATEGORIES_ERROR",
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
});

/**
 * GET /api/catalog/categories/:categoryId
 * Get category details
 */
router.get("/categories/:categoryId", authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.params;

    const response = await axios.get(`${ML_API_BASE}/categories/${categoryId}`);

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: "GET_CATEGORY_ERROR",
      categoryId: req.params.categoryId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    });
  }
});

/**
 * GET /api/catalog/categories/:categoryId/attributes
 * Get category attributes (required for creating items)
 */
router.get(
  "/categories/:categoryId/attributes",
  authenticateToken,
  async (req, res) => {
    try {
      const { categoryId } = req.params;

      const response = await axios.get(
        `${ML_API_BASE}/categories/${categoryId}/attributes`,
      );

      // Separate required and optional attributes
      const attributes = response.data || [];
      const required = attributes.filter((attr) => attr.tags?.required);
      const optional = attributes.filter((attr) => !attr.tags?.required);

      res.json({
        success: true,
        data: {
          categoryId,
          attributes,
          required,
          optional,
          total: attributes.length,
        },
      });
    } catch (error) {
      logger.error({
        action: "GET_CATEGORY_ATTRIBUTES_ERROR",
        categoryId: req.params.categoryId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: "Failed to fetch category attributes",
        error: error.message,
      });
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

    const response = await axios.get(`${ML_API_BASE}/products/${productId}`);

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: "GET_CATALOG_PRODUCT_ERROR",
      productId: req.params.productId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to fetch catalog product",
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/catalog/trends/:categoryId
 * Get category trends
 */
router.get("/trends/:categoryId", authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.params;

    const response = await axios
      .get(`${ML_API_BASE}/trends/${SITE_ID}/${categoryId}`)
      .catch((err) => {
        // Trends might not be available for all categories
        return { data: [] };
      });

    res.json({
      success: true,
      data: {
        categoryId,
        trends: response.data || [],
      },
    });
  } catch (error) {
    logger.error({
      action: "GET_TRENDS_ERROR",
      categoryId: req.params.categoryId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch trends",
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const response = await axios.get(
      `${ML_API_BASE}/sites/${SITE_ID}/domain_discovery/search`,
      {
        params: { q: title },
      },
    );

    res.json({
      success: true,
      data: response.data || [],
    });
  } catch (error) {
    logger.error({
      action: "PREDICT_CATEGORY_ERROR",
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to predict category",
      error: error.message,
    });
  }
});

/**
 * GET /api/catalog/listing-types
 * Get available listing types
 */
router.get("/listing-types", authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.query;

    let url = `${ML_API_BASE}/sites/${SITE_ID}/listing_types`;
    if (categoryId) {
      url = `${ML_API_BASE}/categories/${categoryId}/listing_types`;
    }

    const response = await axios.get(url);

    res.json({
      success: true,
      data: response.data || [],
    });
  } catch (error) {
    logger.error({
      action: "GET_LISTING_TYPES_ERROR",
      userId: req.user.userId,
      error: error.message,
    });

    // Return fallback listing types for MLB (Brazil)
    const fallbackListingTypes = [
      { id: "gold_special", name: "Clássico", site_id: "MLB" },
      { id: "gold_pro", name: "Premium", site_id: "MLB" },
      { id: "gold", name: "Ouro", site_id: "MLB" },
      { id: "silver", name: "Prata", site_id: "MLB" },
      { id: "bronze", name: "Bronze", site_id: "MLB" },
      { id: "free", name: "Grátis", site_id: "MLB" },
    ];

    res.json({
      success: true,
      data: fallbackListingTypes,
      fallback: true,
    });
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
      const account = req.mlAccount;

      const headers = {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      };

      // Get item to check eligibility
      const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, {
        headers,
      });
      const item = itemRes.data;

      // Check catalog eligibility
      const eligibilityRes = await axios
        .get(`${ML_API_BASE}/items/${itemId}/catalog_eligibility`, { headers })
        .catch(() => ({ data: null }));

      // Get catalog product suggestions
      const suggestionsRes = await axios
        .get(`${ML_API_BASE}/items/${itemId}/catalog_product_id/suggestions`, {
          headers,
        })
        .catch(() => ({ data: null }));

      logger.info({
        action: "CHECK_CATALOG_ELIGIBILITY",
        accountId,
        itemId,
        userId: req.user.userId,
      });

      res.json({
        success: true,
        data: {
          item_id: itemId,
          title: item.title,
          current_catalog_product_id: item.catalog_product_id,
          eligibility: eligibilityRes.data,
          suggestions: suggestionsRes.data,
          is_in_catalog: !!item.catalog_product_id,
        },
      });
    } catch (error) {
      logger.error({
        action: "CHECK_ELIGIBILITY_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        userId: req.user.userId,
        error: error.response?.data || error.message,
      });

      res.status(error.response?.status || 500).json({
        success: false,
        message: "Failed to check catalog eligibility",
        error: error.response?.data?.message || error.message,
      });
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
        return res.status(400).json({
          success: false,
          message: "Query (q) or category is required",
        });
      }

      const params = {
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
      if (q) params.q = q;
      if (category) params.category = category;

      const response = await axios.get(
        `${ML_API_BASE}/sites/${SITE_ID}/search`,
        { params },
      );

      logger.info({
        action: "SEARCH_CATALOG_PRODUCTS",
        accountId,
        query: q,
        userId: req.user.userId,
      });

      res.json({
        success: true,
        products: response.data.results || [],
        pagination: {
          total: response.data.paging?.total || 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      });
    } catch (error) {
      logger.error({
        action: "SEARCH_CATALOG_PRODUCTS_ERROR",
        accountId: req.params.accountId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: "Failed to search catalog products",
        error: error.message,
      });
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
      const account = req.mlAccount;

      if (!catalog_product_id) {
        return res.status(400).json({
          success: false,
          message: "catalog_product_id is required",
        });
      }

      const headers = {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      };

      // Update item with catalog product ID
      const response = await axios.put(
        `${ML_API_BASE}/items/${itemId}`,
        { catalog_product_id },
        { headers },
      );

      logger.info({
        action: "PUBLISH_TO_CATALOG",
        accountId,
        itemId,
        catalogProductId: catalog_product_id,
        userId: req.user.userId,
      });

      res.json({
        success: true,
        message: "Item published to catalog successfully",
        data: {
          item_id: itemId,
          catalog_product_id,
          item: response.data,
        },
      });
    } catch (error) {
      logger.error({
        action: "PUBLISH_TO_CATALOG_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        userId: req.user.userId,
        error: error.response?.data || error.message,
      });

      res.status(error.response?.status || 500).json({
        success: false,
        message: "Failed to publish to catalog",
        error: error.response?.data?.message || error.message,
      });
    }
  },
);

/**
 * POST /api/catalog/:accountId/publish/:itemId
 * Publish item to catalog (legacy endpoint)
 */
router.post(
  "/:accountId/publish/:itemId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const { catalog_product_id } = req.body;
      const account = req.mlAccount;

      if (!catalog_product_id) {
        return res.status(400).json({
          success: false,
          message: "catalog_product_id is required",
        });
      }

      const headers = {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      };

      // Update item with catalog product ID
      const response = await axios.put(
        `${ML_API_BASE}/items/${itemId}`,
        { catalog_product_id },
        { headers },
      );

      logger.info({
        action: "PUBLISH_TO_CATALOG",
        accountId,
        itemId,
        catalogProductId: catalog_product_id,
        userId: req.user.userId,
      });

      res.json({
        success: true,
        message: "Item published to catalog successfully",
        data: {
          item_id: itemId,
          catalog_product_id,
          item: response.data,
        },
      });
    } catch (error) {
      logger.error({
        action: "PUBLISH_TO_CATALOG_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        userId: req.user.userId,
        error: error.response?.data || error.message,
      });

      res.status(error.response?.status || 500).json({
        success: false,
        message: "Failed to publish to catalog",
        error: error.response?.data?.message || error.message,
      });
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
      const account = req.mlAccount;

      const headers = {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      };

      // Remove catalog product ID
      const response = await axios.put(
        `${ML_API_BASE}/items/${itemId}`,
        { catalog_product_id: null },
        { headers },
      );

      logger.info({
        action: "REMOVE_FROM_CATALOG",
        accountId,
        itemId,
        userId: req.user.userId,
      });

      res.json({
        success: true,
        message: "Item removed from catalog successfully",
        data: {
          item_id: itemId,
          item: response.data,
        },
      });
    } catch (error) {
      logger.error({
        action: "REMOVE_FROM_CATALOG_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        userId: req.user.userId,
        error: error.response?.data || error.message,
      });

      res.status(error.response?.status || 500).json({
        success: false,
        message: "Failed to remove from catalog",
        error: error.response?.data?.message || error.message,
      });
    }
  },
);

/**
 * GET /api/catalog/:accountId/competition/:itemId
 * Get catalog competition info (other sellers)
 */
router.get(
  "/:accountId/competition/:itemId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const account = req.mlAccount;

      const headers = {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      };

      // Get item to find catalog product
      const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, {
        headers,
      });
      const catalogProductId = itemRes.data.catalog_product_id;

      if (!catalogProductId) {
        return res.json({
          success: true,
          data: {
            item_id: itemId,
            in_catalog: false,
            message: "Item is not in catalog",
          },
        });
      }

      // Get catalog product with all sellers
      const catalogRes = await axios.get(
        `${ML_API_BASE}/products/${catalogProductId}`,
        { headers },
      );

      // Search for same product to find competitors
      const searchRes = await axios.get(
        `${ML_API_BASE}/sites/${SITE_ID}/search`,
        {
          params: {
            catalog_product_id: catalogProductId,
            limit: 50,
          },
        },
      );

      const results = searchRes.data.results || [];
      const myItem = results.find((r) => r.id === itemId);
      const competitors = results.filter((r) => r.id !== itemId);

      // Calculate competition metrics
      const prices = results.map((r) => r.price).filter((p) => p > 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      logger.info({
        action: "GET_CATALOG_COMPETITION",
        accountId,
        itemId,
        catalogProductId,
        userId: req.user.userId,
      });

      res.json({
        success: true,
        data: {
          item_id: itemId,
          catalog_product_id: catalogProductId,
          catalog_product: catalogRes.data,
          my_item: myItem,
          competitors: competitors.map((c) => ({
            id: c.id,
            title: c.title,
            price: c.price,
            seller: c.seller,
            shipping: c.shipping,
            condition: c.condition,
          })),
          metrics: {
            total_sellers: results.length,
            min_price: minPrice,
            max_price: maxPrice,
            avg_price: parseFloat(avgPrice.toFixed(2)),
            my_position: myItem
              ? results.findIndex((r) => r.id === itemId) + 1
              : null,
          },
        },
      });
    } catch (error) {
      logger.error({
        action: "GET_COMPETITION_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        userId: req.user.userId,
        error: error.response?.data || error.message,
      });

      res.status(error.response?.status || 500).json({
        success: false,
        message: "Failed to get competition info",
        error: error.response?.data?.message || error.message,
      });
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
      const account = req.mlAccount;

      const headers = {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      };

      // Get item
      const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, {
        headers,
      });
      const item = itemRes.data;

      if (!item.catalog_product_id) {
        return res.json({
          success: true,
          data: {
            item_id: itemId,
            in_catalog: false,
            has_buybox: false,
            message: "Item is not in catalog",
          },
        });
      }

      // Check if item is winning the buy box
      const buyBoxRes = await axios
        .get(`${ML_API_BASE}/items/${itemId}/buy_box_winner`, { headers })
        .catch(() => ({ data: null }));

      const isWinner = buyBoxRes.data?.winner_item_id === itemId;

      logger.info({
        action: "GET_BUYBOX_STATUS",
        accountId,
        itemId,
        isWinner,
        userId: req.user.userId,
      });

      res.json({
        success: true,
        data: {
          item_id: itemId,
          catalog_product_id: item.catalog_product_id,
          in_catalog: true,
          is_buybox_winner: isWinner,
          buybox_info: buyBoxRes.data,
          my_price: item.price,
          my_shipping: item.shipping,
        },
      });
    } catch (error) {
      logger.error({
        action: "GET_BUYBOX_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        userId: req.user.userId,
        error: error.response?.data || error.message,
      });

      res.status(error.response?.status || 500).json({
        success: false,
        message: "Failed to get buy box status",
        error: error.response?.data?.message || error.message,
      });
    }
  },
);

/**
 * GET /api/catalog/:accountId/items
 * Get all catalog items for account
 * Query params:
 *   - all: If true, fetch ALL items with auto-pagination (default false)
 *   - limit: Items per page (default 50)
 *   - offset: Pagination offset (default 0)
 */
router.get(
  "/:accountId/items",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { all, limit = 50, offset = 0 } = req.query;
      const account = req.mlAccount;

      const headers = {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      };

      let itemIds = [];
      let searchRes; // Declare outside if/else block for use in response

      // UNLIMITED MODE: Fetch ALL items
      if (all === "true") {
        let currentOffset = 0;
        const batchSize = 50;

        logger.info({
          action: "FETCH_ALL_CATALOG_ITEMS_START",
          accountId,
        });

        while (true) {
          searchRes = await axios.get(
            `${ML_API_BASE}/users/${account.mlUserId}/items/search`,
            {
              headers,
              params: {
                limit: batchSize,
                offset: currentOffset,
              },
            },
          );

          const batch = searchRes.data.results || [];
          if (batch.length === 0) break;

          itemIds.push(...batch);
          currentOffset += batchSize;

          const total = searchRes.data.paging?.total || 0;
          if (currentOffset >= total) break;
        }
      } else {
        // NORMAL MODE: Single request
        searchRes = await axios.get(
          `${ML_API_BASE}/users/${account.mlUserId}/items/search`,
          {
            headers,
            params: {
              limit: parseInt(limit),
              offset: parseInt(offset),
            },
          },
        );

        itemIds = searchRes.data.results || [];
      }

      // Get item details with catalog info
      const items = [];
      const batchSize = 100; // Process up to 100 items

      for (const itemId of itemIds.slice(0, batchSize)) {
        try {
          const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, {
            headers,
          });
          const item = itemRes.data;

          // Check eligibility if not in catalog
          let catalogStatus = "not_eligible";
          let buyBoxWinner = false;
          let competitorsCount = 0;
          let competitorPrice = null;

          if (item.catalog_product_id) {
            catalogStatus = "catalog_listed";

            // Check buy box status for catalog items
            try {
              const buyboxRes = await axios.get(
                `${ML_API_BASE}/items/${itemId}/buy_box_winner`,
                { headers },
              );
              buyBoxWinner = buyboxRes.data?.winner_item_id === itemId;

              // Get competitors for catalog items
              const searchRes = await axios.get(
                `${ML_API_BASE}/sites/${SITE_ID}/search`,
                {
                  params: {
                    catalog_product_id: item.catalog_product_id,
                    limit: 50,
                  },
                },
              );

              const results = searchRes.data.results || [];
              competitorsCount = Math.max(0, results.length - 1); // Exclude self

              const competitorPrices = results
                .filter((r) => r.id !== itemId && r.price > 0)
                .map((r) => r.price);

              if (competitorPrices.length > 0) {
                competitorPrice = Math.min(...competitorPrices);
              }
            } catch (buyboxErr) {
              // Buybox data not available, continue
            }
          } else {
            // Check if eligible for catalog
            try {
              const eligibilityRes = await axios.get(
                `${ML_API_BASE}/items/${itemId}/catalog_eligibility`,
                { headers },
              );
              if (eligibilityRes.data?.eligible) {
                catalogStatus = "eligible";
              }
            } catch (eligErr) {
              // Eligibility check failed, mark as not eligible
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
            buyBoxWinner,
            inCompetition: !!item.catalog_product_id,
            competitorsCount,
            competitorPrice,
            status: item.status,
            availableQuantity: item.available_quantity,
          });
        } catch (err) {
          // Skip items with errors
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

      res.json({
        success: true,
        items,
        total: searchRes.data.paging?.total || items.length,
        paging: searchRes.data.paging,
      });
    } catch (error) {
      logger.error({
        action: "LIST_CATALOG_ITEMS_ERROR",
        accountId: req.params.accountId,
        userId: req.user.userId,
        error: error.response?.data || error.message,
      });

      res.status(error.response?.status || 500).json({
        success: false,
        message: "Failed to list catalog items",
        error: error.response?.data?.message || error.message,
      });
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
      const account = req.mlAccount;

      const headers = {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      };

      // Get user's items to calculate stats
      const searchRes = await axios.get(
        `${ML_API_BASE}/users/${account.mlUserId}/items/search`,
        {
          headers,
          params: { limit: 50 },
        },
      );

      const itemIds = searchRes.data.results || [];
      let catalogCount = 0;
      let buyboxWins = 0;
      let totalItems = itemIds.length;

      // Check first 20 items for catalog status
      for (const itemId of itemIds.slice(0, 20)) {
        try {
          const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, {
            headers,
          });
          if (itemRes.data.catalog_product_id) {
            catalogCount++;
            // Check buybox status
            try {
              const buyboxRes = await axios.get(
                `${ML_API_BASE}/items/${itemId}/buy_box_winner`,
                { headers },
              );
              if (buyboxRes.data?.winner_item_id === itemId) {
                buyboxWins++;
              }
            } catch (e) {
              // Buybox info not available
            }
          }
        } catch (err) {
          // Skip items with errors
        }
      }

      logger.info({
        action: "GET_CATALOG_STATS",
        accountId,
        userId: req.user.userId,
      });

      res.json({
        success: true,
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
      logger.error({
        action: "GET_CATALOG_STATS_ERROR",
        accountId: req.params.accountId,
        userId: req.user.userId,
        error: error.response?.data || error.message,
      });

      // Return fallback stats
      res.json({
        success: true,
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
