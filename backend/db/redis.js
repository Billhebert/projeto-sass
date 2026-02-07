/**
 * Redis Client
 * Connection to Redis for caching
 */

const logger = require("../logger");

// Check if Redis is available
let redis = null;
let isReady = false;

try {
  // Try to create Redis client if ioredis is installed
  const Redis = require("ioredis");
  const redisUrl = process.env.REDIS_URL || "redis://redis:6379";

  redis = new Redis(redisUrl, {
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn("Redis connection failed after 3 attempts");
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000);
    },
    maxRetriesPerRequest: 1,
  });

  redis.on("connect", () => {
    logger.info("Redis connected successfully");
    isReady = true;
  });

  redis.on("error", (err) => {
    logger.error({
      action: "REDIS_ERROR",
      error: err.message,
    });
    isReady = false;
  });

  redis.on("close", () => {
    logger.warn("Redis connection closed");
    isReady = false;
  });
} catch (error) {
  logger.warn({
    action: "REDIS_NOT_AVAILABLE",
    message: "Redis client not available, caching will be disabled",
    error: error.message,
  });
  redis = null;
}

// Export Redis client or mock object
module.exports = redis || {
  isReady: false,
  get: async () => null,
  setex: async () => null,
  del: async () => null,
  keys: async () => [],
};

// Also export isReady flag
module.exports.isReady = isReady;
