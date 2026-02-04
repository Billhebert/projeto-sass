/**
 * Admin Routes for User Management
 *
 * GET /admin/users/pending     - List users awaiting approval
 * GET /admin/users             - List all users
 * POST /admin/users/:id/approve - Approve a user
 * POST /admin/users/:id/reject  - Reject/delete a user
 * POST /admin/users/:id/toggle-status - Toggle user active/inactive status
 */

const express = require("express");
const User = require("../db/models/User");
const logger = require("../logger");

const router = express.Router();

// Middleware to check admin token
const checkAdminToken = (req, res, next) => {
  const adminToken = req.headers["x-admin-token"] || req.query.adminToken;

  const expectedToken =
    process.env.ADMIN_TOKEN || "SecureAdminToken2024Vendata";

  if (!adminToken || adminToken !== expectedToken) {
    return res.status(401).json({
      success: false,
      error: "Admin token required",
    });
  }

  next();
};

/**
 * GET /admin/users/pending
 * List all users awaiting admin approval
 */
router.get("/users/pending", checkAdminToken, async (req, res) => {
  try {
    const pendingUsers = await User.find({ emailVerified: false })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        count: pendingUsers.length,
        users: pendingUsers,
      },
    });
  } catch (error) {
    logger.error({
      action: "LIST_PENDING_USERS_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      success: false,
      error: "Failed to list pending users",
    });
  }
});

/**
 * GET /admin/users
 * List all users
 */
router.get("/users", checkAdminToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        count: users.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        users,
      },
    });
  } catch (error) {
    logger.error({
      action: "LIST_USERS_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      success: false,
      error: "Failed to list users",
    });
  }
});

/**
 * POST /admin/users/:id/approve
 * Approve a user to login
 */
router.post("/users/:id/approve", checkAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOneAndUpdate(
      { id: id },
      {
        emailVerified: true,
        status: "active",
      },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    logger.info({
      action: "USER_APPROVED",
      userId: id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: `Usuário ${user.email} aprovado com sucesso!`,
      data: { user },
    });
  } catch (error) {
    logger.error({
      action: "APPROVE_USER_ERROR",
      error: error.message,
      userId: req.params.id,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      success: false,
      error: "Failed to approve user",
    });
  }
});

/**
 * POST /admin/users/:id/reject
 * Reject/delete a user
 */
router.post("/users/:id/reject", checkAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findOneAndDelete({ id: id });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    logger.info({
      action: "USER_REJECTED",
      userId: id,
      email: user.email,
      reason: reason || "No reason provided",
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: `Usuário ${user.email} rejeitado e removido.`,
    });
  } catch (error) {
    logger.error({
      action: "REJECT_USER_ERROR",
      error: error.message,
      userId: req.params.id,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      success: false,
      error: "Failed to reject user",
    });
  }
});

/**
 * POST /admin/users/:id/toggle-status
 * Toggle user active/inactive status
 */
router.post("/users/:id/toggle-status", checkAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ id: id });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const newStatus = user.status === "active" ? "inactive" : "active";

    const updatedUser = await User.findOneAndUpdate(
      { id: id },
      { status: newStatus },
      { new: true },
    ).select("-password");

    logger.info({
      action: "USER_STATUS_TOGGLED",
      userId: id,
      email: user.email,
      newStatus,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: `Status do usuário alterado para: ${newStatus}`,
      data: { user: updatedUser },
    });
  } catch (error) {
    logger.error({
      action: "TOGGLE_USER_STATUS_ERROR",
      error: error.message,
      userId: req.params.id,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      success: false,
      error: "Failed to toggle user status",
    });
  }
});

/**
 * POST /admin/users/:id/make-admin
 * Promote user to admin
 */
router.post("/users/:id/make-admin", checkAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await User.findOneAndUpdate(
      { id: id },
      {
        role: "admin",
        permissions: ["all"],
      },
      { new: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    logger.info({
      action: "USER_PROMOTED_TO_ADMIN",
      userId: id,
      email: updatedUser.email,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: `${updatedUser.email} agora é administrador!`,
      data: { user: updatedUser },
    });
  } catch (error) {
    logger.error({
      action: "MAKE_ADMIN_ERROR",
      error: error.message,
      userId: req.params.id,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      success: false,
      error: "Failed to promote user to admin",
    });
  }
});

module.exports = router;
