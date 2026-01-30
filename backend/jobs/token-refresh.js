/**
 * Token Refresh Job
 * 
 * Runs every hour to refresh tokens that are about to expire
 * 
 * How it works:
 * 1. Find all accounts with refreshToken that need renewal
 * 2. Refresh their tokens using Mercado Libre OAuth endpoint
 * 3. Save new tokens to database
 * 4. Handle errors gracefully
 * 
 * Token Lifecycle:
 * - Access Token: 6 hours validity
 * - Refresh Token: 6 months validity (can be used 4+ months without use)
 * - When refresh token is used, you get NEW refresh token (single-use)
 * - So we update both tokens after each refresh
 */

const schedule = require('node-schedule');
const axios = require('axios');
const logger = require('../logger');
const MLAccount = require('../db/models/MLAccount');
const MLTokenManager = require('../utils/ml-token-manager');

const ML_OAUTH_URL = 'https://auth.mercadolibre.com';

// Get credentials from environment
// NOTE: These are only used as fallback. Each account should have its own client credentials.
const ML_APP_CLIENT_ID = process.env.ML_APP_CLIENT_ID || '1706187223829083';
const ML_APP_CLIENT_SECRET = process.env.ML_APP_CLIENT_SECRET || 'vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG';

/**
 * Refresh a single account's token
 * 
 * Uses the account's OAuth credentials (clientId + clientSecret) to refresh the token
 * This allows each client to have their own app and refresh tokens independently
 * 
 * @param {Object} account - MLAccount document
 * @returns {Promise<Object>} Result of refresh attempt
 */
async function refreshAccountToken(account) {
  try {
    if (!account.refreshToken) {
      logger.warn({
        action: 'TOKEN_REFRESH_SKIP',
        accountId: account.id,
        reason: 'No refresh token available (manual token entry)',
        mlUserId: account.mlUserId,
      });
      
      return {
        success: false,
        accountId: account.id,
        reason: 'No refresh token',
      };
    }

    // Check if we have client credentials for this account
    if (!account.clientId || !account.clientSecret) {
      logger.warn({
        action: 'TOKEN_REFRESH_SKIP',
        accountId: account.id,
        reason: 'No client credentials available (manual token entry without OAuth)',
        mlUserId: account.mlUserId,
      });
      
      return {
        success: false,
        accountId: account.id,
        reason: 'No client credentials',
      };
    }

    logger.info({
      action: 'TOKEN_REFRESH_START',
      accountId: account.id,
      mlUserId: account.mlUserId,
      nickname: account.nickname,
      clientId: account.clientId.substring(0, 8) + '***',
    });

    // Call Mercado Libre OAuth endpoint to refresh token
    // Using the account's own client credentials (not the app's credentials)
    const response = await axios.post(`${ML_OAUTH_URL}/oauth/token`, {
      grant_type: 'refresh_token',
      client_id: account.clientId,
      client_secret: account.clientSecret,
      refresh_token: account.refreshToken,
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000, // 10 second timeout
    });

    const { access_token, refresh_token, expires_in } = response.data;

    if (!access_token || !refresh_token || !expires_in) {
      throw new Error('Invalid token response from Mercado Libre');
    }

    // Update account with new tokens
    await account.refreshedTokens(access_token, refresh_token, expires_in);

    logger.info({
      action: 'TOKEN_REFRESH_SUCCESS',
      accountId: account.id,
      mlUserId: account.mlUserId,
      nickname: account.nickname,
      expiresIn: expires_in,
      newTokenExpiresAt: account.tokenExpiresAt,
    });

    return {
      success: true,
      accountId: account.id,
      mlUserId: account.mlUserId,
      expiresIn,
    };
  } catch (error) {
    logger.error({
      action: 'TOKEN_REFRESH_FAILED',
      accountId: account.id,
      mlUserId: account.mlUserId,
      error: error.message,
      statusCode: error.response?.status,
      responseData: error.response?.data,
    });

    // Mark account with error
    await account.updateTokenRefreshStatus('failed', error.message);

    return {
      success: false,
      accountId: account.id,
      mlUserId: account.mlUserId,
      error: error.message,
      statusCode: error.response?.status,
    };
  }
}

/**
 * Main job function - runs hourly
 */
async function tokenRefreshJob() {
  const startTime = new Date();
  
  try {
    logger.info({
      action: 'TOKEN_REFRESH_JOB_START',
      timestamp: startTime.toISOString(),
    });

    // Find all accounts that need token refresh
    // These are accounts with:
    // - refreshToken available (came from OAuth)
    // - status active or paused (not deleted)
    // - nextTokenRefreshNeeded <= now OR never refreshed
    const accountsNeedingRefresh = await MLAccount.find({
      refreshToken: { $exists: true, $ne: null },
      status: { $in: ['active', 'paused'] },
      $or: [
        { nextTokenRefreshNeeded: { $lte: new Date() } },
        { lastTokenRefresh: null },
      ],
    });

    logger.info({
      action: 'TOKEN_REFRESH_JOB_FOUND',
      count: accountsNeedingRefresh.length,
      timestamp: new Date().toISOString(),
    });

    if (accountsNeedingRefresh.length === 0) {
      logger.info({
        action: 'TOKEN_REFRESH_JOB_COMPLETE',
        message: 'No accounts need token refresh',
        duration: `${new Date() - startTime}ms`,
      });
      return;
    }

    // Refresh each account's token
    const results = [];
    for (const account of accountsNeedingRefresh) {
      const result = await refreshAccountToken(account);
      results.push(result);
      
      // Add small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summarize results
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info({
      action: 'TOKEN_REFRESH_JOB_COMPLETE',
      total: results.length,
      successful,
      failed,
      duration: `${new Date() - startTime}ms`,
      timestamp: new Date().toISOString(),
      details: results,
    });
  } catch (error) {
    logger.error({
      action: 'TOKEN_REFRESH_JOB_ERROR',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Start the token refresh job
 * Runs every hour
 */
function startTokenRefreshJob() {
  try {
    // Run every hour at minute 0
    // This ensures consistent timing
    const job = schedule.scheduleJob('0 * * * *', tokenRefreshJob);

    logger.info({
      action: 'TOKEN_REFRESH_JOB_SCHEDULED',
      schedule: '0 * * * * (every hour at minute 0)',
      nextRun: job.nextInvocation(),
    });

    // Also run immediately on startup (with small delay)
    setTimeout(() => {
      logger.info({
        action: 'TOKEN_REFRESH_JOB_STARTUP_RUN',
        timestamp: new Date().toISOString(),
      });
      tokenRefreshJob();
    }, 5000); // Wait 5 seconds for DB to be ready

    return job;
  } catch (error) {
    logger.error({
      action: 'TOKEN_REFRESH_JOB_FAILED_TO_SCHEDULE',
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  startTokenRefreshJob,
  tokenRefreshJob,
  refreshAccountToken,
};
