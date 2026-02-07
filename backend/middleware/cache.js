/**
 * Cache Middleware
 * Uses Redis to cache expensive API responses
 */

const redis = require("../db/redis");
const logger = require("../logger");

/**
 * Cache middleware factory
 * @param {number} ttl - Time to live in seconds
 * @param {function} keyGenerator - Function to generate cache key from request
 */
const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Skip caching if Redis is not available
    if (!redis || !redis.isReady) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : `cache:${req.method}:${req.originalUrl}:${req.user?.userId || "anonymous"}`;

      // Try to get from cache
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        logger.info({
          action: "CACHE_HIT",
          key: cacheKey,
          userId: req.user?.userId,
        });

        // Parse and return cached response
        const parsed = JSON.parse(cachedData);
        return res.json({
          ...parsed,
          cached: true,
          cachedAt: new Date().toISOString(),
        });
      }

      // Cache miss - continue to controller
      logger.info({
        action: "CACHE_MISS",
        key: cacheKey,
        userId: req.user?.userId,
      });

      // Store original res.json function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (data) {
        // Cache successful responses
        if (data.success !== false) {
          redis
            .setex(cacheKey, ttl, JSON.stringify(data))
            .then(() => {
              logger.info({
                action: "CACHE_SET",
                key: cacheKey,
                ttl: ttl,
              });
            })
            .catch((err) => {
              logger.error({
                action: "CACHE_SET_ERROR",
                key: cacheKey,
                error: err.message,
              });
            });
        }

        // Call original json function
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error({
        action: "CACHE_MIDDLEWARE_ERROR",
        error: error.message,
      });
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Clear cache for specific pattern
 */
const clearCachePattern = async (pattern) => {
  try {
    if (!redis || !redis.isReady) {
      return;
    }

    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info({
        action: "CACHE_CLEARED",
        pattern: pattern,
        count: keys.length,
      });
    }
  } catch (error) {
    logger.error({
      action: "CACHE_CLEAR_ERROR",
      pattern: pattern,
      error: error.message,
    });
  }
};

/**
 * Cache invalidation middleware
 * Clears cache when data is modified
 */
const invalidateCacheMiddleware = (patterns) => {
  return async (req, res, next) => {
    // Store original json function
    const originalJson = res.json.bind(res);

    // Override res.json to invalidate cache after successful mutations
    res.json = async function (data) {
      // Invalidate cache on successful mutations
      if (
        data.success !== false &&
        ["POST", "PUT", "DELETE", "PATCH"].includes(req.method)
      ) {
        for (const pattern of patterns) {
          const resolvedPattern =
            typeof pattern === "function" ? pattern(req) : pattern;
          await clearCachePattern(resolvedPattern);
        }
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  cacheMiddleware,
  clearCachePattern,
  invalidateCacheMiddleware,
};
