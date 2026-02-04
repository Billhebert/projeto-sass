/**
 * Shared Constants
 * Centralized constants used across the application
 */

// API Endpoints
const ML_AUTH_URL = "https://auth.mercadolibre.com/authorization";
const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
const ML_API_BASE = "https://api.mercadolibre.com";

// Database
const DB_DEFAULTS = {
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
};

// JWT
const JWT_CONFIG = {
  EXPIRES_IN: "7d",
  REFRESH_EXPIRES_IN: "30d",
};

// Order Status
const ORDER_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURNED: "returned",
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  REFUNDED: "refunded",
};

// Account Status
const ACCOUNT_STATUS = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
};

// Error Codes
const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  SERVER_ERROR: "SERVER_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  ML_API_ERROR: "ML_API_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  INVALID_TOKEN: "INVALID_TOKEN",
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Pagination
const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
};

// Rate Limiting
const RATE_LIMIT = {
  API_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  API_MAX_REQUESTS: 100,
  AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  AUTH_MAX_REQUESTS: 10,
};

// Validation
const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 255,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

module.exports = {
  ML_AUTH_URL,
  ML_TOKEN_URL,
  ML_API_BASE,
  DB_DEFAULTS,
  JWT_CONFIG,
  ORDER_STATUS,
  PAYMENT_STATUS,
  ACCOUNT_STATUS,
  ERROR_CODES,
  HTTP_STATUS,
  PAGINATION,
  RATE_LIMIT,
  VALIDATION,
};
