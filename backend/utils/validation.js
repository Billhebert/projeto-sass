/**
 * Shared Validation Utilities
 * Centralized validation functions for routes
 */

const { Types } = require("mongoose");

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean}
 */
function isValidObjectId(id) {
  return Types.ObjectId.isValid(id);
}

/**
 * Validate MongoDB ObjectIds array
 * @param {Array} ids - IDs array to validate
 * @returns {boolean}
 */
function isValidObjectIdArray(ids) {
  if (!Array.isArray(ids)) return false;
  return ids.every((id) => isValidObjectId(id));
}

/**
 * Validate pagination parameters
 * @param {number} limit - Items per page
 * @param {number} offset - Current offset
 * @returns {Object} { limit, offset, isValid }
 */
function validatePagination(limit, offset) {
  const maxLimit = 100;
  const minLimit = 1;

  let validLimit = parseInt(limit) || 20;
  let validOffset = parseInt(offset) || 0;

  // Enforce limits
  if (validLimit < minLimit) validLimit = minLimit;
  if (validLimit > maxLimit) validLimit = maxLimit;
  if (validOffset < 0) validOffset = 0;

  return {
    limit: validLimit,
    offset: validOffset,
    isValid: true,
  };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
 * @param {string} password - Password to validate
 * @returns {Object} { isValid, message }
 */
function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one number",
    };
  }

  return { isValid: true };
}

/**
 * Validate sort parameter
 * @param {string} sort - Sort parameter (e.g., "created", "-created")
 * @param {Array} allowedFields - Allowed fields for sorting
 * @returns {Object} MongoDB sort object or default
 */
function validateSort(sort, allowedFields = ["dateCreated"]) {
  if (!sort) return { dateCreated: -1 };

  const field = sort.startsWith("-") ? sort.substring(1) : sort;
  const direction = sort.startsWith("-") ? -1 : 1;

  if (!allowedFields.includes(field)) {
    return { dateCreated: -1 }; // Default sort
  }

  return { [field]: direction };
}

/**
 * Validate filters object
 * @param {Object} filters - Filters object
 * @param {Array} allowedFilters - Allowed filter keys
 * @returns {Object} Validated filters
 */
function validateFilters(filters, allowedFilters = []) {
  const validFilters = {};

  if (!filters || typeof filters !== "object") {
    return validFilters;
  }

  Object.keys(filters).forEach((key) => {
    if (
      allowedFilters.includes(key) &&
      filters[key] !== null &&
      filters[key] !== undefined
    ) {
      validFilters[key] = filters[key];
    }
  });

  return validFilters;
}

/**
 * Sanitize object (remove unwanted fields)
 * @param {Object} obj - Object to sanitize
 * @param {Array} allowedFields - Fields to keep
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, allowedFields = []) {
  const sanitized = {};

  allowedFields.forEach((field) => {
    if (field in obj) {
      sanitized[field] = obj[field];
    }
  });

  return sanitized;
}

module.exports = {
  isValidObjectId,
  isValidObjectIdArray,
  validatePagination,
  isValidEmail,
  validatePasswordStrength,
  validateSort,
  validateFilters,
  sanitizeObject,
};
