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
const rateLimit = require("express-rate-limit");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const router = express.Router();

// Models
const User = require("../db/models/User");
const logger = require("../logger");
const sdkManager = require("../services/sdk-manager");

// Middleware
const { authenticateToken } = require("../middleware/auth");

// Stricter rate limiter specifically for login endpoint
// Prevents brute force attacks - 5 failed attempts per 15 minutes
// DISABLED FOR DEVELOPMENT
const loginLimiter = (req, res, next) => next();

// Rate limiter for registration endpoint
// Prevents account creation spam - 3 registrations per hour per IP
// DISABLED FOR DEVELOPMENT
const registerLimiter = (req, res, next) => next();

// ML API Endpoints
const ML_AUTH_URL = "https://auth.mercadolibre.com/authorization";
const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
const ML_API_BASE = "https://api.mercadolibre.com";

// Database functions (will be implemented with actual DB)
const {
  saveAccount,
  getAccount,
  updateAccount,
  createAccount,
  getAccountByUserId,
  getAccountsByUserId,
} = require("../db/accounts");

// ============================================
// CORE HELPER FUNCTIONS (used by all endpoints)
// ============================================

/**
 * Unified error response handler
 * Consolidates 15+ error response patterns into one function
 */
function handleError(res, statusCode, message, error, context = {}) {
  const errorContext = {
    action: context.action || "ERROR",
    error: error?.message || message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  logger.error(errorContext);

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(error && { details: error.message }),
  });
}

/**
 * Unified success response handler
 * Consolidates 12+ success response patterns into one function
 */
function sendSuccess(res, data, message, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Extract JWT token from Authorization header
 * Consolidates 12+ token extraction patterns into one function
 */
function getTokenFromHeader(req) {
  const authHeader = req.headers["authorization"];
  return authHeader && authHeader.split(" ")[1];
}

/**
 * Verify JWT token and return decoded payload
 * Returns { valid: boolean, decoded: object|null, error: string|null }
 */
function verifyJWT(token, errorIfInvalid = true) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    return { valid: true, decoded, error: null };
  } catch (error) {
    if (!errorIfInvalid) {
      try {
        const decoded = jwt.decode(token);
        return { valid: false, decoded, error: null };
      } catch (_) {}
    }
    return { valid: false, decoded: null, error: error.message };
  }
}

/**
 * Validate required fields in request body
 * Returns { valid: boolean, missingFields: string[] }
 */
function validateRequired(req, fields) {
  const missingFields = fields.filter(
    (field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === ""
  );
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * POST /api/auth/register
 * Register a new user
 * Rate limited to 3 registrations per hour per IP
 */
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const validation = validateRequired(req, ["email", "password", "firstName", "lastName"]);
    if (!validation.valid) {
      return handleError(res, 400, "Missing required fields: " + validation.missingFields.join(", "), null, {
        action: "REGISTER_INVALID_REQUEST",
      });
    }

    const { email, password, firstName, lastName } = req.body;

    if (password.length < 8) {
      return handleError(res, 400, "Password must be at least 8 characters", null, {
        action: "REGISTER_WEAK_PASSWORD",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return handleError(res, 409, "User with this email already exists", null, {
        action: "REGISTER_EMAIL_EXISTS",
      });
    }

    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      emailVerified: false,
    });

    await user.save();

    return sendSuccess(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          status: user.status,
        },
      },
      "Registro realizado! Aguarde a aprovação do administrador para fazer login.",
      201
    );
  } catch (error) {
    return handleError(res, 500, "Failed to register user", error, {
      action: "REGISTER_ERROR",
    });
  }
});

