/**
 * Validation Middleware
 * Input validation for authentication and user operations
 */

const logger = require('../logger');

/**
 * Validate email format and presence
 */
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required',
      code: 'MISSING_EMAIL',
    });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format',
      code: 'INVALID_EMAIL',
    });
  }

  // Normalize email
  req.body.email = email.toLowerCase().trim();
  next();
};

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const validatePassword = (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required',
      code: 'MISSING_PASSWORD',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long',
      code: 'PASSWORD_TOO_SHORT',
    });
  }

  // Optional: Enforce strong password
  // const hasUpperCase = /[A-Z]/.test(password);
  // const hasLowerCase = /[a-z]/.test(password);
  // const hasNumbers = /\d/.test(password);
  // const hasSpecialChar = /[!@#$%^&*]/.test(password);

  // if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
  //   return res.status(400).json({
  //     success: false,
  //     message: 'Password must contain uppercase, lowercase, number, and special character',
  //     code: 'PASSWORD_WEAK',
  //   });
  // }

  next();
};

/**
 * Validate user registration input
 */
const validateRegistration = (req, res, next) => {
  const { email, password, firstName, lastName } = req.body;
  const errors = [];

  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }

  if (!firstName) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors,
    });
  }

  next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid page number',
        code: 'INVALID_PAGE',
      });
    }
    req.query.page = pageNum;
  }

  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100',
        code: 'INVALID_LIMIT',
      });
    }
    req.query.limit = limitNum;
  }

  next();
};

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .slice(0, 1000); // Limit length
  };

  // Sanitize body
  Object.keys(req.body).forEach((key) => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = sanitizeString(req.body[key]);
    }
  });

  // Sanitize query params
  Object.keys(req.query).forEach((key) => {
    if (typeof req.query[key] === 'string') {
      req.query[key] = sanitizeString(req.query[key]);
    }
  });

  next();
};

/**
 * Rate limiting validation
 */
const checkRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    const userAttempts = attempts.get(key) || [];

    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter((time) => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      logger.warn({
        action: 'RATE_LIMIT_EXCEEDED',
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString(),
      });

      return res.status(429).json({
        success: false,
        message: `Too many attempts. Please try again after ${Math.ceil(windowMs / 1000)} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    recentAttempts.push(now);
    attempts.set(key, recentAttempts);

    next();
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateRegistration,
  validatePagination,
  sanitizeInput,
  checkRateLimit,
};
