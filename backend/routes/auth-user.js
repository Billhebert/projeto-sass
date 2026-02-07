/**
 * Authentication Routes
 * User registration, login, password reset, and email verification
 */

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../db/models/User");
const logger = require("../logger");
const emailService = require("../services/email");
const { authenticateToken } = require("../middleware/auth");
const { validateEmail, validatePassword } = require("../middleware/validation");

// ============================================================================
// CORE HELPERS - Used across all endpoints
// ============================================================================

/**
 * Handle and log errors with consistent response format
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} message - Error message to send to client
 * @param {Error} error - Original error object
 * @param {Object} context - Additional logging context
 */
const handleError = (res, statusCode = 500, message, error = null, context = {}) => {
  logger.error({
    action: context.action || 'UNKNOWN_ERROR',
    error: error?.message || message,
    statusCode,
    timestamp: new Date().toISOString(),
    ...context,
  });

  const response = {
    success: false,
    message,
  };
  if (context.code) response.code = context.code;
  if (error?.message && statusCode >= 500) response.error = error.message;
  res.status(statusCode).json(response);
};

/**
 * Send success response with consistent format
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = { success: true };
  if (message) response.message = message;
  if (data) response.data = data;
  res.status(statusCode).json(response);
};

/**
 * Send error response (for client errors)
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} code - Error code
 */
const sendErrorResponse = (res, statusCode, message, code) => {
  res.status(statusCode).json({
    success: false,
    message,
    code,
  });
};

// ============================================================================
// ROUTE-SPECIFIC HELPERS
// ============================================================================

/**
 * Create new user and generate verification token
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @returns {Promise<Object>} User and verification token
 */
const createNewUser = async (email, password, firstName, lastName) => {
  const user = new User({
    email,
    password,
    firstName: firstName || email.split("@")[0],
    lastName: lastName || "",
  });

  await user.save();

  const verificationToken = user.generateEmailVerificationToken();
  await user.save();

  return { user, verificationToken };
};

/**
 * Authenticate user credentials
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Authenticated user or null
 */
const authenticateCredentials = async (email, password) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) return null;
  if (user.isAccountLocked()) throw new Error("ACCOUNT_LOCKED");

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    await user.incrementLoginAttempts();
    return null;
  }

  if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");

  await user.resetLoginAttempts();
  return user;
};

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateJWTToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "dev_jwt_secret_min_32_characters_long_1234567890",
    { expiresIn: "24h" }
  );
};

/**
 * Update user login record
 * @param {Object} user - User object
 * @param {string} ipAddress - Client IP address
 */
const updateUserLoginRecord = async (user, ipAddress) => {
  user.lastLogin = new Date();
  user.lastLoginIP = ipAddress;
  await user.save();
};

/**
 * Verify email token and return hashed token
 * @param {string} token - Plain text token
 * @returns {string} Hashed token
 */
const hashEmailToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Find user by email verification token
 * @param {string} hashedToken - Hashed token
 * @returns {Promise<Object>} User or null
 */
const findUserByEmailToken = async (hashedToken) => {
  return User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() },
  });
};

/**
 * Find user by password reset token
 * @param {string} hashedToken - Hashed token
 * @returns {Promise<Object>} User or null
 */
const findUserByResetToken = async (hashedToken) => {
  return User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });
};

/**
 * Send verification email with error handling
 * @param {string} email - User email
 * @param {string} token - Verification token
 * @param {string} firstName - User first name
 * @param {boolean} throwOnError - Throw error if email fails
 */
const sendVerificationEmailSafe = async (email, token, firstName, throwOnError = false) => {
  try {
    await emailService.sendVerificationEmail(email, token, firstName);
    return true;
  } catch (emailError) {
    logger.error({
      action: "EMAIL_SEND_FAILED",
      email,
      error: emailError.message,
      timestamp: new Date().toISOString(),
    });
    if (throwOnError) throw emailError;
    return false;
  }
};

/**
 * Send password reset email with error handling
 * @param {string} email - User email
 * @param {string} token - Reset token
 * @param {string} firstName - User first name
 * @param {boolean} throwOnError - Throw error if email fails
 */
