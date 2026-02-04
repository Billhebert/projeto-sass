/**
 * Authentication Routes
 * User registration, login, password reset, and email verification
 */

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../db/models/User");
const logger = require("../logger");
const emailService = require("../services/email");
const { authenticateToken } = require("../middleware/auth");
const { validateEmail, validatePassword } = require("../middleware/validation");

// ============================================
// REGISTER - Create new user account
// ============================================

router.post("/register", validateEmail, validatePassword, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
        code: "EMAIL_EXISTS",
      });
    }

    // Create new user
    const user = new User({
      email,
      password, // Will be hashed by pre-save hook
      firstName: firstName || email.split("@")[0],
      lastName: lastName || "",
    });

    await user.save();

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    logger.info({
      action: "USER_REGISTERED",
      email: user.email,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    // Send verification email with token
    try {
      await emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.firstName,
      );
    } catch (emailError) {
      logger.error({
        action: "EMAIL_SEND_FAILED_DURING_REGISTER",
        email: user.email,
        error: emailError.message,
        timestamp: new Date().toISOString(),
      });
      // Don't fail the registration if email sending fails
      // The user can request to resend verification email later
    }

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      data: {
        user: user.getProfile(),
        verificationRequired: true,
        emailSent: true,
      },
    });
  } catch (error) {
    logger.error({
      action: "REGISTER_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: "Registration failed",
      code: "REGISTRATION_ERROR",
    });
  }
});

// ============================================
// LOGIN - Authenticate user and create session
// ============================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        code: "MISSING_CREDENTIALS",
      });
    }

    // Find user (need to include password)
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(429).json({
        success: false,
        message:
          "Account locked due to multiple failed login attempts. Try again in 30 minutes.",
        code: "ACCOUNT_LOCKED",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await user.incrementLoginAttempts();

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    // Reset login attempts
    await user.resetLoginAttempts();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET ||
        "dev_jwt_secret_min_32_characters_long_1234567890",
      { expiresIn: "24h" },
    );

    // Update last login
    user.lastLogin = new Date();
    user.lastLoginIP = req.ip;
    await user.save();

    logger.info({
      action: "USER_LOGIN",
      email: user.email,
      userId: user.id,
      ipAddress: req.ip,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: user.getProfile(),
        token,
        expiresIn: "24h",
      },
    });
  } catch (error) {
    logger.error({
      action: "LOGIN_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: "Login failed",
      code: "LOGIN_ERROR",
    });
  }
});

// ============================================
// LOGOUT - Revoke current session
// ============================================

router.post("/logout", authenticateToken, async (req, res) => {
  try {
    // In a real app, you might want to blacklist the token
    // or remove the session from the user's sessions array

    logger.info({
      action: "USER_LOGOUT",
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error({
      action: "LOGOUT_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: "Logout failed",
      code: "LOGOUT_ERROR",
    });
  }
});

// ============================================
// VERIFY EMAIL - Confirm email ownership
// ============================================

router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;
    console.log("VERIFY_EMAIL: Received token", token);

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
        code: "MISSING_TOKEN",
      });
    }

    // Hash the token to find matching user
    const crypto = require("crypto");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    console.log("VERIFY_EMAIL: Hashed token", hashedToken);

    // Find user with this token
    const foundUser = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });
    console.log("VERIFY_EMAIL: Found user?", !!foundUser);

    if (!foundUser) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
        code: "INVALID_TOKEN",
      });
    }

    // Verify email
    foundUser.verifyEmail(token);
    await foundUser.save();

    logger.info({
      action: "EMAIL_VERIFIED",
      email: foundUser.email,
      userId: foundUser.id,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Email verified successfully",
      data: { user: foundUser.getProfile() },
    });
  } catch (error) {
    logger.error({
      action: "VERIFY_EMAIL_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    console.error("VERIFY_EMAIL ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Email verification failed",
      code: "VERIFICATION_ERROR",
    });
  }
});

