/**
 * OAuth 2.0 Authentication Routes for Mercado Livre Integration
 *
 * POST /api/auth/register            - Register new user
 * POST /api/auth/login               - Login user
 * POST /api/auth/ml-callback         - Trade authorization code for tokens
 * POST /api/auth/ml-refresh          - Refresh expired tokens
 * POST /api/auth/ml-logout           - Logout (revoke tokens)
 */

const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const router = express.Router();

// Models
const User = require("../db/models/User");
const logger = require("../logger");

// ML API Endpoints
const ML_AUTH_URL = "https://auth.mercadolibre.com/authorization";
const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
const ML_API_BASE = "https://api.mercadolibre.com";

// Database functions (will be implemented with actual DB)
const {
  saveAccount,
  getAccount,
  updateAccount,
  getAccountByUserId,
} = require("../db/accounts");

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: "Email, password, firstName, and lastName are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    // Create user (password will be hashed by pre-save middleware)
    const user = new User({
      email: email.toLowerCase(),
      password, // Pre-save hook will hash this
      firstName,
      lastName,
      emailVerified: false, // User must verify email
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Try to send verification email
    try {
      const emailService = require("../services/email");
      await emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.firstName,
      );
    } catch (emailError) {
      logger.error({
        action: "VERIFICATION_EMAIL_FAILED",
        email: user.email,
        error: emailError.message,
        timestamp: new Date().toISOString(),
      });
      // Continue even if email fails, user can resend later
    }

    // Return success but inform user they need to verify email
    return res.status(201).json({
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (error) {
    logger.error({
      action: "REGISTER_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      success: false,
      error: "Failed to register user",
    });
  }
});

/**
 * POST /api/auth/login
 * Login user with email and password
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" },
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to login",
    });
  }
});

/**
 * GET /api/auth/ml-login-url
 *
 * Get the Mercado Livre OAuth authorization URL
 * User should be redirected to this URL to authorize the app
 *
 * Response:
 * {
 *   authUrl: "https://auth.mercadolibre.com/authorization?..."
 * }
 */
router.get("/ml-login-url", (req, res) => {
  try {
    const CLIENT_ID = process.env.ML_CLIENT_ID;
    const REDIRECT_URI =
      process.env.ML_CALLBACK_URL ||
      "http://localhost:3011/api/auth/ml-callback";

    if (!CLIENT_ID) {
      return res.status(500).json({
        success: false,
        error: "ML_CLIENT_ID not configured",
      });
    }

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");

    // Store state in a simple way (in production, use sessions or database)
    // For now, we'll just pass it through

    const authUrl = `${ML_AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&platform_id=MLB&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

    return res.json({
      success: true,
      data: {
        authUrl,
      },
    });
  } catch (error) {
    console.error("Error generating ML auth URL:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate authorization URL",
    });
  }
});

/**
 * POST /api/auth/ml-oauth-url
 *
 * Generate OAuth authorization URL using user-provided credentials.
 * This allows users to provide their own App ID, Secret, and Redirect URI.
 *
 * Request body:
 * {
 *   clientId: string,      // User's Mercado Livre App ID
 *   clientSecret: string,  // User's Mercado Livre App Secret
 *   redirectUri: string    // OAuth redirect URI (e.g., http://localhost:5173/auth/callback)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     authUrl: "https://auth.mercadolibre.com/authorization?..."
 *   }
 * }
 */
router.post("/ml-oauth-url", (req, res) => {
  try {
    const { clientId, clientSecret, redirectUri } = req.body;

    // Validation
    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({
        success: false,
        error: "clientId, clientSecret, and redirectUri are required",
      });
    }

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");

    const authUrl = `${ML_AUTH_URL}?client_id=${encodeURIComponent(clientId)}&response_type=code&platform_id=MLB&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    return res.json({
      success: true,
      data: {
        authUrl,
        state, // Return state so client can verify callback
      },
    });
  } catch (error) {
    console.error("Error generating ML OAuth URL:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate authorization URL",
    });
  }
});

/**
 * POST /api/auth/ml-token-exchange
 *
 * Exchange authorization code for access and refresh tokens.
 * This is called from the OAuth callback page with user-provided credentials.
 *
 * Request body:
 * {
 *   code: string,          // Authorization code from Mercado Livre
 *   clientId: string,      // User's Mercado Livre App ID
 *   clientSecret: string,  // User's Mercado Livre App Secret
 *   redirectUri: string    // OAuth redirect URI (must match what was used for authUrl)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     accessToken: string,
 *     refreshToken: string,
 *     expiresIn: number
 *   }
 * }
 */
