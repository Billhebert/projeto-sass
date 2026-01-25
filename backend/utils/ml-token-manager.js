/**
 * ML Token Management Utility
 * Handles OAuth token refresh, validation, and renewal
 */

const axios = require('axios');
const logger = require('../logger');

const ML_OAUTH_URL = 'https://auth.mercadolibre.com';
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
   * Refresh OAuth token
   * @param {string} refreshToken - Refresh token from previous auth
   * @param {string} clientId - Mercado Livre app client ID
   * @param {string} clientSecret - Mercado Livre app client secret
   * @returns {Promise<Object>} New tokens and expiry info
   */
  static async refreshToken(refreshToken, clientId, clientSecret) {
    try {
      if (!refreshToken || !clientId || !clientSecret) {
        throw new Error('Missing required parameters for token refresh');
      }

      const response = await axios.post(`${ML_OAUTH_URL}/oauth/token`, {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
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
      logger.error({
        action: 'TOKEN_REFRESH_ERROR',
        error: error.message,
        statusCode: error.response?.status,
      });

      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
      };
    }
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
    return {
      accountId: account.id,
      mlUserId: account.mlUserId,
      tokenExpiry: account.tokenExpiresAt,
      timeToExpiry: this.getTimeToExpiry(account.tokenExpiresAt),
      healthPercent: this.getTokenHealthPercent(account.tokenExpiresAt, account.lastTokenRefresh),
      isExpired: this.isTokenCriticallyExpired(account.tokenExpiresAt),
      needsRefresh: this.isTokenExpired(account.tokenExpiresAt),
    };
  }
}

module.exports = MLTokenManager;
