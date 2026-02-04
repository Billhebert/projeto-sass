/**
 * Standardized API Response Utilities
 * Ensures consistent response format across all endpoints
 */

const logger = require("../logger");

/**
 * Send a successful response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Optional success message
 */
function sendSuccess(res, data = null, statusCode = 200, message = null) {
  const response = {
    success: true,
    ...(message && { message }),
    data,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
}

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Error message
 * @param {string} code - Error code for programmatic handling
 * @param {Object} details - Optional additional error details
 */
function sendError(
  res,
  statusCode = 400,
  error = "Bad Request",
  code = "BAD_REQUEST",
  details = null,
) {
  const response = {
    success: false,
    error,
    code,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };

  logger.error({
    action: "API_ERROR",
    statusCode,
    code,
    error,
    details,
    timestamp: new Date().toISOString(),
  });

  return res.status(statusCode).json(response);
}

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} items - Array of items
 * @param {number} total - Total count
 * @param {number} limit - Items per page
 * @param {number} offset - Current offset
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function sendPaginated(
  res,
  items = [],
  total = 0,
  limit = 20,
  offset = 0,
  statusCode = 200,
) {
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const response = {
    success: true,
    data: items,
    pagination: {
      total,
      limit,
      offset,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
}

/**
 * Handle async route errors
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error({
        action: "ASYNC_HANDLER_ERROR",
        error: error.message,
        stack: error.stack,
        route: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });

      // Default error response
      return sendError(
        res,
        error.statusCode || 500,
        error.message || "Internal Server Error",
        error.code || "SERVER_ERROR",
        process.env.NODE_ENV === "development" ? error.stack : undefined,
      );
    });
  };
}

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
  asyncHandler,
};