router.post("/ml-token-exchange", async (req, res) => {
  const { code, clientId, clientSecret, redirectUri } = req.body;

  try {
    // Validation
    if (!code || !clientId || !clientSecret || !redirectUri) {
      logger.warn({
        action: "TOKEN_EXCHANGE_INVALID_REQUEST",
        missingFields: {
          code: !code,
          clientId: !clientId,
          clientSecret: !clientSecret,
          redirectUri: !redirectUri,
        },
      });

      return res.status(400).json({
        success: false,
        error: "code, clientId, clientSecret, and redirectUri are required",
      });
    }

    logger.info({
      action: "TOKEN_EXCHANGE_START",
      clientId: clientId.substring(0, 8) + "***", // Log only first 8 chars for security
      redirectUri: redirectUri,
      timestamp: new Date().toISOString(),
    });

    // Exchange code for tokens using user-provided credentials
    const tokenResponse = await exchangeCodeForTokenWithCredentials(
      code,
      clientId,
      clientSecret,
      redirectUri,
    );

    if (!tokenResponse.access_token) {
      logger.error({
        action: "TOKEN_EXCHANGE_NO_ACCESS_TOKEN",
        clientId: clientId.substring(0, 8) + "***",
        responseKeys: Object.keys(tokenResponse),
      });

      return res.status(400).json({
        success: false,
        error: "Failed to exchange code for token",
        details: "Mercado Livre did not return an access token",
      });
    }

    logger.info({
      action: "TOKEN_EXCHANGE_SUCCESS",
      clientId: clientId.substring(0, 8) + "***",
      expiresIn: tokenResponse.expires_in,
      hasRefreshToken: !!tokenResponse.refresh_token,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      data: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
        tokenType: tokenResponse.token_type || "Bearer",
        userId: tokenResponse.user_id,
        scope: tokenResponse.scope,
        obtainedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({
      action: "TOKEN_EXCHANGE_ERROR",
      error: error.message,
      statusCode: error.response?.status,
      mlErrorData: error.response?.data,
      timestamp: new Date().toISOString(),
    });

    return res.status(error.response?.status || 500).json({
      success: false,
      error: "Failed to exchange code for token",
      details: error.response?.data?.error_description || error.message,
    });
  }
});

/**
 * GET /api/auth/ml-app-token
 *
 * Get access token using Client Credentials Flow (Server-to-Server)
 * This uses the app credentials (ID + Secret) to get a token
 *
 * Response:
 * {
 *   accessToken: "token_xxx",
 *   expiresIn: 21600,
 *   tokenType: "Bearer"
 * }
 */
router.get("/ml-app-token", async (req, res) => {
  try {
    const CLIENT_ID = process.env.ML_CLIENT_ID;
    const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.status(500).json({
        success: false,
        error: "ML_CLIENT_ID or ML_CLIENT_SECRET not configured",
      });
    }

    // Request token using Client Credentials flow
    const response = await axios.post(ML_TOKEN_URL, {
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    const { access_token, expires_in, token_type } = response.data;

    if (!access_token) {
      return res.status(400).json({
        success: false,
        error: "Failed to obtain access token from Mercado Livre",
      });
    }

    return res.json({
      success: true,
      data: {
        accessToken: access_token,
        expiresIn: expires_in, // usually 21600 seconds (6 hours)
        tokenType: token_type,
        obtainedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "Error getting ML app token:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      success: false,
      error: "Failed to get access token from Mercado Livre",
      details: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/auth/ml-callback
 *
 * Trade the authorization code for access and refresh tokens.
 * This is called after user authorizes the app on Mercado Livre.
 *
 * Can be used in two ways:
 * 1. With environment variables (default app credentials)
 * 2. With user-provided credentials (App ID, Secret, Redirect URI)
 *
 * Request body:
 * {
 *   code: string,            // Authorization code from ML
 *   state: string,           // State parameter to verify integrity
 *   clientId?: string,       // Optional: User's App ID
 *   clientSecret?: string,   // Optional: User's App Secret
 *   redirectUri?: string     // Optional: User's Redirect URI
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   account: {
 *     id: string,
 *     userId: number,
 *     nickname: string,
 *     email: string,
 *     accessToken: string,
 *     refreshToken: string,
 *     tokenExpiry: number
 *   }
 * }
 */
router.post("/ml-callback", async (req, res, next) => {
  try {
    const { code, state, clientId, clientSecret, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({
        error: "Missing authorization code",
        details: 'The "code" parameter is required',
      });
    }

    // Verify state (optional but recommended for CSRF protection)
    // For now, we'll accept any state
    console.log(
      `Processing ML callback with code: ${code.substring(0, 10)}...`,
    );

    // Step 1: Exchange code for tokens
    // Use provided credentials if available, otherwise use environment variables
    let tokenResponse;
    if (clientId && clientSecret && redirectUri) {
      tokenResponse = await exchangeCodeForTokenWithCredentials(
        code,
        clientId,
        clientSecret,
        redirectUri,
      );
    } else {
      tokenResponse = await exchangeCodeForToken(code);
    }

    if (!tokenResponse.access_token) {
      return res.status(400).json({
        error: "Failed to exchange code for token",
        details: "Mercado Livre did not return an access token",
      });
    }

    // Step 2: Get user information from ML
    const userInfo = await getUserInfo(tokenResponse.access_token);

    if (!userInfo.id) {
      return res.status(400).json({
        error: "Failed to get user information",
        details: "Could not retrieve user ID from Mercado Livre",
      });
    }

    // Step 3: Check if account already exists
    const existingAccount = await getAccountByUserId(userInfo.id);

    const accountId = existingAccount?.id || generateAccountId();
    const tokenExpiry = Date.now() + tokenResponse.expires_in * 1000;

    // Step 4: Save or update account
    // IMPORTANT: Save OAuth credentials (clientId, clientSecret, redirectUri) so that
    // the token-refresh job can automatically refresh tokens when they expire
    const account = {
      id: accountId,
      userId: userInfo.id,
      nickname: userInfo.nickname,
      email: userInfo.email,
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenExpiry: tokenExpiry,
      // Save OAuth credentials for automatic token refresh
      // These are required by token-refresh.js job to renew tokens
      clientId: clientId || process.env.ML_CLIENT_ID || null,
      clientSecret: clientSecret || process.env.ML_CLIENT_SECRET || null,
      redirectUri: redirectUri || process.env.ML_REDIRECT_URI || null,
      createdAt: existingAccount?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "connected",
    };

    if (existingAccount) {
      await updateAccount(accountId, account);
      console.log(`Updated existing account: ${accountId}`);
    } else {
      await saveAccount(account);
      console.log(`Created new account: ${accountId}`);
    }

    // Step 5: Return success response
    res.json({
      success: true,
      message: "OAuth token exchange completed successfully",
      account: {
        id: account.id,
        userId: account.userId,
        nickname: account.nickname,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        tokenExpiry: account.tokenExpiry,
        status: account.status,
      },
    });
  } catch (error) {
    console.error("OAuth callback error:", error.message);
    next(error);
  }
});

/**
 * POST /api/auth/ml-refresh
 *
 * Refresh an expired access token using the refresh token.
 *
 * Request body:
 * {
 *   accountId: string       // ID of the account to refresh
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   accessToken: string,
 *   tokenExpiry: number
 * }
 */
router.post("/ml-refresh", async (req, res, next) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        error: "Missing accountId",
        details: 'The "accountId" parameter is required',
      });
    }

    // Get account from database
    const account = await getAccount(accountId);

    if (!account) {
      return res.status(404).json({
        error: "Account not found",
        accountId,
      });
    }

    if (!account.refreshToken) {
      return res.status(400).json({
        error: "No refresh token available",
        details: "Account needs to be re-authenticated",
      });
    }

    console.log(`Refreshing token for account: ${accountId}`);

    // Step 1: Call ML API to refresh token
    // Use account's OAuth credentials if available, otherwise fall back to env vars
    const clientId = account.clientId || null;
    const clientSecret = account.clientSecret || null;

    const tokenResponse = await refreshToken(
      account.refreshToken,
      clientId,
      clientSecret,
    );

    if (!tokenResponse.access_token) {
      return res.status(400).json({
        error: "Failed to refresh token",
        details: "Mercado Livre did not return a new access token",
      });
    }

    // Step 2: Update account with new tokens
    const tokenExpiry = Date.now() + tokenResponse.expires_in * 1000;

    account.accessToken = tokenResponse.access_token;
    if (tokenResponse.refresh_token) {
      account.refreshToken = tokenResponse.refresh_token;
    }
    account.tokenExpiry = tokenExpiry;
    account.updatedAt = new Date().toISOString();

    await updateAccount(accountId, account);
    console.log(`Token refreshed for account: ${accountId}`);

    // Step 3: Return new token info
    res.json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: tokenResponse.access_token,
      tokenExpiry: tokenExpiry,
    });
  } catch (error) {
    console.error("Token refresh error:", error.message);
    next(error);
  }
});

/**
 * POST /api/auth/ml-logout
 *
 * Logout and revoke tokens for an account.
 *
 * Request body:
 * {
 *   accountId: string
 * }
 */
router.post("/ml-logout", async (req, res, next) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        error: "Missing accountId",
      });
    }

    const account = await getAccount(accountId);

    if (!account) {
      return res.status(404).json({
        error: "Account not found",
      });
    }

    console.log(`Logging out account: ${accountId}`);

    // Update account status to disconnected
    account.status = "disconnected";
    account.accessToken = null;
    account.refreshToken = null;
    account.tokenExpiry = null;
    account.updatedAt = new Date().toISOString();

    await updateAccount(accountId, account);

    res.json({
      success: true,
      message: "Account disconnected successfully",
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    next(error);
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Exchange authorization code for tokens using environment variables
 */
async function exchangeCodeForToken(code) {
  try {
    const response = await axios.post(
      ML_TOKEN_URL,
      {
        grant_type: "authorization_code",
        client_id: process.env.ML_CLIENT_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.ML_REDIRECT_URI,
      },
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Token exchange failed:",
      error.response?.data || error.message,
    );
    throw new Error(`Failed to exchange code for token: ${error.message}`);
  }
}

/**
 * Exchange authorization code for tokens using provided credentials
 * Used when user provides their own App ID, Secret, and Redirect URI
 */
/**
 * Exchange authorization code for access and refresh tokens
 * Using user-provided credentials
 *
 * Flow:
 * 1. Client provides: code, clientId, clientSecret, redirectUri
 * 2. We send to Mercado Libre OAuth endpoint
 * 3. Mercado Libre returns: access_token, refresh_token, expires_in, user_id
 * 4. We return tokens to client
 *
 * @param {string} code - Authorization code from Mercado Livre
 * @param {string} clientId - User's Mercado Livre App ID
 * @param {string} clientSecret - User's Mercado Livre App Secret
 * @param {string} redirectUri - Redirect URI (must match what was used in authUrl)
 * @returns {Promise<Object>} Token response from Mercado Livre
 */
async function exchangeCodeForTokenWithCredentials(
  code,
  clientId,
  clientSecret,
  redirectUri,
) {
  try {
    logger.info({
      action: "EXCHANGE_CODE_START",
      clientId: clientId.substring(0, 8) + "***",
      redirectUri: redirectUri,
    });

    // Make request to Mercado Livre OAuth endpoint
    const response = await axios.post(
      ML_TOKEN_URL,
      {
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000, // 10 second timeout
      },
    );

    logger.info({
      action: "EXCHANGE_CODE_SUCCESS",
      clientId: clientId.substring(0, 8) + "***",
      userId: response.data.user_id,
      expiresIn: response.data.expires_in,
      hasRefreshToken: !!response.data.refresh_token,
    });

    return response.data;
  } catch (error) {
    logger.error({
      action: "EXCHANGE_CODE_ERROR",
      clientId: clientId.substring(0, 8) + "***",
      error: error.message,
      statusCode: error.response?.status,
      mlError: error.response?.data?.error,
      mlErrorDescription: error.response?.data?.error_description,
    });

    throw error;
  }
}

/**
 * Refresh an access token using refresh token
 *
 * Flow:
 * 1. Client provides: old refresh token
 * 2. We send to Mercado Libre OAuth endpoint with app credentials
 * 3. Mercado Libre returns: new access_token, new refresh_token, expires_in
 * 4. We return new tokens (refresh token is single-use, new one issued)
 *
 * @param {string} refreshTokenValue - Current refresh token
 * @param {string} clientId - Optional client ID (uses env var if not provided)
 * @param {string} clientSecret - Optional client secret (uses env var if not provided)
 * @returns {Promise<Object>} New token response from Mercado Livre
 */
async function refreshToken(
  refreshTokenValue,
  clientId = null,
  clientSecret = null,
) {
  try {
    // Use provided credentials or fall back to environment variables
    const CLIENT_ID = clientId || process.env.ML_CLIENT_ID;
    const CLIENT_SECRET = clientSecret || process.env.ML_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error(
        "Client credentials are required for token refresh (either from account or environment variables)",
      );
    }

    logger.info({
      action: "REFRESH_TOKEN_START",
      clientId: CLIENT_ID.substring(0, 8) + "***",
      usingAccountCredentials: !!(clientId && clientSecret),
    });

    const response = await axios.post(
      ML_TOKEN_URL,
      {
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshTokenValue,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      },
    );

    logger.info({
      action: "REFRESH_TOKEN_SUCCESS",
      expiresIn: response.data.expires_in,
      hasNewRefreshToken: !!response.data.refresh_token,
    });

    return response.data;
  } catch (error) {
    logger.error({
      action: "REFRESH_TOKEN_ERROR",
      error: error.message,
      statusCode: error.response?.status,
      mlError: error.response?.data?.error,
      mlErrorDescription: error.response?.data?.error_description,
    });

    throw error;
  }
}

/**
 * Get user information from Mercado Livre
 */
async function getUserInfo(accessToken) {
  try {
    const response = await axios.get(`${ML_API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Get user info failed:",
      error.response?.data || error.message,
    );
    throw new Error(`Failed to get user information: ${error.message}`);
  }
}

/**
 * Generate a unique account ID
 */
function generateAccountId() {
  return `ml_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
}

/**
 * POST /api/auth/verify-email
 * Verify user email with token
 *
 * Request body:
 * {
 *   token: string  // Email verification token sent to email
 * }
 */
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Verification token is required",
      });
    }

    // Find user with this verification token
    const user = await User.findOne({
      emailVerificationToken: user ? user.hashToken(token) : null,
    });

    if (!user) {
      // User not found - hash the token and search again
      const User = require("../db/models/User");
      const hashedToken = require("crypto")
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const foundUser = await User.findOne({
        emailVerificationToken: hashedToken,
      });

      if (!foundUser) {
        return res.status(404).json({
          success: false,
          error: "Invalid or expired verification token",
        });
      }

      // Check if token is still valid
      if (foundUser.emailVerificationExpires < new Date()) {
        return res.status(400).json({
          success: false,
          error: "Verification token has expired",
          code: "TOKEN_EXPIRED",
        });
      }

      // Verify email
      foundUser.emailVerified = true;
      foundUser.emailVerificationToken = null;
      foundUser.emailVerificationExpires = null;
      await foundUser.save();

      logger.info({
        action: "EMAIL_VERIFIED",
        userId: foundUser.id,
        email: foundUser.email,
        timestamp: new Date().toISOString(),
      });

      // Generate JWT token
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET environment variable is required");
      }

      const jwtToken = jwt.sign(
        { userId: foundUser.id, email: foundUser.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      return res.status(200).json({
        success: true,
        message: "Email verified successfully!",
        data: {
          user: {
            id: foundUser.id,
            email: foundUser.email,
            firstName: foundUser.firstName,
            lastName: foundUser.lastName,
            emailVerified: foundUser.emailVerified,
          },
          token: jwtToken,
        },
      });
    }
  } catch (error) {
    logger.error({
      action: "EMAIL_VERIFICATION_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      success: false,
      error: "Failed to verify email",
    });
  }
});

