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

// ============================================
// UNIFIED HELPER FUNCTIONS (CORE)
// ============================================

/**
 * Send success response with consistent format
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default 200)
 */
function sendSuccess(res, data, message = null, statusCode = 200) {
  const response = { success: true };
  if (message) response.message = message;
  
  // Handle different data structures
  if (data !== null && data !== undefined) {
    if (typeof data === 'object' && !Array.isArray(data) && 
        (data.results || data.products || data.items || data.stats || data.data)) {
      // Already structured object, merge it
      Object.assign(response, data);
    } else if (Array.isArray(data) || typeof data === 'object') {
      response.data = data;
    } else {
      response.data = data;
    }
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Send error response with consistent format
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Error} error - Error object
 * @param {string} action - Action context for logging
 * @param {Object} context - Additional context for logging
 */
function handleError(res, statusCode, message, error, action, context = {}) {
  logger.error({
    action,
    error: error.response?.data || error.message,
    ...context,
  });

  return res.status(statusCode).json({
    success: false,
    message,
    error: error.response?.data?.message || error.message,
  });
}

/**
 * Validate required query/body parameters
 * @param {Object} req - Express request object
 * @param {Array} fields - Array of field names to validate
 * @param {string} location - 'query' or 'body' (default 'query')
 * @returns {Object|null} Error response object or null if valid
 */
function validateRequired(req, fields, location = 'query') {
  const source = location === 'body' ? req.body : req.query;
  for (const field of fields) {
    if (!source[field]) {
      return {
        statusCode: 400,
        message: `${field} is required`,
      };
    }
  }
  return null;
}

/**
 * Build headers for ML API calls with account token
 * @param {Object} account - MLAccount object
 * @returns {Object} Headers object
 */
function buildMLHeaders(account) {
  return {
    Authorization: `Bearer ${account.accessToken}`,
    "Content-Type": "application/json",
  };
}

/**
 * Make API call with error handling
 * @param {Promise} axiosCall - Axios promise
 * @param {Object} fallback - Fallback value if request fails
 * @returns {Promise<Object>} Response data or fallback
 */
async function safeApiCall(axiosCall, fallback = null) {
  try {
    const response = await axiosCall;
    return response.data;
  } catch (error) {
    return fallback !== null ? fallback : { error: error.message };
  }
}

/**
 * Extract and process catalog product search result
 * @param {Array} results - Search results
 * @param {string} itemId - Current item ID
 * @returns {Object} Processed competition data
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
      my_position: results.find((r) => r.id === itemId)
        ? results.findIndex((r) => r.id === itemId) + 1
        : null,
    },
  };
}

/**
 * Fetch item details from ML API
 * @param {string} itemId - Item ID
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} Item data or null
 */
async function fetchItem(itemId, headers) {
  try {
    const response = await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers });
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Check catalog eligibility for item
 * @param {string} itemId - Item ID
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} Eligibility data or null
 */
