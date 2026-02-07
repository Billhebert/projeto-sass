/**
 * Centralized Route Response Helpers Module
 * =========================================
 * 
 * This module provides unified helper functions for all routes to:
 * 1. Handle errors consistently
 * 2. Send success responses uniformly
 * 3. Validate and retrieve accounts
 * 4. Build API headers
 * 
 * Previously, these functions were duplicated across 49 route files.
 * Now they're centralized for DRY principle and easier maintenance.
 * 
 * Usage:
 * ------
 * const { handleError, sendSuccess, getAndValidateAccount, buildHeaders } = require('../middleware/response-helpers');
 * 
 * // In route handler:
 * try {
 *   const data = await someAsyncOperation();
 *   sendSuccess(res, data, "Operation successful", 200);
 * } catch (error) {
 *   handleError(res, 500, "Operation failed", error, { action: 'SOME_ACTION', userId: req.user.userId });
 * }
 */

const logger = require('../logger');
const MLAccount = require('../db/models/MLAccount');
const User = require('../db/models/User');

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Handle and log errors with consistent response format
 * 
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} message - Error message to send to client
 * @param {Error|null} error - Original error object for logging
 * @param {Object} context - Additional logging context (action, userId, etc.)
 * 
 * @example
 * // Basic error handling
 * handleError(res, 404, "Account not found");
 * 
 * @example
 * // With error object and context
 * try {
 *   const data = await getData();
 * } catch (error) {
 *   handleError(res, 500, "Failed to fetch data", error, {
 *     action: 'FETCH_DATA',
 *     userId: req.user.userId,
 *     accountId: req.params.accountId
 *   });
 * }
 */
const handleError = (res, statusCode = 500, message, error = null, context = {}) => {
  logger.error({
    action: context.action || "UNKNOWN_ERROR",
    error: error?.message || message,
    statusCode,
    ...context,
  });

  const response = { success: false, message };
  if (error?.message) response.error = error.message;
  res.status(statusCode).json(response);
};

/**
 * Send success response with consistent format
 * 
 * @param {Object} res - Express response object
 * @param {any} data - Response data payload
 * @param {string|null} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * 
 * @example
 * // Simple success
 * sendSuccess(res, userData);
 * 
 * @example
 * // With message and custom status
 * sendSuccess(res, { itemId: 123 }, "Item created successfully", 201);
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = { success: true, data };
  if (message) response.message = message;
  res.status(statusCode).json(response);
};

// ============================================================================
// ACCOUNT HELPERS
// ============================================================================

/**
 * Validate and return ML account
 * 
 * @param {string} accountId - ML Account ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Account object if valid
 * @throws {Error} If account not found or not owned by user
 * 
 * @example
 * try {
 *   const account = await getAndValidateAccount(req.params.accountId, req.user.userId);
 *   sendSuccess(res, account);
 * } catch (error) {
 *   handleError(res, 404, "Account not found or access denied", error, { action: 'GET_ACCOUNT' });
 * }
 */
const getAndValidateAccount = async (accountId, userId) => {
  if (!accountId || !userId) {
    throw new Error("Missing accountId or userId");
  }

  const account = await MLAccount.findOne({
    where: {
      id: accountId,
      userId: userId
    }
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found or not owned by user ${userId}`);
  }

  return account;
};

/**
 * Build authorization headers for Mercado Livre API calls
 * 
 * @param {Object} account - ML Account object with accessToken
 * @returns {Object} Headers object with Authorization and Content-Type
 * 
 * @example
 * const account = await getAndValidateAccount(accountId, userId);
 * const headers = buildHeaders(account);
 * const response = await axios.get(url, { headers });
 */
const buildHeaders = (account) => {
  return {
    'Authorization': `Bearer ${account.accessToken}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Get user by ID and validate
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object
 * @throws {Error} If user not found
 */
const getAndValidateUser = async (userId) => {
  if (!userId) {
    throw new Error("Missing userId");
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  return user;
};

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

/**
 * Parse pagination parameters from request
 * 
 * @param {Object} query - Express request.query object
 * @param {number} defaultLimit - Default items per page (default: 20)
 * @param {number} maxLimit - Maximum items per page (default: 100)
 * @returns {Object} { limit, offset }
 * 
 * @example
 * const { limit, offset } = parsePagination(req.query, 20, 100);
 * const items = await Item.findAll({ limit, offset });
 */
const parsePagination = (query, defaultLimit = 20, maxLimit = 100) => {
  let limit = parseInt(query.limit || defaultLimit);
  let page = parseInt(query.page || 1);

  // Validate limits
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (isNaN(page) || page < 1) page = 1;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;

  return { limit, offset, page };
};

/**
 * Format paginated response
 * 
 * @param {Array} items - Array of items
 * @param {number} total - Total count
 * @param {number} limit - Items per page
 * @param {number} page - Current page
 * @returns {Object} Formatted pagination response
 * 
 * @example
 * const { count, rows } = await Item.findAndCountAll({ limit, offset });
 * const response = formatPaginatedResponse(rows, count, limit, page);
 * sendSuccess(res, response);
 */
const formatPaginatedResponse = (items, total, limit, page) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Response helpers
  handleError,
  sendSuccess,
  
  // Account helpers
  getAndValidateAccount,
  getAndValidateUser,
  buildHeaders,
  
  // Pagination helpers
  parsePagination,
  formatPaginatedResponse,
};
