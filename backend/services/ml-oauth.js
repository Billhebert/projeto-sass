/**
 * ML OAuth Service
 * Handles Mercado Livre OAuth 2.0 authentication flow
 *
 * OAuth Flow:
 * 1. User clicks "Connect ML Account" in frontend
 * 2. Frontend redirects to ML authorization page
 * 3. User logs in and grants permission
 * 4. ML redirects to our callback with authorization code
 * 5. Backend exchanges code for tokens
 * 6. Tokens saved to database, account linked to user
 */

const axios = require("axios");
const crypto = require("crypto");
const logger = require("../logger");
const MLAccount = require("../db/models/MLAccount");
const User = require("../db/models/User");

const ML_AUTH_URL = "https://auth.mercadolibre.com.br";
const ML_API_BASE = "https://api.mercadolibre.com";

class MLOAuthService {
  constructor() {
    this.clientId = process.env.ML_APP_CLIENT_ID || process.env.ML_CLIENT_ID;
    this.clientSecret =
      process.env.ML_APP_CLIENT_SECRET || process.env.ML_CLIENT_SECRET;
    this.redirectUri =
      process.env.ML_APP_REDIRECT_URI || process.env.ML_REDIRECT_URI;
  }

  /**
   * Generate authorization URL for ML OAuth
   *
   * @param {string} userId - Internal user ID
   * @param {string} state - State parameter for CSRF protection
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(userId, state) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: JSON.stringify({ userId, state }),
      scope: "offline_access",
    });

    return `${ML_AUTH_URL}/authorization?${params.toString()}`;
  }

  /**
   * Generate state parameter for CSRF protection
   * @returns {string} Random state
   */
  generateState() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Exchange authorization code for tokens
   *
   * @param {string} code - Authorization code from ML callback
   * @returns {Object} Token response from ML
   */
  async exchangeCodeForTokens(code) {
    try {
      logger.info({
        action: "OAUTH_EXCHANGE_CODE_START",
        hasCode: !!code,
      });

      const response = await axios.post(
        `${ML_API_BASE}/oauth/token`,
        new URLSearchParams({
          grant_type: "authorization_code",
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 15000,
        },
      );

      logger.info({
        action: "OAUTH_EXCHANGE_CODE_SUCCESS",
        hasAccessToken: !!response.data.access_token,
        hasRefreshToken: !!response.data.refresh_token,
        expiresIn: response.data.expires_in,
      });

      return {
        success: true,
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        userId: response.data.user_id,
        scope: response.data.scope,
      };
    } catch (error) {
      logger.error({
        action: "OAUTH_EXCHANGE_CODE_ERROR",
        error: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data,
      });

      return {
        success: false,
        error: error.message,
        mlError: error.response?.data?.error,
        mlErrorDescription: error.response?.data?.error_description,
      };
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New token response
   */
  async refreshAccessToken(refreshToken) {
    try {
      logger.info({
        action: "OAUTH_REFRESH_TOKEN_START",
        hasRefreshToken: !!refreshToken,
      });

      const response = await axios.post(
        `${ML_API_BASE}/oauth/token`,
        new URLSearchParams({
          grant_type: "refresh_token",
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
        }),
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 15000,
        },
      );

      logger.info({
        action: "OAUTH_REFRESH_TOKEN_SUCCESS",
        hasAccessToken: !!response.data.access_token,
        hasRefreshToken: !!response.data.refresh_token,
        expiresIn: response.data.expires_in,
      });

      return {
        success: true,
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      logger.error({
        action: "OAUTH_REFRESH_TOKEN_ERROR",
        error: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data,
      });

      return {
        success: false,
        error: error.message,
        mlError: error.response?.data?.error,
        mlErrorDescription: error.response?.data?.error_description,
      };
    }
  }

  /**
   * Get user info from ML API
   *
   * @param {string} accessToken - ML access token
   * @returns {Object} User information
   */
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get(`${ML_API_BASE}/users/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      return {
        success: true,
        user: {
          mlUserId: response.data.id,
          nickname: response.data.nickname,
          email: response.data.email,
          firstName: response.data.first_name,
          lastName: response.data.last_name,
          countryId: response.data.country_id,
          sellerId: response.data.seller_id,
          operatorId: response.data.operator_id,
        },
      };
    } catch (error) {
      logger.error({
        action: "OAUTH_GET_USER_INFO_ERROR",
        error: error.message,
        statusCode: error.response?.status,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete OAuth connection after callback
   *
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   * @returns {Object} Connection result
   */
  async completeOAuthConnection(code, state) {
    try {
      logger.info({
        action: "OAUTH_COMPLETE_CONNECTION_START",
        hasCode: !!code,
        hasState: !!state,
      });

      // Parse state parameter
      let stateData;
      try {
        stateData = JSON.parse(state);
      } catch (parseError) {
        return {
          success: false,
          error: "Invalid state parameter",
          code: "INVALID_STATE",
        };
      }

      const { userId, state: csrfState } = stateData;

      if (!userId) {
        return {
          success: false,
          error: "Missing user ID in state",
          code: "MISSING_USER_ID",
        };
      }

      // Exchange code for tokens
      const tokenResult = await this.exchangeCodeForTokens(code);

      if (!tokenResult.success) {
        logger.error({
          action: "OAUTH_TOKEN_EXCHANGE_FAILED",
          userId,
          mlError: tokenResult.mlError,
          error: tokenResult.error,
        });

        return {
          success: false,
          error: tokenResult.mlErrorDescription || tokenResult.error,
          code: "TOKEN_EXCHANGE_FAILED",
        };
      }

      // Get user info from ML
      const userInfoResult = await this.getUserInfo(tokenResult.accessToken);

      if (!userInfoResult.success) {
        return {
          success: false,
          error: "Failed to get user info from Mercado Livre",
          code: "USER_INFO_FAILED",
        };
      }

      const mlUser = userInfoResult.user;

      // Check if user already has this ML account connected
      const existingAccount = await MLAccount.findOne({
        userId,
        mlUserId: mlUser.mlUserId,
      });

      if (existingAccount) {
        // Update existing account with new tokens
        await existingAccount.refreshedTokens(
          tokenResult.accessToken,
          tokenResult.refreshToken,
          tokenResult.expiresIn,
        );

        // Update OAuth credentials
        existingAccount.clientId = this.clientId;
        existingAccount.clientSecret = this.clientSecret;
        existingAccount.redirectUri = this.redirectUri;
        existingAccount.status = "active";
        await existingAccount.save();

        logger.info({
          action: "OAUTH_ACCOUNT_UPDATED",
          userId,
          accountId: existingAccount.id,
          mlUserId: mlUser.mlUserId,
        });

        return {
          success: true,
          accountId: existingAccount.id,
          isNewAccount: false,
          user: mlUser,
        };
      }

      // Create new account
      const existingUserAccounts = await MLAccount.findByUserId(userId);
      const isPrimary = existingUserAccounts.length === 0;

      const newAccount = new MLAccount({
        userId,
        mlUserId: mlUser.mlUserId,
        nickname: mlUser.nickname,
        email: mlUser.email,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokenResult.expiresIn * 1000),
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        redirectUri: this.redirectUri,
        accountName: mlUser.nickname,
        accountType: "individual",
        isPrimary,
        status: "active",
        lastTokenRefresh: new Date(),
        nextTokenRefreshNeeded: new Date(
          Date.now() + tokenResult.expiresIn * 1000 - 5 * 60 * 1000,
        ),
        tokenRefreshStatus: "success",
      });

      await newAccount.save();

      // Update user account count
      await User.updateOne(
        { id: userId },
        {
          $inc: { "metadata.totalAccounts": 1 },
          $set: {
            "metadata.accountsLimit": Math.max(
              5,
              existingUserAccounts.length + 1,
            ),
          },
        },
      );

      logger.info({
        action: "OAUTH_NEW_ACCOUNT_CREATED",
        userId,
        accountId: newAccount.id,
        mlUserId: mlUser.mlUserId,
        isPrimary,
      });

      return {
        success: true,
        accountId: newAccount.id,
        isNewAccount: true,
        user: mlUser,
      };
    } catch (error) {
      logger.error({
        action: "OAUTH_COMPLETE_CONNECTION_ERROR",
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: "CONNECTION_ERROR",
      };
    }
  }

  /**
   * Revoke OAuth access
   *
   * @param {string} accessToken - Access token to revoke
   * @returns {Object} Revocation result
   */
  async revokeAccess(accessToken) {
    try {
      await axios.post(
        `${ML_API_BASE}/oauth/revoke`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          access_token: accessToken,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 10000,
        },
      );

      logger.info({
        action: "OAUTH_REVOKE_SUCCESS",
      });

      return { success: true };
    } catch (error) {
      logger.error({
        action: "OAUTH_REVOKE_ERROR",
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new MLOAuthService();
