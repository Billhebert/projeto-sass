/**
 * Admin Routes
 *
 * Endpoints para gerenciar usuários em TEST mode
 * - Visualizar tokens de verificação
 * - Listar usuários pendentes
 * - Aprovar/Rejeitar manualmente
 */

const express = require("express");
const router = express.Router();
const User = require("../db/models/User");
const logger = require("../logger");

// Middleware para verificar autenticação admin
const adminAuth = (req, res, next) => {
  // Token simples - você deve configurar melhor em produção
  const adminToken = req.headers["x-admin-token"];
  const expectedToken = process.env.ADMIN_TOKEN;

  if (!adminToken || !expectedToken || adminToken !== expectedToken) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized - Admin token required",
    });
  }

  next();
};

/**
 * GET /api/admin/pending-verifications
 * List all users pending email verification
 */
router.get("/pending-verifications", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Buscar usuários não verificados
    const users = await User.find({ emailVerified: false })
      .select(
        "email firstName lastName emailVerified emailVerificationExpires createdAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments({ emailVerified: false });

    const usersWithStatus = users.map((user) => ({
      ...user,
      tokenExpired: user.emailVerificationExpires < new Date(),
      expiresIn: user.emailVerificationExpires
        ? Math.ceil((user.emailVerificationExpires - new Date()) / 1000 / 60) +
          " minutos"
        : "Expirado",
    }));

    return res.status(200).json({
      success: true,
      data: {
        users: usersWithStatus,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error({
      action: "ADMIN_GET_PENDING_VERIFICATIONS_ERROR",
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to fetch pending verifications",
    });
  }
});

/**
 * GET /api/admin/verification-tokens/:email
 * Get verification token for a specific user (only in TEST mode)
 */
router.get("/verification-tokens/:email", adminAuth, async (req, res) => {
  try {
    if (process.env.EMAIL_MODE !== "test") {
      return res.status(403).json({
        success: false,
        error: "This endpoint is only available in TEST mode",
      });
    }

    const { email } = req.params;
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "email firstName lastName emailVerified emailVerificationToken emailVerificationExpires createdAt",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: "User email is already verified",
      });
    }

    if (!user.emailVerificationToken) {
      return res.status(400).json({
        success: false,
        error: "No verification token found for this user",
      });
    }

    // Retornar informações do token
    return res.status(200).json({
      success: true,
      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        verificationToken: user.emailVerificationToken, // Hash do token
        expiresAt: user.emailVerificationExpires,
        createdAt: user.createdAt,
        tokenExpired: user.emailVerificationExpires < new Date(),
        // Nota: O token real foi destruído após o hash
        note: "O token real não pode ser recuperado. Use o endpoint /verify-email com o token original.",
      },
    });
  } catch (error) {
    logger.error({
      action: "ADMIN_GET_TOKEN_ERROR",
      email: req.params.email,
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to fetch verification token",
    });
  }
});

/**
 * POST /api/admin/resend-verification/:email
 * Resend verification email to user (bypasses rate limiting)
 */
router.post("/resend-verification/:email", adminAuth, async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: "User email is already verified",
      });
    }

    // Gerar novo token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Enviar email (em TEST mode, apenas loga)
    try {
      const emailService = require("../services/email");
      await emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.firstName,
      );

      logger.info({
        action: "ADMIN_RESEND_VERIFICATION_EMAIL",
        email: user.email,
        timestamp: new Date().toISOString(),
      });
    } catch (emailError) {
      logger.error({
        action: "ADMIN_RESEND_EMAIL_FAILED",
        email: user.email,
        error: emailError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification email sent successfully",
      data: {
        email: user.email,
        expiresIn: "24h",
      },
    });
  } catch (error) {
    logger.error({
      action: "ADMIN_RESEND_ERROR",
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to resend verification email",
    });
  }
});

/**
 * POST /api/admin/verify-user/:email
 * Manually verify a user's email (admin bypass)
 */
router.post("/verify-user/:email", adminAuth, async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: "User email is already verified",
      });
    }

    // Marcar como verificado
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    logger.info({
      action: "ADMIN_USER_MANUALLY_VERIFIED",
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: "User email verified successfully",
      data: {
        email: user.email,
        emailVerified: true,
      },
    });
  } catch (error) {
    logger.error({
      action: "ADMIN_VERIFY_USER_ERROR",
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to verify user",
    });
  }
});

/**
 * DELETE /api/admin/users/:email
 * Delete a user (for testing purposes only)
 */