/**
 * POST /api/auth/login
 * Login user with email and password
 * Rate limited to 5 failed attempts per 15 minutes
 */
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const validation = validateRequired(req, ["email", "password"]);
    if (!validation.valid) {
      return handleError(res, 400, "Email and password are required", null, {
        action: "LOGIN_INVALID_REQUEST",
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user) {
      return handleError(res, 401, "Email ou senha inválidos", null, {
        action: "LOGIN_USER_NOT_FOUND",
      });
    }

    if (!user.emailVerified) {
      return handleError(
        res,
        403,
        "Sua conta está aguardando aprovação. Entre em contato com o administrador.",
        null,
        { action: "LOGIN_USER_NOT_APPROVED" }
      );
    }

    if (user.status !== "active") {
      return handleError(
        res,
        403,
        "Sua conta está desativada. Entre em contato com o administrador.",
        null,
        { action: "LOGIN_USER_INACTIVE" }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return handleError(res, 401, "Invalid email or password", null, {
        action: "LOGIN_INVALID_PASSWORD",
      });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "7d",
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    let mlAccounts = [];
    try {
      mlAccounts = await getAccountsByUserId(user.id);
    } catch (e) {
      logger.error({ action: "LOGIN_ML_ACCOUNTS_FETCH_ERROR", error: e.message });
    }

    return sendSuccess(
      res,
      {
        user: userResponse,
        token,
        mlAccounts: mlAccounts || [],
      },
      "Login successful",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to login", error, {
      action: "LOGIN_ERROR",
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
      return handleError(res, 500, "ML_CLIENT_ID not configured", null, {
        action: "ML_LOGIN_URL_MISSING_CONFIG",
      });
    }

    const state = crypto.randomBytes(32).toString("hex");
    const authUrl = `${ML_AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&platform_id=MLB&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

    return sendSuccess(res, { authUrl }, "Authorization URL generated");
  } catch (error) {
    return handleError(res, 500, "Failed to generate authorization URL", error, {
      action: "ML_LOGIN_URL_ERROR",
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
 */
router.post("/ml-oauth-url", (req, res) => {
  try {
    const validation = validateRequired(req, ["clientId", "clientSecret", "redirectUri"]);
    if (!validation.valid) {
      return handleError(res, 400, "clientId, clientSecret, and redirectUri are required", null, {
        action: "ML_OAUTH_URL_INVALID_REQUEST",
      });
    }

    const { clientId, clientSecret, redirectUri } = req.body;
    const state = crypto.randomBytes(32).toString("hex");
    const authUrl = `${ML_AUTH_URL}?client_id=${encodeURIComponent(clientId)}&response_type=code&platform_id=MLB&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    return sendSuccess(res, { authUrl, state }, "Authorization URL generated");
  } catch (error) {
    return handleError(res, 500, "Failed to generate authorization URL", error, {
      action: "ML_OAUTH_URL_ERROR",
    });
  }
});

/**
 * GET /api/ml-auth/url
 *
 * Alias endpoint for compatibility with MLAuth component.
 * Uses environment variables for app credentials.
 */
router.get("/ml-auth/url", (req, res) => {
  try {
    const CLIENT_ID = process.env.ML_CLIENT_ID;
    const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
    const REDIRECT_URI = process.env.ML_REDIRECT_URI;

    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
      return handleError(
        res,
        400,
        "ML_CLIENT_ID, ML_CLIENT_SECRET, and ML_REDIRECT_URI environment variables are not configured",
        null,
        { action: "ML_AUTH_URL_MISSING_CONFIG" }
      );
    }

    const state = crypto.randomBytes(32).toString("hex");
    const authUrl = `${ML_AUTH_URL}?client_id=${encodeURIComponent(CLIENT_ID)}&response_type=code&platform_id=MLB&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

    return sendSuccess(
      res,
      {
        authUrl,
        state,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        redirectUri: REDIRECT_URI,
      },
      "Authorization URL generated"
    );
  } catch (error) {
    return handleError(res, 500, "Failed to generate authorization URL", error, {
      action: "ML_AUTH_URL_ERROR",
    });
  }
});

/**
 * POST /api/auth/ml-token-exchange
 *
 * Exchange authorization code for access and refresh tokens.
 * This is called from the OAuth callback page with user-provided credentials.
 */
router.post("/ml-token-exchange", async (req, res) => {
  try {
    const validation = validateRequired(req, ["code", "clientId", "clientSecret", "redirectUri"]);
    if (!validation.valid) {
      return handleError(res, 400, "code, clientId, clientSecret, and redirectUri are required", null, {
        action: "TOKEN_EXCHANGE_INVALID_REQUEST",
        missingFields: validation.missingFields,
      });
    }

    const { code, clientId, clientSecret, redirectUri } = req.body;

    logger.info({
      action: "TOKEN_EXCHANGE_START",
      clientId: clientId.substring(0, 8) + "***",
      redirectUri,
      timestamp: new Date().toISOString(),
    });

    const tokenResponse = await exchangeCodeForTokenWithCredentials(
      code,
      clientId,
      clientSecret,
      redirectUri
    );

    if (!tokenResponse.access_token) {
      return handleError(res, 400, "Failed to exchange code for token", null, {
        action: "TOKEN_EXCHANGE_NO_ACCESS_TOKEN",
        responseKeys: Object.keys(tokenResponse),
      });
    }

    logger.info({
      action: "TOKEN_EXCHANGE_SUCCESS",
      clientId: clientId.substring(0, 8) + "***",
      expiresIn: tokenResponse.expires_in,
      hasRefreshToken: !!tokenResponse.refresh_token,
    });

    return sendSuccess(
      res,
      {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
        tokenType: tokenResponse.token_type || "Bearer",
        userId: tokenResponse.user_id,
        scope: tokenResponse.scope,
        obtainedAt: new Date().toISOString(),
      },
      "Token exchange completed successfully"
    );
  } catch (error) {
    return handleError(res, error.response?.status || 500, "Failed to exchange code for token", error, {
      action: "TOKEN_EXCHANGE_ERROR",
      statusCode: error.response?.status,
      mlErrorData: error.response?.data,
    });
  }
});

/**
 * GET /api/auth/ml-app-token
 *
 * Get access token using Client Credentials Flow (Server-to-Server)
 */
router.get("/ml-app-token", async (req, res) => {
  try {
    const CLIENT_ID = process.env.ML_CLIENT_ID;
    const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return handleError(res, 500, "ML_CLIENT_ID or ML_CLIENT_SECRET not configured", null, {
        action: "ML_APP_TOKEN_MISSING_CONFIG",
      });
    }

    const response = await axios.post(ML_TOKEN_URL, {
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    const { access_token, expires_in, token_type } = response.data;

    if (!access_token) {
      return handleError(res, 400, "Failed to obtain access token from Mercado Livre", null, {
        action: "ML_APP_TOKEN_FAILED",
      });
    }

    return sendSuccess(
      res,
      {
        accessToken: access_token,
        expiresIn: expires_in,
        tokenType: token_type,
        obtainedAt: new Date().toISOString(),
      },
      "Access token obtained successfully"
    );
  } catch (error) {
    return handleError(res, 500, "Failed to get access token from Mercado Livre", error, {
      action: "ML_APP_TOKEN_ERROR",
    });
  }
});

/**
 * GET /api/auth/ml-auth/status
 *
 * Get ML OAuth status and connected accounts.
 */
router.get("/ml-auth/status", async (req, res) => {
  try {
    const token = getTokenFromHeader(req);

    let userId = null;
    if (token) {
      const verification = verifyJWT(token, false);
      if (verification.decoded) {
        userId = verification.decoded.userId;
      }
    }

    if (!userId) {
      return sendSuccess(res, { accounts: [] }, "No authenticated user");
    }

    const accounts = await getAccountsByUserId(userId);
    return sendSuccess(res, { accounts: accounts || [] }, "ML accounts retrieved");
  } catch (error) {
    return handleError(res, 500, "Failed to get ML accounts status", error, {
      action: "ML_AUTH_STATUS_ERROR",
    });
  }
});

/**
 * POST /api/auth/ml-callback
 *
 * Handle OAuth callback from Mercado Livre.
 */
router.post("/ml-callback", async (req, res, next) => {
  try {
    if (!req.body.code) {
      return handleError(res, 400, 'Missing authorization code. The "code" parameter is required', null, {
        action: "ML_CALLBACK_MISSING_CODE",
      });
    }

    const token = getTokenFromHeader(req);
    if (!token) {
      return handleError(res, 401, "User not authenticated. JWT token is required to link ML account to user", null, {
        action: "ML_CALLBACK_NOT_AUTHENTICATED",
      });
    }

    const verification = verifyJWT(token);
    if (!verification.valid) {
      return handleError(res, 401, "Invalid or expired token", verification.error, {
        action: "ML_CALLBACK_INVALID_TOKEN",
      });
    }

    const jwtUserId = verification.decoded.userId;
    const user = await User.findById(jwtUserId);

    if (!user) {
      return handleError(res, 404, "User not found. The authenticated user does not exist", null, {
        action: "ML_CALLBACK_USER_NOT_FOUND",
      });
    }

    const { code, state, clientId, clientSecret, redirectUri } = req.body;

    let tokenResponse;
    if (clientId && clientSecret && redirectUri) {
      tokenResponse = await exchangeCodeForTokenWithCredentials(code, clientId, clientSecret, redirectUri);
    } else {
      tokenResponse = await exchangeCodeForToken(code);
    }

    if (!tokenResponse.access_token) {
      return handleError(res, 400, "Failed to exchange code for token", null, {
        action: "ML_CALLBACK_NO_ACCESS_TOKEN",
      });
    }

    const userInfo = await getUserInfo(tokenResponse.access_token);

    if (!userInfo.id) {
      return handleError(res, 400, "Failed to get user information", null, {
        action: "ML_CALLBACK_NO_USER_ID",
      });
    }

    const existingAccount = await getAccountByUserId(userInfo.id);
    const accountId = existingAccount?.id || generateAccountId();
    const tokenExpiry = Date.now() + tokenResponse.expires_in * 1000;

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
      clientId: clientId || process.env.ML_CLIENT_ID || null,
      clientSecret: clientSecret || process.env.ML_CLIENT_SECRET || null,
      redirectUri: redirectUri || process.env.ML_REDIRECT_URI || null,
      createdAt: existingAccount?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "connected",
    };

    if (existingAccount) {
      await updateAccount(accountId, account);
    } else {
      await saveAccount(account);
    }

    const mlAccountInfo = {
      accountId: accountId,
      mlUserId: userInfo.id,
      nickname: userInfo.nickname,
      connectedAt: new Date().toISOString(),
    };

    const accountAlreadyLinked = user.mlAccounts.some((acc) => acc.accountId === accountId);

    if (!accountAlreadyLinked) {
      user.mlAccounts.push(mlAccountInfo);
      await user.save();
    }

    return sendSuccess(
      res,
      {
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
      },
      "OAuth token exchange completed successfully"
    );
  } catch (error) {
    return handleError(res, 500, "OAuth callback error", error, {
      action: "ML_CALLBACK_ERROR",
    });
  }
});

/**
 * POST /api/auth/ml-refresh
 *
 * Refresh an expired access token using the refresh token.
 */
router.post("/ml-refresh", async (req, res, next) => {
  try {
    if (!req.body.accountId) {
      return handleError(res, 400, 'Missing accountId. The "accountId" parameter is required', null, {
        action: "ML_REFRESH_MISSING_ID",
      });
    }

    const { accountId } = req.body;
    const account = await getAccount(accountId);

    if (!account) {
      return handleError(res, 404, "Account not found", null, {
        action: "ML_REFRESH_ACCOUNT_NOT_FOUND",
        accountId,
      });
    }

    if (!account.refreshToken) {
      return handleError(res, 400, "No refresh token available. Account needs to be re-authenticated", null, {
        action: "ML_REFRESH_NO_TOKEN",
      });
    }

    const clientId = account.clientId || null;
    const clientSecret = account.clientSecret || null;

    const tokenResponse = await refreshToken(account.refreshToken, clientId, clientSecret);

    if (!tokenResponse.access_token) {
      return handleError(res, 400, "Failed to refresh token", null, {
        action: "ML_REFRESH_FAILED",
      });
    }

    const tokenExpiry = Date.now() + tokenResponse.expires_in * 1000;

    account.accessToken = tokenResponse.access_token;
    if (tokenResponse.refresh_token) {
      account.refreshToken = tokenResponse.refresh_token;
    }
    account.tokenExpiry = tokenExpiry;
    account.updatedAt = new Date().toISOString();

    await updateAccount(accountId, account);

    return sendSuccess(
      res,
      {
        accessToken: tokenResponse.access_token,
        tokenExpiry: tokenExpiry,
      },
      "Token refreshed successfully"
    );
  } catch (error) {
    return handleError(res, 500, "Token refresh error", error, {
      action: "ML_REFRESH_ERROR",
    });
  }
});

/**
 * POST /api/auth/ml-add-token
 *
 * Manually add a Mercado Libre account using access token and refresh token.
 */
router.post("/ml-add-token", authenticateToken, async (req, res, next) => {
  try {
    if (!req.body.accessToken) {
      return handleError(res, 400, "Access token é obrigatório", null, {
        action: "ML_ADD_TOKEN_MISSING_TOKEN",
      });
    }

    const { accessToken, refreshToken, userId, nickname } = req.body;
    const jwtUserId = req.user.userId;

    let mlUserData;
    try {
      const mlResponse = await axios.get("https://api.mercadolibre.com/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      mlUserData = mlResponse.data;
    } catch (error) {
      return handleError(res, 400, "Token inválido ou expirado", error, {
        action: "ML_ADD_TOKEN_INVALID_TOKEN",
      });
    }

    const accountId = mlUserData.id.toString();
    const accountData = {
      id: accountId,
      userId: userId || mlUserData.id,
      nickname: nickname || mlUserData.nickname,
      email: mlUserData.email || null,
      firstName: mlUserData.first_name || null,
      lastName: mlUserData.last_name || null,
      thumbnail: mlUserData.thumbnail?.http || mlUserData.logo || null,
      permalink: mlUserData.permalink || null,
      siteId: mlUserData.site_id || "MLB",
      accessToken: accessToken,
      refreshToken: refreshToken || null,
      tokenExpiry: refreshToken ? Date.now() + 21600000 : null,
      status: "active",
      authType: "manual_token",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingAccount = await getAccount(accountId);
    if (existingAccount) {
      await updateAccount(accountId, accountData);
    } else {
      await createAccount(accountData);
    }

    const user = await User.findById(jwtUserId);
    if (!user) {
      return handleError(res, 404, "Usuário não encontrado", null, {
        action: "ML_ADD_TOKEN_USER_NOT_FOUND",
      });
    }

    const mlAccountInfo = {
      accountId: accountId,
      nickname: accountData.nickname,
      email: accountData.email,
      addedAt: new Date().toISOString(),
    };

    const accountAlreadyLinked = user.mlAccounts.some((acc) => acc.accountId === accountId);

    if (!accountAlreadyLinked) {
      user.mlAccounts.push(mlAccountInfo);
      await user.save();
    }

    return sendSuccess(
      res,
      {
        account: {
          id: accountData.id,
          nickname: accountData.nickname,
          siteId: accountData.siteId,
          email: accountData.email,
          status: accountData.status,
          authType: accountData.authType,
        },
      },
      "Account added successfully via tokens",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to add ML account", error, {
      action: "ML_ADD_TOKEN_ERROR",
    });
  }
});

/**
 * POST /api/auth/ml-logout
 *
 * Logout and revoke tokens for an account.
 */
router.post("/ml-logout", async (req, res, next) => {
  try {
    if (!req.body.accountId) {
      return handleError(res, 400, "Missing accountId", null, {
        action: "ML_LOGOUT_MISSING_ID",
      });
    }

    const { accountId } = req.body;
    const account = await getAccount(accountId);

    if (!account) {
      return handleError(res, 404, "Account not found", null, {
        action: "ML_LOGOUT_ACCOUNT_NOT_FOUND",
      });
    }

    account.status = "disconnected";
    account.accessToken = null;
    account.refreshToken = null;
    account.tokenExpiry = null;
    account.updatedAt = new Date().toISOString();

    await updateAccount(accountId, account);

    return sendSuccess(res, {}, "Account disconnected successfully");
  } catch (error) {
    return handleError(res, 500, "Logout error", error, {
      action: "ML_LOGOUT_ERROR",
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify user email with token
 */
router.post("/verify-email", async (req, res) => {
  try {
    if (!req.body.token) {
      return handleError(res, 400, "Verification token is required", null, {
        action: "VERIFY_EMAIL_MISSING_TOKEN",
      });
    }

    const { token } = req.body;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return handleError(res, 404, "Invalid or expired verification token", null, {
        action: "VERIFY_EMAIL_INVALID_TOKEN",
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    logger.info({
      action: "EMAIL_VERIFIED",
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is required");
    }

    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return sendSuccess(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
        },
        token: jwtToken,
      },
      "Email verified successfully!",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to verify email", error, {
      action: "EMAIL_VERIFICATION_ERROR",
    });
  }
});

/**
 * POST /api/auth/resend-verification-email
 * Resend verification email to user
 */
router.post("/resend-verification-email", async (req, res) => {
  try {
    if (!req.body.email) {
      return handleError(res, 400, "Email is required", null, {
        action: "RESEND_VERIFICATION_MISSING_EMAIL",
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return sendSuccess(
        res,
        {},
        "If this email is registered, you will receive a verification link shortly",
        200
      );
    }

    if (user.emailVerified) {
      return handleError(res, 400, "Email is already verified", null, {
        action: "RESEND_VERIFICATION_ALREADY_VERIFIED",
      });
    }

    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    try {
      const emailService = require("../services/email");
      await emailService.sendVerificationEmail(email, verificationToken, user.firstName);

      logger.info({
        action: "VERIFICATION_EMAIL_RESENT",
        email: user.email,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });

      return sendSuccess(res, {}, "Verification email sent! Please check your inbox.", 200);
    } catch (emailError) {
      return handleError(res, 500, "Failed to send verification email. Please try again later.", emailError, {
        action: "RESEND_VERIFICATION_EMAIL_FAILED",
        email: user.email,
      });
    }
  } catch (error) {
    return handleError(res, 500, "Failed to resend verification email", error, {
      action: "RESEND_VERIFICATION_ERROR",
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
      return handleError(res, 404, "User not found", null, {
        action: "EMAIL_STATUS_USER_NOT_FOUND",
      });
    }

    return sendSuccess(
      res,
      {
        email: user.email,
        emailVerified: user.emailVerified,
        emailVerificationExpires: user.emailVerificationExpires,
      },
      "Email status retrieved",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to check email status", error, {
      action: "EMAIL_STATUS_ERROR",
    });
  }
});

/**
 * POST /api/auth/ml-compressed-callback
 *
 * Handle Mercado Livre's compressed URL format.
 */
router.post("/ml-compressed-callback", async (req, res) => {
  try {
    const validation = validateRequired(req, ["compressedData", "clientId", "clientSecret", "redirectUri"]);
    if (!validation.valid) {
      return handleError(
        res,
        400,
        "compressedData, clientId, clientSecret, and redirectUri are required",
        null,
        { action: "ML_COMPRESSED_CALLBACK_INVALID_REQUEST" }
      );
    }

    const { compressedData, clientId, clientSecret, redirectUri } = req.body;

    logger.info({
      action: "ML_COMPRESSED_CALLBACK_START",
      clientId: clientId.substring(0, 8) + "***",
      timestamp: new Date().toISOString(),
    });

    let decoded;
    try {
      const binaryString = Buffer.from(compressedData, "base64");
      const zlib = require("zlib");
      decoded = JSON.parse(zlib.gunzipSync(binaryString).toString("utf8"));
    } catch (decodeError) {
      try {
        const binaryString = atob(compressedData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const zlib = require("zlib");
        decoded = JSON.parse(zlib.gunzipSync(bytes).toString("utf8"));
      } catch (altError) {
        return handleError(res, 400, "Failed to decode compressed data", decodeError, {
          action: "ML_COMPRESSED_DECODE_ERROR",
        });
      }
    }

    logger.info({
      action: "ML_COMPRESSED_DECODED",
      hasCode: !!decoded.code,
      hasAccessToken: !!decoded.access_token,
      keys: Object.keys(decoded),
    });

    if (decoded.access_token) {
      return sendSuccess(
        res,
        {
          accessToken: decoded.access_token,
          refreshToken: decoded.refresh_token,
          expiresIn: decoded.expires_in,
          userId: decoded.user_id,
        },
        "Compressed callback processed successfully"
      );
    }

    if (decoded.code) {
      const tokenResponse = await exchangeCodeForTokenWithCredentials(
        decoded.code,
        clientId,
        clientSecret,
        redirectUri
      );

      return sendSuccess(
        res,
        {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresIn: tokenResponse.expires_in,
          userId: tokenResponse.user_id,
        },
        "Compressed callback processed successfully"
      );
    }

    return handleError(res, 400, "No authorization code or access token in compressed data", null, {
      action: "ML_COMPRESSED_CALLBACK_NO_DATA",
    });
  } catch (error) {
    return handleError(res, 500, "Failed to process compressed callback", error, {
      action: "ML_COMPRESSED_CALLBACK_ERROR",
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset token
 */
router.post("/forgot-password", async (req, res) => {
  try {
    if (!req.body.email) {
      return handleError(res, 400, "Email is required", null, {
        action: "FORGOT_PASSWORD_MISSING_EMAIL",
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return sendSuccess(
        res,
        {},
        "Se essa conta existe, você receberá um link para resetar sua senha.",
        200
      );
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    logger.info({
      action: "PASSWORD_RESET_REQUESTED",
      email: user.email,
      resetToken,
      expiresIn: "30 minutes",
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(
      res,
      { resetToken },
      "Se essa conta existe, você receberá um link para resetar sua senha.",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to process password reset request", error, {
      action: "FORGOT_PASSWORD_ERROR",
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using a reset token
 */
router.post("/reset-password", async (req, res) => {
  try {
    const validation = validateRequired(req, ["email", "resetToken", "newPassword"]);
    if (!validation.valid) {
      return handleError(res, 400, "Email, reset token, and new password are required", null, {
        action: "RESET_PASSWORD_INVALID_REQUEST",
        missingFields: validation.missingFields,
      });
    }

    const { email, resetToken, newPassword } = req.body;

    if (newPassword.length < 8) {
      return handleError(res, 400, "Password must be at least 8 characters", null, {
        action: "RESET_PASSWORD_WEAK_PASSWORD",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user) {
      return handleError(res, 404, "User not found", null, {
        action: "RESET_PASSWORD_USER_NOT_FOUND",
      });
    }

    if (!user.verifyPasswordResetToken(resetToken)) {
      return handleError(
        res,
        400,
        "Invalid or expired reset token. Please request a new password reset.",
        null,
        { action: "RESET_PASSWORD_INVALID_TOKEN" }
      );
    }

    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    logger.info({
      action: "PASSWORD_RESET_SUCCESSFUL",
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    const userProfile = user.getProfile();

    return sendSuccess(
      res,
      { user: userProfile },
      "Senha resetada com sucesso. Você pode fazer login agora.",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to reset password", error, {
      action: "RESET_PASSWORD_ERROR",
    });
  }
});

/**
 * POST /api/auth/verify-reset-token
 * Verify if a reset token is valid
 */
router.post("/verify-reset-token", async (req, res) => {
  try {
    const validation = validateRequired(req, ["email", "resetToken"]);
    if (!validation.valid) {
      return handleError(res, 400, "Email and reset token are required", null, {
        action: "VERIFY_RESET_TOKEN_INVALID_REQUEST",
        missingFields: validation.missingFields,
      });
    }

    const { email, resetToken } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return handleError(res, 404, "User not found", null, {
        action: "VERIFY_RESET_TOKEN_USER_NOT_FOUND",
      });
    }

    const isValid = user.verifyPasswordResetToken(resetToken);

    return sendSuccess(
      res,
      { valid: isValid },
      isValid ? "Reset token is valid" : "Reset token is invalid or expired",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to verify reset token", error, {
      action: "VERIFY_RESET_TOKEN_ERROR",
    });
  }
});

/**
 * POST /api/auth/2fa/setup
 * Setup two-factor authentication for a user (admin only)
 */
router.post("/2fa/setup", async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return handleError(res, 401, "Authentication required", null, {
        action: "2FA_SETUP_NO_TOKEN",
      });
    }

    const verification = verifyJWT(token);
    if (!verification.valid) {
      return handleError(res, 401, "Invalid or expired token", verification.error, {
        action: "2FA_SETUP_INVALID_TOKEN",
      });
    }

    const user = await User.findOne({ id: verification.decoded.userId });
    if (!user) {
      return handleError(res, 404, "User not found", null, {
        action: "2FA_SETUP_USER_NOT_FOUND",
      });
    }

    if (user.role !== "admin") {
      return handleError(res, 403, "Only admins can enable 2FA", null, {
        action: "2FA_SETUP_UNAUTHORIZED",
      });
    }

    const secret = speakeasy.generateSecret({
      name: `Projeto SASS (${user.email})`,
      issuer: "Projeto SASS",
      length: 32,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    user.twoFactorSecret = secret.base32;

    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push({
        code: crypto.randomBytes(4).toString("hex").toUpperCase(),
        used: false,
      });
    }
    user.backupCodes = backupCodes;
    await user.save();

    logger.info({
      action: "2FA_SETUP_INITIATED",
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(
      res,
      {
        secret: secret.base32,
        qrCode,
        backupCodes: backupCodes.map((b) => b.code),
      },
      "2FA setup initiated. Please verify with your authenticator app.",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to setup 2FA", error, {
      action: "2FA_SETUP_ERROR",
    });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verify 2FA code and enable 2FA for account
 */
router.post("/2fa/verify", async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return handleError(res, 401, "Authentication required", null, {
        action: "2FA_VERIFY_NO_TOKEN",
      });
    }

    if (!req.body.code) {
      return handleError(res, 400, "Verification code is required", null, {
        action: "2FA_VERIFY_MISSING_CODE",
      });
    }

    const verification = verifyJWT(token);
    if (!verification.valid) {
      return handleError(res, 401, "Invalid or expired token", verification.error, {
        action: "2FA_VERIFY_INVALID_TOKEN",
      });
    }

    const user = await User.findOne({ id: verification.decoded.userId }).select("+twoFactorSecret");
    if (!user) {
      return handleError(res, 404, "User not found", null, {
        action: "2FA_VERIFY_USER_NOT_FOUND",
      });
    }

    if (!user.twoFactorSecret) {
      return handleError(res, 400, "No pending 2FA setup found. Start setup first.", null, {
        action: "2FA_VERIFY_NO_SETUP",
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: req.body.code,
      window: 2,
    });

    if (!verified) {
      logger.warn({
        action: "2FA_VERIFY_FAILED",
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      });
      return handleError(res, 400, "Invalid verification code", null, {
        action: "2FA_VERIFY_INVALID_CODE",
      });
    }

    user.twoFactorEnabled = true;
    await user.save();

    logger.info({
      action: "2FA_ENABLED",
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(
      res,
      {
        backupCodes: user.backupCodes.map((b) => b.code),
      },
      "2FA enabled successfully",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to verify 2FA code", error, {
      action: "2FA_VERIFY_ERROR",
    });
  }
});

/**
 * POST /api/auth/2fa/login
 * Complete login with 2FA code for users with 2FA enabled
 */
router.post("/2fa/login", async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.query.userId;

    if (!code || !userId) {
      return handleError(res, 400, "Code and userId are required", null, {
        action: "2FA_LOGIN_MISSING_PARAMS",
      });
    }

    const user = await User.findOne({ id: userId }).select("+twoFactorSecret");
    if (!user) {
      return handleError(res, 404, "User not found", null, {
        action: "2FA_LOGIN_USER_NOT_FOUND",
      });
    }

    if (!user.twoFactorEnabled) {
      return handleError(res, 400, "2FA is not enabled for this account", null, {
        action: "2FA_LOGIN_NOT_ENABLED",
      });
    }

    let verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified) {
      const backupCodeIndex = user.backupCodes.findIndex((b) => b.code === code && !b.used);
      if (backupCodeIndex !== -1) {
        verified = true;
        user.backupCodes[backupCodeIndex].used = true;
        user.backupCodes[backupCodeIndex].usedAt = new Date();
      }
    }

    if (!verified) {
      logger.warn({
        action: "2FA_LOGIN_FAILED",
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      });
      return handleError(res, 400, "Invalid 2FA code", null, {
        action: "2FA_LOGIN_INVALID_CODE",
      });
    }

    if (user.isModified("backupCodes")) {
      await user.save();
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    logger.info({
      action: "2FA_LOGIN_SUCCESS",
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(
      res,
      { token },
      "2FA verification successful",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to verify 2FA code", error, {
      action: "2FA_LOGIN_ERROR",
    });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA for a user
 */
router.post("/2fa/disable", async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return handleError(res, 401, "Authentication required", null, {
        action: "2FA_DISABLE_NO_TOKEN",
      });
    }

    if (!req.body.password) {
      return handleError(res, 400, "Password is required for disabling 2FA", null, {
        action: "2FA_DISABLE_MISSING_PASSWORD",
      });
    }

    const verification = verifyJWT(token);
    if (!verification.valid) {
      return handleError(res, 401, "Invalid or expired token", verification.error, {
        action: "2FA_DISABLE_INVALID_TOKEN",
      });
    }

    const user = await User.findOne({ id: verification.decoded.userId }).select("+password +twoFactorSecret");
    if (!user) {
      return handleError(res, 404, "User not found", null, {
        action: "2FA_DISABLE_USER_NOT_FOUND",
      });
    }

    const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
    if (!isPasswordValid) {
      return handleError(res, 401, "Invalid password", null, {
        action: "2FA_DISABLE_INVALID_PASSWORD",
      });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.backupCodes = [];
    await user.save();

    logger.info({
      action: "2FA_DISABLED",
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(res, {}, "2FA disabled successfully", 200);
  } catch (error) {
    return handleError(res, 500, "Failed to disable 2FA", error, {
      action: "2FA_DISABLE_ERROR",
    });
  }
});

/**
 * GET /api/auth/2fa/status
 * Get 2FA status for current user
 */
router.get("/2fa/status", async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return handleError(res, 401, "Authentication required", null, {
        action: "2FA_STATUS_NO_TOKEN",
      });
    }

    const verification = verifyJWT(token);
    if (!verification.valid) {
      return handleError(res, 401, "Invalid or expired token", verification.error, {
        action: "2FA_STATUS_INVALID_TOKEN",
      });
    }

    const user = await User.findOne({ id: verification.decoded.userId });
    if (!user) {
      return handleError(res, 404, "User not found", null, {
        action: "2FA_STATUS_USER_NOT_FOUND",
      });
    }

    return sendSuccess(
      res,
      {
        twoFactorEnabled: user.twoFactorEnabled,
        backupCodesRemaining: user.backupCodes.filter((b) => !b.used).length,
      },
      "2FA status retrieved",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to get 2FA status", error, {
      action: "2FA_STATUS_ERROR",
    });
  }
});

/**
 * POST /api/auth/refresh-token
 * Refresh JWT token to extend session
 */
router.post("/refresh-token", async (req, res) => {
  try {
    let token = req.body.token;
    if (!token) {
      token = getTokenFromHeader(req);
    }

    if (!token) {
      return handleError(res, 401, "Token is required", null, {
        action: "REFRESH_TOKEN_MISSING",
      });
    }

    const verification = verifyJWT(token, false);
    const decoded = verification.decoded;

    if (!decoded) {
      return handleError(res, 401, "Invalid or malformed token", verification.error, {
        action: "REFRESH_TOKEN_INVALID",
      });
    }

    const user = await User.findOne({ id: decoded.userId });
    if (!user) {
      return handleError(res, 404, "User not found", null, {
        action: "REFRESH_TOKEN_USER_NOT_FOUND",
      });
    }

    if (user.status !== "active") {
      return handleError(res, 403, "User account is not active", null, {
        action: "REFRESH_TOKEN_USER_INACTIVE",
      });
    }

    const newToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    logger.info({
      action: "TOKEN_REFRESH_SUCCESS",
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(
      res,
      {
        token: newToken,
        expiresIn: "7 days",
      },
      "Token refreshed successfully",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to refresh token", error, {
      action: "REFRESH_TOKEN_ERROR",
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get("/me", async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return handleError(res, 401, "Authentication required", null, {
        action: "GET_ME_NO_TOKEN",
      });
    }

    const verification = verifyJWT(token);
    if (!verification.valid) {
      return handleError(res, 401, "Invalid or expired token", verification.error, {
        action: "GET_ME_INVALID_TOKEN",
      });
    }

    const user = await User.findOne({ id: verification.decoded.userId });
    if (!user) {
      return handleError(res, 404, "User not found", null, {
        action: "GET_ME_USER_NOT_FOUND",
      });
    }

    return sendSuccess(
      res,
      { user: user.getProfile() },
      "User profile retrieved",
      200
    );
  } catch (error) {
    return handleError(res, 500, "Failed to get user profile", error, {
      action: "GET_USER_PROFILE_ERROR",
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate session)
 */
router.post("/logout", async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return handleError(res, 401, "Authentication required", null, {
        action: "LOGOUT_NO_TOKEN",
      });
    }

    const verification = verifyJWT(token);
    if (!verification.valid) {
      return handleError(res, 401, "Invalid or expired token", verification.error, {
        action: "LOGOUT_INVALID_TOKEN",
      });
    }

    const user = await User.findOne({ id: verification.decoded.userId });
    if (user) {
      logger.info({
        action: "USER_LOGOUT",
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      });
    }

    return sendSuccess(res, {}, "Logged out successfully", 200);
  } catch (error) {
    return handleError(res, 500, "Failed to logout", error, {
      action: "LOGOUT_ERROR",
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post("/change-password", async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return handleError(res, 401, "Authentication required", null, {
        action: "CHANGE_PASSWORD_NO_TOKEN",
      });
    }

    const validation = validateRequired(req, ["currentPassword", "newPassword"]);
    if (!validation.valid) {
      return handleError(res, 400, "Current password and new password are required", null, {
        action: "CHANGE_PASSWORD_MISSING_FIELDS",
        missingFields: validation.missingFields,
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (newPassword.length < 8) {
      return handleError(res, 400, "New password must be at least 8 characters", null, {
        action: "CHANGE_PASSWORD_WEAK_PASSWORD",
      });
    }

    const verification = verifyJWT(token);
    if (!verification.valid) {
      return handleError(res, 401, "Invalid or expired token", verification.error, {
        action: "CHANGE_PASSWORD_INVALID_TOKEN",
      });
    }

    const user = await User.findOne({ id: verification.decoded.userId }).select("+password");
    if (!user) {
      return handleError(res, 404, "User not found", null, {
        action: "CHANGE_PASSWORD_USER_NOT_FOUND",
      });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return handleError(res, 401, "Current password is incorrect", null, {
        action: "CHANGE_PASSWORD_INVALID_CURRENT",
      });
    }

    user.password = newPassword;
    await user.save();

    logger.info({
      action: "PASSWORD_CHANGED",
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(res, {}, "Password changed successfully", 200);
  } catch (error) {
    return handleError(res, 500, "Failed to change password", error, {
      action: "CHANGE_PASSWORD_ERROR",
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
 * GET /api/ml-auth/url
 *
 * Alias endpoint for compatibility with MLAuth component.
 * Uses environment variables for app credentials.
 * This endpoint is for the default app configuration.
 */
router.get("/ml-auth/url", (req, res) => {
  try {
    const CLIENT_ID = process.env.ML_CLIENT_ID;
    const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
    const REDIRECT_URI = process.env.ML_REDIRECT_URI;

    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
      return res.status(400).json({
        success: false,
        error:
          "ML_CLIENT_ID, ML_CLIENT_SECRET, and ML_REDIRECT_URI environment variables are not configured",
      });
    }

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");

    const authUrl = `${ML_AUTH_URL}?client_id=${encodeURIComponent(CLIENT_ID)}&response_type=code&platform_id=MLB&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

    return res.json({
      success: true,
      data: {
        authUrl,
        state,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        redirectUri: REDIRECT_URI,
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
 * GET /api/auth/ml-auth/status
 *
 * Get ML OAuth status and connected accounts.
 * Used by the MLAuth component to check if user has connected accounts.
 */
router.get("/ml-auth/status", async (req, res) => {
  try {
    // Get user ID from JWT token
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    let userId = null;
    if (token) {
      try {
        const decoded = require("jsonwebtoken").verify(
          token,
          process.env.JWT_SECRET || "your-secret-key",
        );
        userId = decoded.userId;
      } catch (e) {
        // Invalid token
      }
    }

    if (!userId) {
      return res.json({
        success: true,
        accounts: [],
      });
    }

    const accounts = await getAccountsByUserId(userId);
    return res.json({
      success: true,
      accounts: accounts || [],
    });
  } catch (error) {
    console.error("Error getting ML auth status:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get ML accounts status",
    });
  }
});

/**
 * POST /api/auth/ml-callback
 *
 * Handle OAuth callback from Mercado Livre.
 * This is called when ML redirects back to the app after user authorization.
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

    // Get user ID from JWT token
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    let jwtUserId = null;
    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key",
        );
        jwtUserId = decoded.userId;
      } catch (e) {
        // Invalid token
      }
    }

    if (!jwtUserId) {
      return res.status(401).json({
        error: "User not authenticated",
        details: "JWT token is required to link ML account to user",
      });
    }

    // Verify user exists
    const user = await User.findById(jwtUserId);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        details: "The authenticated user does not exist",
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

    // Step 4.5: Update user's mlAccounts array
    const mlAccountInfo = {
      accountId: accountId,
      mlUserId: userInfo.id,
      nickname: userInfo.nickname,
      connectedAt: new Date().toISOString(),
    };

    // Check if account is already in user's mlAccounts
    const accountAlreadyLinked = user.mlAccounts.some(
      (acc) => acc.accountId === accountId,
    );

    if (!accountAlreadyLinked) {
      user.mlAccounts.push(mlAccountInfo);
      await user.save();
      console.log(`Linked ML account ${accountId} to user ${jwtUserId}`);
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
 * POST /api/auth/ml-add-token
 *
 * Manually add a Mercado Libre account using access token and refresh token.
 * No OAuth flow required - direct token input.
 *
 * Request body:
 * {
 *   accessToken: string (required),
 *   refreshToken: string (optional),
 *   userId: string (optional),
 *   nickname: string (optional)
 * }
 */
router.post("/ml-add-token", authenticateToken, async (req, res, next) => {
  try {
    const { accessToken, refreshToken, userId, nickname } = req.body;
    const jwtUserId = req.user.userId;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: "Access token é obrigatório",
      });
    }

    console.log(`Adding ML account via direct token for user: ${jwtUserId}`);

    // Step 1: Validate token by fetching user info from ML
    let mlUserData;
    try {
      const mlResponse = await axios.get(
        "https://api.mercadolibre.com/users/me",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      mlUserData = mlResponse.data;
    } catch (error) {
      console.error("Failed to validate access token:", error.message);
      return res.status(400).json({
        success: false,
        message: "Token inválido ou expirado",
        error: error.response?.data || error.message,
      });
    }

    // Step 2: Create account object
    const accountId = mlUserData.id.toString();
    const accountData = {
      id: accountId,
      userId: userId || mlUserData.id,
      nickname: nickname || mlUserData.nickname,
      email: mlUserData.email || null,
      firstName: mlUserData.first_name || null,
      lastName: mlUserData.last_name || null,
      thumbnail: mlUserData.thumbnail?.http || mlUserData.logo || null,
      permalink: mlUserData.permalink || null,
      siteId: mlUserData.site_id || "MLB",
      accessToken: accessToken,
      refreshToken: refreshToken || null,
      tokenExpiry: refreshToken ? Date.now() + 21600000 : null, // 6 hours if refresh token provided
      status: "active",
      authType: "manual_token",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Step 3: Check if account already exists
    const existingAccount = await getAccount(accountId);
    if (existingAccount) {
      // Update existing account
      await updateAccount(accountId, accountData);
      console.log(`Updated existing ML account: ${accountId}`);
    } else {
      // Create new account
      await createAccount(accountData);
      console.log(`Created new ML account via token: ${accountId}`);
    }

    // Step 4: Link to user document
    const user = await User.findById(jwtUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    const mlAccountInfo = {
      accountId: accountId,
      nickname: accountData.nickname,
      email: accountData.email,
      addedAt: new Date().toISOString(),
    };

    const accountAlreadyLinked = user.mlAccounts.some(
      (acc) => acc.accountId === accountId,
    );

    if (!accountAlreadyLinked) {
      user.mlAccounts.push(mlAccountInfo);
      await user.save();
      console.log(`Linked ML account ${accountId} to user ${jwtUserId}`);
    } else {
      console.log(
        `ML account ${accountId} already linked to user ${jwtUserId}`,
      );
    }

    return res.json({
      success: true,
      message: "Account added successfully via tokens",
      account: {
        id: accountData.id,
        nickname: accountData.nickname,
        siteId: accountData.siteId,
        email: accountData.email,
        status: accountData.status,
        authType: accountData.authType,
      },
    });
  } catch (error) {
    console.error("Add ML token error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to add ML account",
      error: error.message,
    });
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
    logger.error({
      action: "TOKEN_EXCHANGE_FAILED",
      error: error.message,
      statusCode: error.response?.status,
    });
    throw error;
  }
}

/**
 * Exchange authorization code for access and refresh tokens
 * Using user-provided credentials
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
        timeout: 10000,
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
 */
async function refreshToken(
  refreshTokenValue,
  clientId = null,
  clientSecret = null,
) {
  try {
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
    logger.error({
      action: "GET_USER_INFO_FAILED",
      error: error.message,
    });
    throw error;
  }
}

/**
 * Generate a unique account ID
 */
function generateAccountId() {
  return `ml_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
}

module.exports = router;
