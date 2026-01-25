/**
 * Authentication Middleware
 * JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');
const logger = require('../logger');

/**
 * Verify JWT token and attach user to request
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        code: 'MISSING_TOKEN',
      });
    }

    jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev_jwt_secret_min_32_characters_long_1234567890',
      (err, user) => {
        if (err) {
          logger.warn({
            action: 'INVALID_TOKEN',
            error: err.message,
            timestamp: new Date().toISOString(),
          });

          return res.status(403).json({
            success: false,
            message: 'Invalid or expired token',
            code: 'INVALID_TOKEN',
          });
        }

        req.user = user;
        next();
      }
    );
  } catch (error) {
    logger.error({
      action: 'AUTH_MIDDLEWARE_ERROR',
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Check if user has required role
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn({
        action: 'UNAUTHORIZED_ACCESS',
        userId: req.user.userId,
        requiredRole: allowedRoles,
        userRole: req.user.role,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED',
    });
  }

  next();
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      jwt.verify(
        token,
        process.env.JWT_SECRET || 'dev_jwt_secret_min_32_characters_long_1234567890',
        (err, user) => {
          if (!err) {
            req.user = user;
          }
          next();
        }
      );
    } else {
      next();
    }
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  optionalAuth,
};
