/**
 * ML Token Management Utility
 * Handles OAuth token refresh, validation, and renewal
 * 
 * Supports two modes:
 * 1. OAuth: With Client ID + Secret (automatic refresh)
 * 2. User Token: With Refresh Token from Mercado Livre OAuth (automatic refresh)
 */

const axios = require('axios');
const logger = require('../logger');

const ML_OAUTH_URL = 'https://auth.mercadolibre.com';
const ML_API_BASE = 'https://api.mercadolibre.com';
const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry

class MLTokenManager {
  /**
   * Check if token is expired or about to expire
   */
  static isTokenExpired(expiresAt, bufferMs = TOKEN_REFRESH_BUFFER) {
    const now = new Date();
    const expiryTime = new Date(expiresAt);
    return now.getTime() + bufferMs >= expiryTime.getTime();
  }

  /**
   * Check if token needs immediate refresh
   */
  static isTokenCriticallyExpired(expiresAt) {
    return new Date() >= new Date(expiresAt);
  }

  /**
   * Refresh OAuth token using Refresh Token
   * Works WITHOUT requiring client secret (more secure for users)
   * 
   * This is used when:
   * - User provides Refresh Token from manual OAuth
   * - Token is about to expire
   * - System automatically renews without user action
   * 
   * @param {string} refreshToken - Refresh token from Mercado Livre
   * @param {string} clientId - Mercado Livre app client ID  
   * @param {string} clientSecret - Mercado Livre app client secret (required)
   * @returns {Promise<Object>} New tokens and expiry info
   */
  static async refreshTokenWithSecret(refreshToken, clientId, clientSecret) {
    try {
      if (!refreshToken || !clientId || !clientSecret) {
        throw new Error('Missing required parameters for token refresh');
      }

      // Build form-urlencoded body properly
      // Axios sends objects as JSON by default, so we need URLSearchParams for form encoding
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('refresh_token', refreshToken);

      // Use ML_TOKEN_URL (api.mercadolibre.com), NOT auth.mercadolibre.com
      const response = await axios.post(ML_TOKEN_URL, params.toString(), {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      });

      const { access_token, refresh_token, expires_in } = response.data;

      if (!access_token || !refresh_token || !expires_in) {
        throw new Error('Invalid token response from Mercado Libre');
      }

      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

      return {
        success: true,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt,
        expiresIn: expires_in,
      };
    } catch (error) {
      // Log detailed error for debugging
      logger.error({
        action: 'TOKEN_REFRESH_ERROR',
        error: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data,
        cause: error.response?.data?.cause,
        errorDescription: error.response?.data?.error_description || error.response?.data?.message,
      });

      // Build user-friendly error message
      const mlError = error.response?.data;
      let errorMessage = error.message;
      
      if (mlError) {
        if (mlError.error === 'invalid_grant') {
          errorMessage = 'Refresh token inválido ou expirado. Reconecte a conta.';
        } else if (mlError.error_description) {
          errorMessage = mlError.error_description;
        } else if (mlError.message) {
          errorMessage = mlError.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        statusCode: error.response?.status,
        mlError: mlError?.error,
      };
    }
  }

  /**
   * NOTE: The original refreshToken method is now renamed to refreshTokenWithSecret
   * Keep for backwards compatibility if needed
   */
  static async refreshToken(refreshToken, clientId, clientSecret) {
    return this.refreshTokenWithSecret(refreshToken, clientId, clientSecret);
  }

  /**
   * Validate token with Mercado Livre API
   * @param {string} accessToken - Access token to validate
   * @returns {Promise<boolean>} True if token is valid
   */
  static async validateToken(accessToken) {
    try {
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
      };

      const response = await axios.get('https://api.mercadolibre.com/users/me', { headers });

      return response.status === 200;
    } catch (error) {
      logger.warn({
        action: 'TOKEN_VALIDATION_FAILED',
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Get remaining token lifetime in seconds
   */
  static getTimeToExpiry(expiresAt) {
    const now = new Date();
    const expiryTime = new Date(expiresAt);
    const diffMs = expiryTime.getTime() - now.getTime();
    return Math.ceil(diffMs / 1000);
  }

  /**
   * Get token expiry percentage (100% = just renewed, 0% = about to expire)
   */
  static getTokenHealthPercent(expiresAt, refreshedAt) {
    if (!refreshedAt) return 0;

    const now = new Date();
    const refreshTime = new Date(refreshedAt);
    const expiryTime = new Date(expiresAt);

    const totalLifetime = expiryTime.getTime() - refreshTime.getTime();
    const elapsedTime = now.getTime() - refreshTime.getTime();

    const healthPercent = Math.max(0, Math.min(100, Math.round(((totalLifetime - elapsedTime) / totalLifetime) * 100)));

    return healthPercent;
  }

  /**
   * Format token info for logging
   */
  static getTokenInfo(account) {
    // Can auto-refresh only if has ALL required fields:
    // - refreshToken (to exchange for new access token)
    // - clientId (ML app ID)
    // - clientSecret (ML app secret)
    const canAutoRefresh = !!(account.refreshToken && account.clientId && account.clientSecret);
    
    return {
      accountId: account.id,
      mlUserId: account.mlUserId,
      tokenExpiry: account.tokenExpiresAt,
      timeToExpiry: this.getTimeToExpiry(account.tokenExpiresAt),
      healthPercent: this.getTokenHealthPercent(account.tokenExpiresAt, account.lastTokenRefresh),
      isExpired: this.isTokenCriticallyExpired(account.tokenExpiresAt),
      needsRefresh: this.isTokenExpired(account.tokenExpiresAt),
      canAutoRefresh,
      hasRefreshToken: !!account.refreshToken,
      hasClientCredentials: !!(account.clientId && account.clientSecret),
    };
  }
}

module.exports = MLTokenManager;