router.delete("/users/:email", adminAuth, async (req, res) => {
  try {
    const { email } = req.params;

    // Proteção: não permitir deletar usuários verificados em produção
    if (process.env.NODE_ENV === "production") {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user && user.emailVerified) {
        return res.status(403).json({
          success: false,
          error: "Cannot delete verified users in production",
        });
      }
    }

    const result = await User.deleteOne({ email: email.toLowerCase() });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    logger.warn({
      action: "ADMIN_USER_DELETED",
      email: email,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error({
      action: "ADMIN_DELETE_USER_ERROR",
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to delete user",
    });
  }
});

/**
 * GET /api/admin/stats
 * Get verification statistics
 */
router.get("/stats", adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    const pendingUsers = await User.countDocuments({ emailVerified: false });
    const expiredTokens = await User.countDocuments({
      emailVerified: false,
      emailVerificationExpires: { $lt: new Date() },
    });

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        pendingUsers,
        expiredTokens,
        verificationRate:
          totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
      },
    });
  } catch (error) {
    logger.error({
      action: "ADMIN_STATS_ERROR",
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to fetch statistics",
    });
  }
});

/**
 * ========================================
 * USER ROLE MANAGEMENT ENDPOINTS
 * ========================================
 */

/**
 * POST /api/admin/users/:email/role
 * Change user role (promote/demote)
 */
router.post("/users/:email/role", adminAuth, async (req, res) => {
  try {
    const { email } = req.params;
    const { role } = req.body;

    // Validar role
    const validRoles = ["user", "admin", "moderator", "viewer", "super_admin"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: "Invalid role. Must be one of: " + validRoles.join(", "),
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    logger.info({
      action: "ADMIN_ROLE_CHANGED",
      email: user.email,
      oldRole,
      newRole: role,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: `User role changed from '${oldRole}' to '${role}'`,
      data: {
        email: user.email,
        role: user.role,
        oldRole,
      },
    });
  } catch (error) {
    logger.error({
      action: "ADMIN_CHANGE_ROLE_ERROR",
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to change user role",
    });
  }
});

/**
 * GET /api/admin/users/:email/role
 * Get user role and permissions
 */
router.get("/users/:email/role", adminAuth, async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "email firstName lastName role permissions",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions || [],
      },
    });
  } catch (error) {
    logger.error({
      action: "ADMIN_GET_ROLE_ERROR",
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to fetch user role",
    });
  }
});

/**
 * GET /api/admin/users
 * List all users with pagination and role filter
 */
router.get("/users", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const role = req.query.role; // Optional filter
    const skip = (page - 1) * limit;

    const query = {};
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select("email firstName lastName role emailVerified createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error({
      action: "ADMIN_LIST_USERS_ERROR",
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to list users",
    });
  }
});

/**
 * GET /api/admin/roles
 * Get all available roles and their descriptions
 */
router.get("/roles", adminAuth, async (req, res) => {
  try {
    const rbac = require("../config/rbac");

    const roles = rbac.getAllRoles().map((role) => ({
      value: role,
      label: role.charAt(0).toUpperCase() + role.slice(1),
      description: rbac.ROLE_DESCRIPTIONS[role],
      permissions: rbac.getPermissionsByRole(role),
    }));

    return res.status(200).json({
      success: true,
      data: {
        roles,
      },
    });
  } catch (error) {
    logger.error({
      action: "ADMIN_GET_ROLES_ERROR",
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to fetch roles",
    });
  }
});

/**
 * GET /api/admin/role-stats
 * Get statistics about role distribution
 */
router.get("/role-stats", adminAuth, async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const total = await User.countDocuments({});

    const roleStats = {
      total,
      byRole: {},
    };

    stats.forEach((stat) => {
      roleStats.byRole[stat._id] = {
        count: stat.count,
        percentage: ((stat.count / total) * 100).toFixed(2),
      };
    });

    return res.status(200).json({
      success: true,
      data: roleStats,
    });
  } catch (error) {
    logger.error({
      action: "ADMIN_ROLE_STATS_ERROR",
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to fetch role statistics",
    });
  }
});

/**
 * POST /api/admin/users/bulk-role-update
 * Update multiple users' roles at once
 */
router.post("/users/bulk-role-update", adminAuth, async (req, res) => {
  try {
    const { userEmails, newRole } = req.body;

    if (!userEmails || !Array.isArray(userEmails) || userEmails.length === 0) {
      return res.status(400).json({
        success: false,
        error: "userEmails must be a non-empty array",
      });
    }

    if (!newRole) {
      return res.status(400).json({
        success: false,
        error: "newRole is required",
      });
    }

    const result = await User.updateMany(
      { email: { $in: userEmails.map((e) => e.toLowerCase()) } },
      { role: newRole },
    );

    logger.info({
      action: "ADMIN_BULK_ROLE_UPDATE",
      emailCount: userEmails.length,
      newRole,
      modifiedCount: result.modifiedCount,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: `Updated ${result.modifiedCount} user(s) role to '${newRole}'`,
      data: {
        modifiedCount: result.modifiedCount,
        newRole,
      },
    });
  } catch (error) {
    logger.error({
      action: "ADMIN_BULK_ROLE_UPDATE_ERROR",
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      error: "Failed to update users",
    });
  }
});

module.exports = router;
