/**
 * OAuth 2.0 Authentication Routes for Mercado Livre Integration
 * 
 * POST /api/auth/register            - Register new user
 * POST /api/auth/login               - Login user
 * POST /api/auth/ml-callback         - Trade authorization code for tokens
 * POST /api/auth/ml-refresh          - Refresh expired tokens
 * POST /api/auth/ml-logout           - Logout (revoke tokens)
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Models
const User = require('../db/models/User');

// ML API Endpoints
const ML_AUTH_URL = 'https://auth.mercadolibre.com/authorization';
const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const ML_API_BASE = 'https://api.mercadolibre.com';

// Database functions (will be implemented with actual DB)
const { 
  saveAccount, 
  getAccount, 
  updateAccount,
  getAccountByUserId 
} = require('../db/accounts');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, firstName, and lastName are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create user (password will be hashed by pre-save middleware)
    const user = new User({
      email: email.toLowerCase(),
      password, // Pre-save hook will hash this
      firstName,
      lastName
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register user'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to login'
    });
  }
});

/**
 * POST /api/auth/ml-callback
 * 
 * Trade the authorization code for access and refresh tokens.
 * This is called after user authorizes the app on Mercado Livre.
 * 
 * Request body:
 * {
 *   code: string,           // Authorization code from ML
 *   state: string          // State parameter to verify integrity
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
router.post('/ml-callback', async (req, res, next) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ 
        error: 'Missing authorization code',
        details: 'The "code" parameter is required'
      });
    }

    // Verify state (optional but recommended for CSRF protection)
    // For now, we'll accept any state
    console.log(`Processing ML callback with code: ${code.substring(0, 10)}...`);

    // Step 1: Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken(code);
    
    if (!tokenResponse.access_token) {
      return res.status(400).json({ 
        error: 'Failed to exchange code for token',
        details: 'Mercado Livre did not return an access token'
      });
    }

    // Step 2: Get user information from ML
    const userInfo = await getUserInfo(tokenResponse.access_token);

    if (!userInfo.id) {
      return res.status(400).json({ 
        error: 'Failed to get user information',
        details: 'Could not retrieve user ID from Mercado Livre'
      });
    }

    // Step 3: Check if account already exists
    const existingAccount = await getAccountByUserId(userInfo.id);
    
    const accountId = existingAccount?.id || generateAccountId();
    const tokenExpiry = Date.now() + (tokenResponse.expires_in * 1000);

    // Step 4: Save or update account
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
      createdAt: existingAccount?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'connected'
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
      message: 'OAuth token exchange completed successfully',
      account: {
        id: account.id,
        userId: account.userId,
        nickname: account.nickname,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        tokenExpiry: account.tokenExpiry,
        status: account.status
      }
    });

  } catch (error) {
    console.error('OAuth callback error:', error.message);
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
router.post('/ml-refresh', async (req, res, next) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ 
        error: 'Missing accountId',
        details: 'The "accountId" parameter is required'
      });
    }

    // Get account from database
    const account = await getAccount(accountId);

    if (!account) {
      return res.status(404).json({ 
        error: 'Account not found',
        accountId
      });
    }

    if (!account.refreshToken) {
      return res.status(400).json({ 
        error: 'No refresh token available',
        details: 'Account needs to be re-authenticated'
      });
    }

    console.log(`Refreshing token for account: ${accountId}`);

    // Step 1: Call ML API to refresh token
    const tokenResponse = await refreshToken(account.refreshToken);

    if (!tokenResponse.access_token) {
      return res.status(400).json({ 
        error: 'Failed to refresh token',
        details: 'Mercado Livre did not return a new access token'
      });
    }

    // Step 2: Update account with new tokens
    const tokenExpiry = Date.now() + (tokenResponse.expires_in * 1000);

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
      message: 'Token refreshed successfully',
      accessToken: tokenResponse.access_token,
      tokenExpiry: tokenExpiry
    });

  } catch (error) {
    console.error('Token refresh error:', error.message);
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
router.post('/ml-logout', async (req, res, next) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ 
        error: 'Missing accountId'
      });
    }

    const account = await getAccount(accountId);

    if (!account) {
      return res.status(404).json({ 
        error: 'Account not found'
      });
    }

    console.log(`Logging out account: ${accountId}`);

    // Update account status to disconnected
    account.status = 'disconnected';
    account.accessToken = null;
    account.refreshToken = null;
    account.tokenExpiry = null;
    account.updatedAt = new Date().toISOString();

    await updateAccount(accountId, account);

    res.json({
      success: true,
      message: 'Account disconnected successfully'
    });

  } catch (error) {
    console.error('Logout error:', error.message);
    next(error);
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForToken(code) {
  try {
    const response = await axios.post(ML_TOKEN_URL, {
      grant_type: 'authorization_code',
      client_id: process.env.ML_CLIENT_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.ML_REDIRECT_URI
    }, {
      headers: {
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Token exchange failed:', error.response?.data || error.message);
    throw new Error(`Failed to exchange code for token: ${error.message}`);
  }
}

/**
 * Refresh an access token using refresh token
 */
async function refreshToken(refreshToken) {
  try {
    const response = await axios.post(ML_TOKEN_URL, {
      grant_type: 'refresh_token',
      client_id: process.env.ML_CLIENT_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      refresh_token: refreshToken
    }, {
      headers: {
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Token refresh failed:', error.response?.data || error.message);
    throw new Error(`Failed to refresh token: ${error.message}`);
  }
}

/**
 * Get user information from Mercado Livre
 */
async function getUserInfo(accessToken) {
  try {
    const response = await axios.get(`${ML_API_BASE}/users/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 15000
    });

    return response.data;
  } catch (error) {
    console.error('Get user info failed:', error.response?.data || error.message);
    throw new Error(`Failed to get user information: ${error.message}`);
  }
}

/**
 * Generate a unique account ID
 */
function generateAccountId() {
  return `ml_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

module.exports = router;