/**
 * POST /api/auth/resend-verification-email
 * Resend verification email to user
 *
 * Request body:
 * {
 *   email: string  // User email address
 * }
 */
router.post("/resend-verification-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists for security
      return res.status(400).json({
        success: false,
        error:
          "If this email is registered, you will receive a verification link shortly",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: "Email is already verified",
      });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    try {
      const emailService = require("../services/email");
      await emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.firstName,
      );

      logger.info({
        action: "VERIFICATION_EMAIL_RESENT",
        email: user.email,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({
        success: true,
        message: "Verification email sent! Please check your inbox.",
      });
    } catch (emailError) {
      logger.error({
        action: "RESEND_VERIFICATION_EMAIL_FAILED",
        email: user.email,
        error: emailError.message,
        timestamp: new Date().toISOString(),
      });
      return res.status(500).json({
        success: false,
        error: "Failed to send verification email. Please try again later.",
      });
    }
  } catch (error) {
    logger.error({
      action: "RESEND_VERIFICATION_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      success: false,
      error: "Failed to resend verification email",
    });
  }
});

/**
 * GET /api/auth/email-status/:email
 * Check if email is verified
 */
router.get("/email-status/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });

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
        emailVerified: user.emailVerified,
        emailVerificationExpires: user.emailVerificationExpires,
      },
    });
  } catch (error) {
    logger.error({
      action: "EMAIL_STATUS_ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      success: false,
      error: "Failed to check email status",
    });
  }
});

module.exports = router;
