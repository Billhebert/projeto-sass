const axios = require("axios");
const redisClient = require("../db/redis");
const logger = require("../logger");

/**
 * Service to fetch and cache Mercado Livre category information
 */
class MLCategoryService {
  constructor() {
    this.baseURL = "https://api.mercadolibre.com";
    this.cacheTTL = 7 * 24 * 60 * 60; // 7 days in seconds (categories rarely change)
  }

  /**
   * Get category name by ID from ML API with Redis caching
   * @param {string} categoryId - ML category ID (e.g., "MLB1234")
   * @returns {Promise<string>} Category name or ID if fetch fails
   */
  async getCategoryName(categoryId) {
    if (!categoryId || categoryId === "Sem Categoria") {
      return "Sem Categoria";
    }

    const cacheKey = `ml:category:${categoryId}`;

    try {
      // Try to get from cache first
      if (redisClient.isReady) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          logger.debug({
            action: "ML_CATEGORY_CACHE_HIT",
            categoryId,
            name: cached,
          });
          return cached;
        }
      }

      // Fetch from ML API
      logger.debug({
        action: "ML_CATEGORY_FETCH",
        categoryId,
        url: `${this.baseURL}/categories/${categoryId}`,
      });

      const response = await axios.get(
        `${this.baseURL}/categories/${categoryId}`,
        {
          timeout: 5000,
          headers: {
            "User-Agent": "VENDATA-Platform/1.0",
          },
        },
      );

      if (response.data && response.data.name) {
        const categoryName = response.data.name;

        // Cache the result
        if (redisClient.isReady) {
          await redisClient.setex(cacheKey, this.cacheTTL, categoryName);
          logger.debug({
            action: "ML_CATEGORY_CACHED",
            categoryId,
            name: categoryName,
            ttl: this.cacheTTL,
          });
        }

        return categoryName;
      }

      // Fallback to categoryId if no name found
      return categoryId;
    } catch (error) {
      logger.error({
        action: "ML_CATEGORY_FETCH_ERROR",
        categoryId,
        error: error.message,
        code: error.response?.status,
      });

      // Return categoryId as fallback
      return categoryId;
    }
  }

  /**
   * Get multiple category names in batch
   * @param {string[]} categoryIds - Array of category IDs
   * @returns {Promise<Object>} Map of categoryId -> categoryName
   */
  async getCategoryNames(categoryIds) {
    const uniqueIds = [...new Set(categoryIds)].filter(
      (id) => id && id !== "Sem Categoria",
    );

    const results = {};

    // Process in parallel with a limit to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < uniqueIds.length; i += batchSize) {
      const batch = uniqueIds.slice(i, i + batchSize);
      const promises = batch.map(async (id) => {
        const name = await this.getCategoryName(id);
        results[id] = name;
      });

      await Promise.all(promises);

      // Small delay between batches to be nice to ML API
      if (i + batchSize < uniqueIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Add "Sem Categoria" if it exists
    if (categoryIds.includes("Sem Categoria")) {
      results["Sem Categoria"] = "Sem Categoria";
    }

    return results;
  }

  /**
   * Enrich categories array with translated names
   * @param {Array} categories - Array of category objects with categoryId
   * @returns {Promise<Array>} Categories with translated names
   */
  async enrichCategories(categories) {
    if (!categories || categories.length === 0) {
      return categories;
    }

    // Extract category IDs
    const categoryIds = categories.map((cat) => cat.categoryId);

    // Get translated names
    const nameMap = await this.getCategoryNames(categoryIds);

    // Enrich categories
    return categories.map((cat) => ({
      ...cat,
      name: nameMap[cat.categoryId] || cat.categoryId,
    }));
  }

  /**
   * Clear category cache (useful for testing or manual refresh)
   * @param {string} categoryId - Optional specific category to clear
   */
  async clearCache(categoryId = null) {
    try {
      if (!redisClient.isReady) {
        logger.warn({
          action: "ML_CATEGORY_CACHE_CLEAR_SKIPPED",
          reason: "Redis not available",
        });
        return 0;
      }

      const pattern = categoryId
        ? `ml:category:${categoryId}`
        : "ml:category:*";

      const keys = await redisClient.keys(pattern);

      if (keys.length > 0) {
        await Promise.all(keys.map((key) => redisClient.del(key)));
        logger.info({
          action: "ML_CATEGORY_CACHE_CLEARED",
          pattern,
          count: keys.length,
        });
        return keys.length;
      }

      return 0;
    } catch (error) {
      logger.error({
        action: "ML_CATEGORY_CACHE_CLEAR_ERROR",
        error: error.message,
      });
      return 0;
    }
  }
}

// Export singleton instance
module.exports = new MLCategoryService();
