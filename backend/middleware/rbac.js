/**
 * Authentication & Authorization Middleware
 *
 * Middlewares for protecting routes and checking permissions
 */

const jwt = require("jsonwebtoken");
const { hasPermission, isAdmin, isSuperAdmin } = require("../config/rbac");
const logger = require("../logger");

/**
 * Verify JWT token and attach user to request
 */
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No authentication token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error({
      action: "AUTH_MIDDLEWARE_ERROR",
      error: error.message,
    });

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }
};

/**
 * Require user to be authenticated
 * Use: router.get('/protected', requireAuth, handler)
 */
const requireAuth = authMiddleware;

/**
 * Require user to be admin or above
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  if (!isAdmin(req.user)) {
    logger.warn({
      action: "UNAUTHORIZED_ADMIN_ACCESS",
      userId: req.user.userId,
      role: req.user.role,
      path: req.path,
    });

    return res.status(403).json({
      success: false,
      error: "Admin access required",
    });
  }

  next();
};

/**
 * Require user to be super admin
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  if (!isSuperAdmin(req.user)) {
    logger.warn({
      action: "UNAUTHORIZED_SUPER_ADMIN_ACCESS",
      userId: req.user.userId,
      role: req.user.role,
      path: req.path,
    });

    return res.status(403).json({
      success: false,
      error: "Super admin access required",
    });
  }

  next();
};

/**
 * Require specific permission(s)
 * Use: router.get('/resource', requirePermission('resource:read'), handler)
 */
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const hasRequiredPermission = permissions.some((permission) =>
      hasPermission(req.user, permission),
    );

    if (!hasRequiredPermission) {
      logger.warn({
        action: "PERMISSION_DENIED",
        userId: req.user.userId,
        requiredPermissions: permissions,
        userPermissions: req.user.permissions,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        requiredPermissions: permissions,
      });
    }

    next();
  };
};

/**
 * Require all permissions
 */
const requireAllPermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const hasAllRequired = permissions.every((permission) =>
      hasPermission(req.user, permission),
    );

    if (!hasAllRequired) {
      logger.warn({
        action: "ALL_PERMISSIONS_DENIED",
        userId: req.user.userId,
        requiredPermissions: permissions,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: "All required permissions are needed",
        requiredPermissions: permissions,
      });
    }

    next();
  };
};

/**
 * Optional auth - doesn't fail if no token
 * Useful for public routes that can have optional user data
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch (error) {
    // Ignore errors, proceed without user
  }

  next();
};

/**
 * Verify email middleware - ensure user has verified email
 */
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      error: "Email verification required",
      action: "VERIFY_EMAIL",
    });
  }

  next();
};

/**
 * Rate limit per user
 */
const rateLimitByUser = (maxRequests = 100, windowMs = 900000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) return next();

    const userId = req.user.userId;
    const now = Date.now();

    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }

    let requests = userRequests.get(userId);
    requests = requests.filter((time) => now - time < windowMs);

    if (requests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: "Too many requests. Please try again later.",
      });
    }

    requests.push(now);
    userRequests.set(userId, requests);
    next();
  };
};

module.exports = {
  authMiddleware,
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requirePermission,
  requireAllPermissions,
  optionalAuth,
  requireVerifiedEmail,
  rateLimitByUser,
};