const sendPasswordResetEmailSafe = async (email, token, firstName, throwOnError = false) => {
  try {
    await emailService.sendPasswordResetEmail(email, token, firstName);
    return true;
  } catch (emailError) {
    logger.error({
      action: "EMAIL_SEND_FAILED_PASSWORD_RESET",
      email,
      error: emailError.message,
      timestamp: new Date().toISOString(),
    });
    if (throwOnError) throw emailError;
    return false;
  }
};

// ============================================
// REGISTER - Create new user account
// ============================================

router.post("/register", validateEmail, validatePassword, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendErrorResponse(res, 409, "Email already registered", "EMAIL_EXISTS");
    }

    const { user, verificationToken } = await createNewUser(email, password, firstName, lastName);

    logger.info({
      action: "USER_REGISTERED",
      email: user.email,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    await sendVerificationEmailSafe(user.email, verificationToken, user.firstName);

    sendSuccess(
      res,
      {
        user: user.getProfile(),
        verificationRequired: true,
        emailSent: true,
      },
      "User registered successfully. Please verify your email.",
      201
    );
  } catch (error) {
    handleError(res, 500, "Registration failed", error, {
      action: "REGISTER_ERROR",
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
      return sendErrorResponse(res, 400, "Email and password are required", "MISSING_CREDENTIALS");
    }

    try {
      const user = await authenticateCredentials(email, password);

      if (!user) {
        return sendErrorResponse(res, 401, "Invalid email or password", "INVALID_CREDENTIALS");
      }

      await updateUserLoginRecord(user, req.ip);
      const token = generateJWTToken(user);

      logger.info({
        action: "USER_LOGIN",
        email: user.email,
        userId: user.id,
        ipAddress: req.ip,
        timestamp: new Date().toISOString(),
      });

      sendSuccess(
        res,
        {
          user: user.getProfile(),
          token,
          expiresIn: "24h",
        },
        "Login successful"
      );
    } catch (authError) {
      if (authError.message === "ACCOUNT_LOCKED") {
        return sendErrorResponse(
          res,
          429,
          "Account locked due to multiple failed login attempts. Try again in 30 minutes.",
          "ACCOUNT_LOCKED"
        );
      }
      if (authError.message === "EMAIL_NOT_VERIFIED") {
        return sendErrorResponse(
          res,
          403,
          "Please verify your email before logging in",
          "EMAIL_NOT_VERIFIED"
        );
      }
      throw authError;
    }
  } catch (error) {
    handleError(res, 500, "Login failed", error, {
      action: "LOGIN_ERROR",
      code: "LOGIN_ERROR",
    });
  }
});

// ============================================
// LOGOUT - Revoke current session
// ============================================

