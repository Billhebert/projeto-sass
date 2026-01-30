/**
 * Token Refresh Job
 * 
 * Runs every 5 minutes to refresh tokens that are about to expire
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

const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';

/**
 * Refresh a single account's token
 * 
 * Uses account's credentials if available, otherwise uses .env credentials
 * This allows automatic refresh for ANY account that has a refreshToken
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
        reason: 'No refresh token available',
        mlUserId: account.mlUserId,
      });
      
      return {
        success: false,
        accountId: account.id,
        reason: 'No refresh token',
      };
    }

    // Use account credentials if available, otherwise use .env credentials
    const clientId = account.clientId || process.env.ML_CLIENT_ID;
    const clientSecret = account.clientSecret || process.env.ML_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error({
        action: 'TOKEN_REFRESH_SKIP',
        accountId: account.id,
        reason: 'No credentials available (neither account nor .env)',
        mlUserId: account.mlUserId,
      });
      
      return {
        success: false,
        accountId: account.id,
        reason: 'No credentials available',
      };
    }

    logger.info({
      action: 'TOKEN_REFRESH_START',
      accountId: account.id,
      mlUserId: account.mlUserId,
      nickname: account.nickname,
      usingEnvCredentials: !account.clientId,
    });

    // Call Mercado Libre OAuth endpoint to refresh token
    const response = await axios.post(ML_TOKEN_URL, {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refreshToken,
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000,
    });

    const { access_token, refresh_token, expires_in } = response.data;

    if (!access_token || !expires_in) {
      throw new Error('Invalid token response from Mercado Libre');
    }

    // Update account with new tokens
    await account.refreshedTokens(access_token, refresh_token || account.refreshToken, expires_in);
    
    // Reactivate account if it was expired
    if (account.status === 'expired') {
      account.status = 'active';
      await account.save();
    }

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
 * Main job function - runs every 5 minutes
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
    // - refreshToken available (came from OAuth or manual input)
    // - status active, paused, or expired (try to reactivate expired ones)
    // - tokenExpiresAt is in the past OR within 30 minutes
    // 
    // Note: We no longer require clientId/clientSecret in the account.
    // The refreshAccountToken() function will use .env credentials as fallback.
    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);
    
    const accountsNeedingRefresh = await MLAccount.find({
      refreshToken: { $exists: true, $ne: null },
      status: { $in: ['active', 'paused', 'expired'] },
      $or: [
        { tokenExpiresAt: { $lte: thirtyMinutesFromNow } }, // Token expires within 30 min
        { lastTokenRefresh: null }, // Never refreshed
        { nextTokenRefreshNeeded: { $lte: new Date() } }, // Scheduled refresh
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
 * Runs every 5 minutes
 */
function startTokenRefreshJob() {
  try {
    // Run every 5 minutes
    // This ensures tokens are refreshed well before they expire
    const job = schedule.scheduleJob('*/5 * * * *', tokenRefreshJob);

    logger.info({
      action: 'TOKEN_REFRESH_JOB_SCHEDULED',
      schedule: '*/5 * * * * (every 5 minutes)',
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
