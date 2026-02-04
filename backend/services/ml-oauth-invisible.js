/**
 * ML OAuth Invisible Service
 * OAuth 2.0 com Mercado Livre - Sem configuração necessária
 *
 * Credenciais hardcoded do README:
 * Client ID: 1706187223829083
 * Client Secret: vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG
 */

const axios = require("axios");
const crypto = require("crypto");
const logger = require("../logger");
const MLAccount = require("../db/models/MLAccount");
const User = require("../db/models/User");

const ML_AUTH_URL = "https://auth.mercadolivre.com.br";
const ML_API_BASE = "https://api.mercadolivre.com";

const ML_CLIENT_ID = "1706187223829083";
const ML_CLIENT_SECRET = "vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG";

class MLOAuthInvisibleService {
  constructor() {
    this.clientId = ML_CLIENT_ID;
    this.clientSecret = ML_CLIENT_SECRET;
    this.redirectUri =
      process.env.ML_APP_REDIRECT_URI ||
      process.env.ML_CALLBACK_URL ||
      "https://www.vendata.com.br";
  }

  getRedirectUri() {
    return this.redirectUri;
  }

  getAuthorizationUrl(userId, state) {
    const redirectUri = this.getRedirectUri();

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state: userId,
    });

    return `${ML_AUTH_URL}/authorization?${params.toString()}`;
  }

  generateState() {
    return crypto.randomBytes(32).toString("hex");
  }

  generateCustomState(userId, clientId, clientSecret, redirectUri) {
    const stateData = {
      userId,
      clientId,
      clientSecret,
      redirectUri: redirectUri || this.redirectUri,
      custom: true,
    };
    return Buffer.from(JSON.stringify(stateData)).toString("base64");
  }

  parseCustomState(state) {
    try {
      const decoded = Buffer.from(state, "base64").toString("utf-8");
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  getCustomAuthorizationUrl(clientId, clientSecret, redirectUri, state) {
    const effectiveRedirectUri = redirectUri || this.redirectUri;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: effectiveRedirectUri,
      state: state,
    });

    return `${ML_AUTH_URL}/authorization?${params.toString()}`;
  }

  async exchangeCodeForTokens(code) {
    try {
      const redirectUri = this.getRedirectUri();

      logger.info({
        action: "OAUTH_INVISIBLE_EXCHANGE_CODE_START",
        hasCode: !!code,
      });

      const response = await axios.post(
        `${ML_API_BASE}/oauth/token`,
        new URLSearchParams({
          grant_type: "authorization_code",
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: redirectUri,
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
        action: "OAUTH_INVISIBLE_EXCHANGE_CODE_SUCCESS",
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
      };
    } catch (error) {
      logger.error({
        action: "OAUTH_INVISIBLE_EXCHANGE_CODE_ERROR",
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

  async refreshAccessToken(refreshToken) {
    try {
      logger.info({
        action: "OAUTH_INVISIBLE_REFRESH_TOKEN_START",
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
        action: "OAUTH_INVISIBLE_REFRESH_TOKEN_SUCCESS",
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
        action: "OAUTH_INVISIBLE_REFRESH_TOKEN_ERROR",
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
        action: "OAUTH_INVISIBLE_GET_USER_INFO_ERROR",
        error: error.message,
        statusCode: error.response?.status,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async completeOAuthConnection(code, state) {
    try {
      logger.info({
        action: "OAUTH_INVISIBLE_COMPLETE_CONNECTION_START",
        hasCode: !!code,
        hasState: !!state,
      });

      if (!state) {
        return {
          success: false,
          error: "Missing state parameter",
          code: "INVALID_STATE",
        };
      }

      const customState = this.parseCustomState(state);

      if (customState && customState.custom) {
        return this.completeOAuthConnectionCustom(
          code,
          customState.userId,
          customState.clientId,
          customState.clientSecret,
          customState.redirectUri,
        );
      }

      const userId = state;

      const tokenResult = await this.exchangeCodeForTokens(code);

      if (!tokenResult.success) {
        logger.error({
          action: "OAUTH_INVISIBLE_TOKEN_EXCHANGE_FAILED",
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

      const userInfoResult = await this.getUserInfo(tokenResult.accessToken);

      if (!userInfoResult.success) {
        return {
          success: false,
          error: "Failed to get user info from Mercado Livre",
          code: "USER_INFO_FAILED",
        };
      }

      const mlUser = userInfoResult.user;

      const existingAccount = await MLAccount.findOne({
        userId,
        mlUserId: mlUser.mlUserId,
      });

      if (existingAccount) {
        await existingAccount.refreshedTokens(
          tokenResult.accessToken,
          tokenResult.refreshToken,
          tokenResult.expiresIn,
        );

        existingAccount.clientId = this.clientId;
        existingAccount.clientSecret = this.clientSecret;
        existingAccount.redirectUri = this.getRedirectUri();
        existingAccount.status = "active";
        await existingAccount.save();

        logger.info({
          action: "OAUTH_INVISIBLE_ACCOUNT_UPDATED",
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
        redirectUri: this.getRedirectUri(),
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
        action: "OAUTH_INVISIBLE_NEW_ACCOUNT_CREATED",
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
        action: "OAUTH_INVISIBLE_COMPLETE_CONNECTION_ERROR",
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

  async disconnectAccount(userId, accountId) {
    try {
      const account = await MLAccount.findOne({
        id: accountId,
        userId,
      });

      if (!account) {
        return {
          success: false,
          error: "Account not found",
          code: "ACCOUNT_NOT_FOUND",
        };
      }

      const mlUserId = account.mlUserId;

      const deleteResult = await MLAccount.deleteOne({
        id: accountId,
        userId,
      });

      if (deleteResult.deletedCount === 0) {
        return {
          success: false,
          error: "Failed to delete account",
          code: "DELETE_FAILED",
        };
      }

      if (account.isPrimary) {
        const nextAccount = await MLAccount.findOne({
          userId,
          id: { $ne: accountId },
        }).sort({ createdAt: 1 });

        if (nextAccount) {
          nextAccount.isPrimary = true;
          await nextAccount.save();
        }
      }

      await User.updateOne(
        { id: userId },
        { $inc: { "metadata.totalAccounts": -1 } },
      );

      logger.info({
        action: "OAUTH_INVISIBLE_DISCONNECT_SUCCESS",
        userId,
        accountId,
        mlUserId: mlUserId,
      });

      return {
        success: true,
        accountId,
        mlUserId: mlUserId,
      };
    } catch (error) {
      logger.error({
        action: "OAUTH_INVISIBLE_DISCONNECT_ERROR",
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        code: "DISCONNECT_ERROR",
      };
    }
  }

  async getAccountStatus(userId) {
    try {
      const accounts = await MLAccount.findByUserId(userId);

      if (accounts.length === 0) {
        return {
          success: true,
          connected: false,
          accounts: [],
        };
      }

      const primaryAccount =
        accounts.find((acc) => acc.isPrimary) || accounts[0];

      const now = new Date();
      const tokenExpiresAt = new Date(primaryAccount.tokenExpiresAt);
      const isTokenValid = tokenExpiresAt > now;

      const needsRefresh = !isTokenValid && primaryAccount.refreshToken;

      if (needsRefresh) {
        const refreshResult = await this.refreshAccessTokenWithCredentials(
          primaryAccount.refreshToken,
          primaryAccount.clientId,
          primaryAccount.clientSecret,
        );

        if (refreshResult.success) {
          await primaryAccount.refreshedTokens(
            refreshResult.accessToken,
            refreshResult.refreshToken,
            refreshResult.expiresIn,
          );

          return {
            success: true,
            connected: true,
            accounts: accounts.map((acc) => acc.getSummary()),
            tokenRefreshed: true,
          };
        }
      }

      return {
        success: true,
        connected: true,
        accounts: accounts.map((acc) => acc.getSummary()),
        tokenRefreshed: false,
        tokenValid: isTokenValid,
      };
    } catch (error) {
      logger.error({
        action: "OAUTH_INVISIBLE_GET_STATUS_ERROR",
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        connected: false,
      };
    }
  }

  async refreshAccessTokenWithCredentials(
    refreshToken,
    clientId,
    clientSecret,
  ) {
    try {
      logger.info({
        action: "OAUTH_INVISIBLE_REFRESH_TOKEN_CUSTOM_START",
        hasRefreshToken: !!refreshToken,
        hasClientId: !!clientId,
      });

      const response = await axios.post(
        `${ML_API_BASE}/oauth/token`,
        new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId,
          client_secret: clientSecret,
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
        action: "OAUTH_INVISIBLE_REFRESH_TOKEN_CUSTOM_SUCCESS",
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
        action: "OAUTH_INVISIBLE_REFRESH_TOKEN_CUSTOM_ERROR",
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

  async completeOAuthConnectionCustom(
    code,
    userId,
    clientId,
    clientSecret,
    redirectUri,
  ) {
    try {
      logger.info({
        action: "OAUTH_CUSTOM_COMPLETE_CONNECTION_START",
        hasCode: !!code,
        userId,
        hasClientId: !!clientId,
      });

      const tokenResult = await this.exchangeCodeForTokensCustom(
        code,
        clientId,
        clientSecret,
        redirectUri,
      );

      if (!tokenResult.success) {
        logger.error({
          action: "OAUTH_CUSTOM_TOKEN_EXCHANGE_FAILED",
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

      const userInfoResult = await this.getUserInfo(tokenResult.accessToken);

      if (!userInfoResult.success) {
        return {
          success: false,
          error: "Failed to get user info from Mercado Livre",
          code: "USER_INFO_FAILED",
        };
      }

      const mlUser = userInfoResult.user;

      const existingAccount = await MLAccount.findOne({
        userId,
        mlUserId: mlUser.mlUserId,
      });

      if (existingAccount) {
        await existingAccount.refreshedTokens(
          tokenResult.accessToken,
          tokenResult.refreshToken,
          tokenResult.expiresIn,
        );

        existingAccount.clientId = clientId;
        existingAccount.clientSecret = clientSecret;
        existingAccount.redirectUri = redirectUri;
        existingAccount.status = "active";
        await existingAccount.save();

        logger.info({
          action: "OAUTH_CUSTOM_ACCOUNT_UPDATED",
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
        clientId: clientId,
        clientSecret: clientSecret,
        redirectUri: redirectUri,
        accountName: `${mlUser.nickname} (Custom)`,
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
        action: "OAUTH_CUSTOM_NEW_ACCOUNT_CREATED",
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
        action: "OAUTH_CUSTOM_COMPLETE_CONNECTION_ERROR",
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

  async exchangeCodeForTokensCustom(code, clientId, clientSecret, redirectUri) {
    try {
      logger.info({
        action: "OAUTH_INVISIBLE_EXCHANGE_CODE_CUSTOM_START",
        hasCode: !!code,
        hasClientId: !!clientId,
      });

      const response = await axios.post(
        `${ML_API_BASE}/oauth/token`,
        new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
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
        action: "OAUTH_INVISIBLE_EXCHANGE_CODE_CUSTOM_SUCCESS",
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
      };
    } catch (error) {
      logger.error({
        action: "OAUTH_INVISIBLE_EXCHANGE_CODE_CUSTOM_ERROR",
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
}

module.exports = new MLOAuthInvisibleService();