router.post("/logout", authenticateToken, async (req, res) => {
  try {
    logger.info({
      action: "USER_LOGOUT",
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    sendSuccess(res, null, "Logged out successfully");
  } catch (error) {
    handleError(res, 500, "Logout failed", error, {
      action: "LOGOUT_ERROR",
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

    if (!token) {
      return sendErrorResponse(res, 400, "Verification token is required", "MISSING_TOKEN");
    }

    const hashedToken = hashEmailToken(token);
    const foundUser = await findUserByEmailToken(hashedToken);

    if (!foundUser) {
      return sendErrorResponse(res, 400, "Invalid or expired verification token", "INVALID_TOKEN");
    }

    foundUser.verifyEmail(token);
    await foundUser.save();

    logger.info({
      action: "EMAIL_VERIFIED",
      email: foundUser.email,
      userId: foundUser.id,
      timestamp: new Date().toISOString(),
    });

    sendSuccess(res, { user: foundUser.getProfile() }, "Email verified successfully");
  } catch (error) {
    handleError(res, 500, "Email verification failed", error, {
      action: "VERIFY_EMAIL_ERROR",
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
      return sendErrorResponse(res, 400, "Email is required", "MISSING_EMAIL");
    }

    const user = await User.findOne({ email });

    // Don't reveal if email exists (security)
    if (!user) {
      return sendSuccess(
        res,
        null,
        "If an account exists, password reset instructions have been sent."
      );
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    logger.info({
      action: "PASSWORD_RESET_REQUESTED",
      email: user.email,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    await sendPasswordResetEmailSafe(user.email, resetToken, user.firstName);

    sendSuccess(res, null, "If an account exists, password reset instructions have been sent.");
  } catch (error) {
    handleError(res, 500, "Password reset request failed", error, {
      action: "FORGOT_PASSWORD_ERROR",
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

    const hashedToken = User.hashToken(token);
    const user = await findUserByResetToken(hashedToken);

    if (!user) {
      return sendErrorResponse(res, 400, "Invalid or expired reset token", "INVALID_TOKEN");
    }

    if (!user.verifyPasswordResetToken(token)) {
      return sendErrorResponse(res, 400, "Invalid reset token", "INVALID_TOKEN");
    }

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

    sendSuccess(res, null, "Password reset successfully");
  } catch (error) {
    handleError(res, 500, "Password reset failed", error, {
      action: "RESET_PASSWORD_ERROR",
      code: "RESET_ERROR",
    });
  }
});

// ============================================
// CHANGE PASSWORD - Update password when logged in
// ============================================

router.post("/change-password", authenticateToken, validatePassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId).select("+password");

    if (!user) {
      return sendErrorResponse(res, 404, "User not found", "USER_NOT_FOUND");
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return sendErrorResponse(res, 401, "Current password is incorrect", "INVALID_PASSWORD");
    }

    user.password = newPassword;
    await user.save();

    logger.info({
      action: "PASSWORD_CHANGED",
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    sendSuccess(res, null, "Password changed successfully");
  } catch (error) {
    handleError(res, 500, "Password change failed", error, {
      action: "CHANGE_PASSWORD_ERROR",
      code: "CHANGE_PASSWORD_ERROR",
    });
  }
});

// ============================================
// GET PROFILE - Get current user profile
// ============================================

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.userId });

    if (!user) {
      return sendErrorResponse(res, 404, "User not found", "USER_NOT_FOUND");
    }

    sendSuccess(res, { user: user.getProfile() });
  } catch (error) {
    handleError(res, 500, "Failed to fetch profile", error, {
      action: "GET_PROFILE_ERROR",
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
      return sendErrorResponse(res, 404, "User not found", "USER_NOT_FOUND");
    }

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

    sendSuccess(res, { user: user.getProfile() }, "Profile updated successfully");
  } catch (error) {
    handleError(res, 500, "Profile update failed", error, {
      action: "UPDATE_PROFILE_ERROR",
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
      return sendErrorResponse(res, 400, "Email is required", "MISSING_EMAIL");
    }

    const user = await User.findOne({ email });

    if (!user) {
      return sendSuccess(res, null, "If an account exists, a verification email has been sent.");
    }

    if (user.emailVerified) {
      return sendErrorResponse(res, 400, "Email is already verified", "EMAIL_ALREADY_VERIFIED");
    }

    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    const emailSent = await sendVerificationEmailSafe(user.email, verificationToken, user.firstName, true);

    if (!emailSent) {
      return sendErrorResponse(res, 500, "Failed to send verification email", "EMAIL_SEND_ERROR");
    }

    logger.info({
      action: "VERIFICATION_EMAIL_RESENT",
      email: user.email,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    sendSuccess(res, null, "Verification email has been sent. Please check your inbox.");
  } catch (error) {
    handleError(res, 500, "Failed to resend verification email", error, {
      action: "RESEND_VERIFICATION_ERROR",
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
      return sendErrorResponse(res, 404, "User not found", "USER_NOT_FOUND");
    }

    user.status = "deleted";
    user.deletedAt = new Date();
    await user.save();

    logger.info({
      action: "ACCOUNT_DELETED",
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    sendSuccess(res, null, "Account deleted successfully");
  } catch (error) {
    handleError(res, 500, "Account deletion failed", error, {
      action: "DELETE_ACCOUNT_ERROR",
      code: "DELETE_ACCOUNT_ERROR",
    });
  }
});

module.exports = router;