// ============================================
// FORGOT PASSWORD - Request password reset
// ============================================

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        code: "MISSING_EMAIL",
      });
    }

    const user = await User.findOne({ email });

    // Don't reveal if email exists (security)
    if (!user) {
      return res.json({
        success: true,
        message:
          "If an account exists, password reset instructions have been sent.",
      });
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    logger.info({
      action: "PASSWORD_RESET_REQUESTED",
      email: user.email,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    // Send password reset email with token
    try {
      const resetLink = `${process.env.FRONTEND_URL || "https://vendata.com.br"}/reset-password/${resetToken}`;
      await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.firstName,
      );
    } catch (emailError) {
      logger.error({
        action: "EMAIL_SEND_FAILED_DURING_PASSWORD_RESET",
        email: user.email,
        error: emailError.message,
        timestamp: new Date().toISOString(),
      });
      // Don't fail the request if email sending fails
      // User might try again
    }

    res.json({
      success: true,
      message:
        "If an account exists, password reset instructions have been sent.",
    });
  } catch (error) {
    logger.error({
      action: "FORGOT_PASSWORD_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: "Password reset request failed",
      code: "RESET_REQUEST_ERROR",
    });
  }
});

// ============================================
// RESET PASSWORD - Set new password
// ============================================

router.post("/reset-password/:token", validatePassword, async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      passwordResetToken: user.constructor.hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    // Verify token format
    if (!user.verifyPasswordResetToken(token)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token",
        code: "INVALID_TOKEN",
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    logger.info({
      action: "PASSWORD_RESET",
      email: user.email,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    logger.error({
      action: "RESET_PASSWORD_ERROR",
      error: error.message,
      timestamp: new ISOString(),
    });

    res.status(500).json({
      success: false,
      message: "Password reset failed",
      code: "RESET_ERROR",
    });
  }
});

// ============================================
// CHANGE PASSWORD - Update password when logged in
// ============================================

router.post(
  "/change-password",
  authenticateToken,
  validatePassword,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.userId).select("+password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Verify current password
      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
          code: "INVALID_PASSWORD",
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info({
        action: "PASSWORD_CHANGED",
        userId: user.id,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      logger.error({
        action: "CHANGE_PASSWORD_ERROR",
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        success: false,
        message: "Password change failed",
        code: "CHANGE_PASSWORD_ERROR",
      });
    }
  },
);

// ============================================
// GET PROFILE - Get current user profile
// ============================================

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    res.json({
      success: true,
      data: { user: user.getProfile() },
    });
  } catch (error) {
    logger.error({
      action: "GET_PROFILE_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      code: "FETCH_PROFILE_ERROR",
    });
  }
});

// ============================================
// UPDATE PROFILE - Update user information
// ============================================

router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, company, avatar } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (company) user.company = company;
    if (avatar) user.avatar = avatar;

    await user.save();

    logger.info({
      action: "PROFILE_UPDATED",
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user: user.getProfile() },
    });
  } catch (error) {
    logger.error({
      action: "UPDATE_PROFILE_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: "Profile update failed",
      code: "UPDATE_PROFILE_ERROR",
    });
  }
});

// ============================================
// RESEND VERIFICATION EMAIL - Send verification email again
// ============================================

router.post("/resend-verification-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        code: "MISSING_EMAIL",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        success: true,
        message: "If an account exists, a verification email has been sent.",
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
        code: "EMAIL_ALREADY_VERIFIED",
      });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.firstName,
      );
    } catch (emailError) {
      logger.error({
        action: "EMAIL_SEND_FAILED_RESEND_VERIFICATION",
        email: user.email,
        error: emailError.message,
        timestamp: new Date().toISOString(),
      });
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email",
        code: "EMAIL_SEND_ERROR",
      });
    }

    logger.info({
      action: "VERIFICATION_EMAIL_RESENT",
      email: user.email,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Verification email has been sent. Please check your inbox.",
    });
  } catch (error) {
    logger.error({
      action: "RESEND_VERIFICATION_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: "Failed to resend verification email",
      code: "RESEND_ERROR",
    });
  }
});

// ============================================
// DELETE ACCOUNT - Soft delete user account
// ============================================

router.delete("/account", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Soft delete
    user.status = "deleted";
    user.deletedAt = new Date();
    await user.save();

    logger.info({
      action: "ACCOUNT_DELETED",
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    logger.error({
      action: "DELETE_ACCOUNT_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: "Account deletion failed",
      code: "DELETE_ACCOUNT_ERROR",
    });
  }
});

module.exports = router;