async function checkCatalogEligibility(itemId, headers) {
  try {
    const response = await axios.get(
      `${ML_API_BASE}/items/${itemId}/catalog_eligibility`,
      { headers }
    );
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Get catalog suggestions for item
 * @param {string} itemId - Item ID
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} Suggestions data or null
 */
async function getCatalogSuggestions(itemId, headers) {
  try {
    const response = await axios.get(
      `${ML_API_BASE}/items/${itemId}/catalog_product_id/suggestions`,
      { headers }
    );
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Check buy box winner status
 * @param {string} itemId - Item ID
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} Buy box data or null
 */
async function checkBuyBoxStatus(itemId, headers) {
  try {
    const response = await axios.get(
      `${ML_API_BASE}/items/${itemId}/buy_box_winner`,
      { headers }
    );
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Search for items by catalog product
 * @param {string} catalogProductId - Catalog product ID
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Search results or empty array
 */
async function searchByCatalogProduct(catalogProductId, params = {}) {
  try {
    const response = await axios.get(
      `${ML_API_BASE}/sites/${SITE_ID}/search`,
      {
        params: {
          catalog_product_id: catalogProductId,
          limit: 50,
          ...params,
        },
      }
    );
    return response.data.results || [];
  } catch (error) {
    return [];
  }
}


// ============================================
// PUBLIC CATALOG ENDPOINTS
// ============================================

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

    if (q) params.q = q;
    if (category) params.category = category;

    const searchUrl =
      q || category
        ? `${ML_API_BASE}/sites/${SITE_ID}/search`
        : `${ML_API_BASE}/sites/${SITE_ID}/search?category=MLB1648`;

    const response = await axios.get(searchUrl, { params, timeout: 15000 });

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
    const validation = validateRequired(req, ["q", "category"], 'query');
    
    // Custom validation: require q OR category
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

    const response = await axios.get(`${ML_API_BASE}/sites/${SITE_ID}/search`, {
      params,
    });

    return sendSuccess(res, {
      results: response.data.results || [],
      paging: response.data.paging || { total: 0 },
      filters: response.data.available_filters || [],
      sort: response.data.available_sorts || [],
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
    const response = await axios.get(
      `${ML_API_BASE}/sites/${SITE_ID}/categories`,
    );

    return sendSuccess(res, response.data || []);
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

    const response = await axios.get(`${ML_API_BASE}/categories/${categoryId}`);

    return sendSuccess(res, response.data);
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

      const attributes = response.data || [];
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

    const response = await axios.get(`${ML_API_BASE}/products/${productId}`);

    return sendSuccess(res, response.data);
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

    const response = await axios
      .get(`${ML_API_BASE}/trends/${SITE_ID}/${categoryId}`)
      .catch(() => ({ data: [] }));

    return sendSuccess(res, {
      categoryId,
      trends: response.data || [],
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

    const response = await axios.get(
      `${ML_API_BASE}/sites/${SITE_ID}/domain_discovery/search`,
      {
        params: { q: title },
      },
    );

    return sendSuccess(res, response.data || []);
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

    let url = `${ML_API_BASE}/sites/${SITE_ID}/listing_types`;
    if (categoryId) {
      url = `${ML_API_BASE}/categories/${categoryId}/listing_types`;
    }

    const response = await axios.get(url);

    return sendSuccess(res, response.data || []);
  } catch (error) {
    // Return fallback listing types for MLB (Brazil)
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
      const account = req.mlAccount;
      const headers = buildMLHeaders(account);

      // Get item to check eligibility
      const item = await fetchItem(itemId, headers);
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

      // Get eligibility and suggestions in parallel
      const [eligibility, suggestions] = await Promise.all([
        checkCatalogEligibility(itemId, headers),
        getCatalogSuggestions(itemId, headers),
      ]);

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

      const { q: qParam, category: categoryParam } = req.query;
      if (!qParam && !categoryParam) {
        return sendSuccess(res, null, "Query (q) or category is required", 400);
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

      return sendSuccess(res, {
        products: response.data.results || [],
        pagination: {
          total: response.data.paging?.total || 0,
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
      const account = req.mlAccount;

      const validation = validateRequired(req, ["catalog_product_id"], 'body');
      if (validation) {
        return sendSuccess(res, null, validation.message, validation.statusCode);
      }

      const headers = buildMLHeaders(account);

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

      return sendSuccess(res, {
        item_id: itemId,
        catalog_product_id,
        item: response.data,
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

      const validation = validateRequired(req, ["catalog_product_id"], 'body');
      if (validation) {
        return sendSuccess(res, null, validation.message, validation.statusCode);
      }

      const headers = buildMLHeaders(account);

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

      return sendSuccess(res, {
        item_id: itemId,
        catalog_product_id,
        item: response.data,
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
      const account = req.mlAccount;
      const headers = buildMLHeaders(account);

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

      return sendSuccess(res, {
        item_id: itemId,
        item: response.data,
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
      const headers = buildMLHeaders(account);

      // Get item to find catalog product
      const item = await fetchItem(itemId, headers);
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

      // Get catalog product and search for competitors
      const [catalogRes, searchRes] = await Promise.all([
        axios.get(`${ML_API_BASE}/products/${catalogProductId}`, { headers }),
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
        catalog_product: catalogRes.data,
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
      const account = req.mlAccount;
      const headers = buildMLHeaders(account);

      // Get item
      const item = await fetchItem(itemId, headers);
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

      // Check if item is winning the buy box
      const buyBoxRes = await checkBuyBoxStatus(itemId, headers);
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
      const headers = buildMLHeaders(account);

      let itemIds = [];
      let searchRes;

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
      const batchSize = 100;

      for (const itemId of itemIds.slice(0, batchSize)) {
        try {
          const item = await fetchItem(itemId, headers);
          if (!item) continue;

          let catalogStatus = "not_eligible";
          let buyBoxWinner = false;
          let competitorsCount = 0;
          let competitorPrice = null;

          if (item.catalog_product_id) {
            catalogStatus = "catalog_listed";

            try {
              // Check buy box status for catalog items
              const buyboxRes = await checkBuyBoxStatus(itemId, headers);
              buyBoxWinner = buyboxRes?.winner_item_id === itemId;

              // Get competitors for catalog items
              const competitorResults = await searchByCatalogProduct(
                item.catalog_product_id
              );

              competitorsCount = Math.max(0, competitorResults.length - 1);

              const competitorPrices = competitorResults
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
              const eligibilityRes = await checkCatalogEligibility(itemId, headers);
              if (eligibilityRes?.eligible) {
                catalogStatus = "eligible";
              }
            } catch (eligErr) {
              // Eligibility check failed
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
        total: searchRes.data.paging?.total || items.length,
        paging: searchRes.data.paging,
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
      const account = req.mlAccount;
      const headers = buildMLHeaders(account);

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
      const totalItems = itemIds.length;

      // Check first 20 items for catalog status
      for (const itemId of itemIds.slice(0, 20)) {
        try {
          const item = await fetchItem(itemId, headers);
          if (!item) continue;

          if (item.catalog_product_id) {
            catalogCount++;

            try {
              const buyboxRes = await checkBuyBoxStatus(itemId, headers);
              if (buyboxRes?.winner_item_id === itemId) {
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

      // Return fallback stats
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
