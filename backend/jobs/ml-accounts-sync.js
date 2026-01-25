/**
 * ML Accounts Background Sync Job
 * Executes periodic synchronizations for multiple ML accounts
 * Handles token refresh and error management
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const schedule = require('node-schedule');
const axios = require('axios');
const { connectDB } = require('../db/mongodb');
const MLAccount = require('../db/models/MLAccount');
const logger = require('../logger');

const logger_job = new logger.Logger('ML-SYNC-JOB');

const ML_API_BASE = 'https://api.mercadolibre.com';
const ML_OAUTH_URL = 'https://auth.mercadolibre.com';

/**
 * Refresh expired token
 */
async function refreshToken(account) {
  try {
    if (!account.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${ML_OAUTH_URL}/oauth/token`, {
      grant_type: 'refresh_token',
      client_id: process.env.ML_CLIENT_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      refresh_token: account.refreshToken,
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // Update account with new tokens
    account.accessToken = access_token;
    account.refreshToken = refresh_token;
    account.tokenExpiresAt = new Date(Date.now() + expires_in * 1000);
    account.lastTokenRefresh = new Date();

    await account.save();

    logger_job.info(`Token refreshed for account: ${account.id}`);
    return true;
  } catch (error) {
    logger_job.error({
      action: 'TOKEN_REFRESH_FAILED',
      accountId: account.id,
      mlUserId: account.mlUserId,
      error: error.message,
    });

    // Mark account as expired
    account.status = 'expired';
    await account.save();

    return false;
  }
}

/**
 * Fetch ML account data
 */
async function fetchMLAccountData(mlUserId, accessToken) {
  try {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get user info
    const userResponse = await axios.get(`${ML_API_BASE}/users/me`, { headers });
    const user = userResponse.data;

    // Get products count
    const productsResponse = await axios.get(
      `${ML_API_BASE}/users/${user.id}/items/search`,
      { headers }
    );
    const productsCount = productsResponse.data.total || 0;

    // Get orders count
    const ordersResponse = await axios.get(
      `${ML_API_BASE}/orders/search?seller=${user.id}&sort=date_desc&limit=1`,
      { headers }
    );
    const ordersCount = ordersResponse.data.total || 0;

    // Get issues count
    let issuesCount = 0;
    try {
      const issuesResponse = await axios.get(
        `${ML_API_BASE}/questions/search?seller_id=${user.id}`,
        { headers }
      );
      issuesCount = issuesResponse.data.total || 0;
    } catch (error) {
      logger_job.warn({
        action: 'FETCH_ISSUES_FAILED',
        mlUserId,
        error: error.message,
      });
    }

    return {
      products: productsCount,
      orders: ordersCount,
      issues: issuesCount,
    };
  } catch (error) {
    logger_job.error({
      action: 'FETCH_ML_DATA_ERROR',
      mlUserId,
      error: error.message,
      statusCode: error.response?.status,
    });

    if (error.response?.status === 401) {
      throw new Error('Token expirado ou inválido');
    }

    throw new Error(`Falha ao buscar dados do Mercado Livre: ${error.message}`);
  }
}

/**
 * Sync single ML account
 */
async function syncMLAccount(account) {
  try {
    // Check if token is expired
    if (account.isTokenExpired()) {
      logger_job.info(`Token expired for account ${account.id}, attempting refresh...`);
      const refreshed = await refreshToken(account);
      if (!refreshed) {
        return {
          accountId: account.id,
          success: false,
          error: 'Token refresh failed',
        };
      }
    }

    // Mark as syncing
    await account.updateSyncStatus('in_progress');

    // Fetch data
    const data = await fetchMLAccountData(account.mlUserId, account.accessToken);

    // Update cached data
    await account.updateCachedData(data);

    // Mark as success
    await account.updateSyncStatus('success');
    await account.touchLastActivity();

    logger_job.info({
      action: 'ML_ACCOUNT_SYNCED',
      accountId: account.id,
      mlUserId: account.mlUserId,
      products: data.products,
      orders: data.orders,
      issues: data.issues,
    });

    return {
      accountId: account.id,
      success: true,
      data,
    };
  } catch (error) {
    logger_job.error({
      action: 'ML_ACCOUNT_SYNC_ERROR',
      accountId: account.id,
      mlUserId: account.mlUserId,
      error: error.message,
    });

    await account.updateSyncStatus('failed', error.message);

    if (error.message.includes('Token')) {
      account.status = 'expired';
      await account.save();
    }

    return {
      accountId: account.id,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Sync all ML accounts that need synchronization
 */
async function syncAllMLAccounts() {
  try {
    logger_job.info('Starting ML accounts sync job');

    // Find accounts to sync
    const accountsToSync = await MLAccount.findAccountsToSync();

    if (accountsToSync.length === 0) {
      logger_job.info('No ML accounts to sync');
      return {
        total: 0,
        successful: 0,
        failed: 0,
      };
    }

    logger_job.info(`Found ${accountsToSync.length} accounts to sync`);

    // Sync in batches to avoid overwhelming ML API
    const BATCH_SIZE = 3;
    const results = [];

    for (let i = 0; i < accountsToSync.length; i += BATCH_SIZE) {
      const batch = accountsToSync.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(syncMLAccount));
      results.push(...batchResults);

      // Wait between batches
      if (i + BATCH_SIZE < accountsToSync.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger_job.info({
      action: 'ML_SYNC_JOB_COMPLETED',
      total: accountsToSync.length,
      successful,
      failed,
    });

    return {
      total: accountsToSync.length,
      successful,
      failed,
    };
  } catch (error) {
    logger_job.error({
      action: 'ML_SYNC_JOB_ERROR',
      error: error.message,
    });

    return {
      total: 0,
      successful: 0,
      failed: 0,
      error: error.message,
    };
  }
}

/**
 * Refresh expired tokens for all accounts
 */
async function refreshExpiredTokens() {
  try {
    logger_job.info('Starting token refresh job');

    const accountsWithExpiredTokens = await MLAccount.findAccountsWithExpiredTokens();

    if (accountsWithExpiredTokens.length === 0) {
      logger_job.info('No accounts with expired tokens');
      return;
    }

    logger_job.info(`Found ${accountsWithExpiredTokens.length} accounts with expired tokens`);

    const results = await Promise.allSettled(
      accountsWithExpiredTokens.map((account) => refreshToken(account))
    );

    const successful = results.filter((r) => r.value === true).length;
    const failed = results.filter((r) => r.value === false).length;

    logger_job.info({
      action: 'TOKEN_REFRESH_JOB_COMPLETED',
      total: accountsWithExpiredTokens.length,
      successful,
      failed,
    });
  } catch (error) {
    logger_job.error({
      action: 'TOKEN_REFRESH_JOB_ERROR',
      error: error.message,
    });
  }
}

/**
 * Cleanup old errors and sync logs
 */
async function cleanupOldErrors() {
  try {
    logger_job.info('Starting cleanup of old errors');

    // Clear error history for accounts with more than 20 errors
    const result = await MLAccount.updateMany(
      { 'errorHistory.1': { $exists: true } },
      [{ $set: { errorHistory: { $slice: ['$errorHistory', -20] } } }]
    );

    logger_job.info({
      action: 'CLEANUP_COMPLETED',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    logger_job.error({
      action: 'CLEANUP_ERROR',
      error: error.message,
    });
  }
}

/**
 * Health check - log active accounts
 */
async function healthCheck() {
  try {
    const activeAccounts = await MLAccount.countDocuments({ status: 'active' });
    const pausedAccounts = await MLAccount.countDocuments({ status: 'paused' });
    const expiredAccounts = await MLAccount.countDocuments({ status: 'expired' });
    const errorAccounts = await MLAccount.countDocuments({ status: 'error' });

    logger_job.info({
      action: 'HEALTH_CHECK',
      active: activeAccounts,
      paused: pausedAccounts,
      expired: expiredAccounts,
      error: errorAccounts,
      total: activeAccounts + pausedAccounts + expiredAccounts + errorAccounts,
    });
  } catch (error) {
    logger_job.error({
      action: 'HEALTH_CHECK_ERROR',
      error: error.message,
    });
  }
}

/**
 * Initialize all scheduled jobs
 */
async function initializeSchedules() {
  try {
    // Connect to database
    await connectDB();
    logger_job.info('✓ Connected to MongoDB');

    // Schedule: Sync ML accounts every 5 minutes
    schedule.scheduleJob('*/5 * * * *', async () => {
      await syncAllMLAccounts();
    });
    logger_job.info('✓ Scheduled: ML sync every 5 minutes');

    // Schedule: Refresh expired tokens every 30 minutes
    schedule.scheduleJob('*/30 * * * *', async () => {
      await refreshExpiredTokens();
    });
    logger_job.info('✓ Scheduled: Token refresh every 30 minutes');

    // Schedule: Cleanup old errors daily at 3 AM
    schedule.scheduleJob('0 3 * * *', async () => {
      await cleanupOldErrors();
    });
    logger_job.info('✓ Scheduled: Cleanup old errors daily at 3 AM');

    // Schedule: Health check every 15 minutes
    schedule.scheduleJob('*/15 * * * *', async () => {
      await healthCheck();
    });
    logger_job.info('✓ Scheduled: Health check every 15 minutes');

    logger_job.info('✓ All ML account schedules initialized');
  } catch (error) {
    logger_job.error({
      action: 'INITIALIZATION_ERROR',
      error: error.message,
    });
    process.exit(1);
  }
}

// Initialize job if run as main module
if (require.main === module) {
  initializeSchedules().catch((error) => {
    logger_job.error({
      action: 'FATAL_ERROR',
      error: error.message,
    });
    process.exit(1);
  });
}

module.exports = {
  syncMLAccount,
  syncAllMLAccounts,
  refreshToken,
  refreshExpiredTokens,
  cleanupOldErrors,
  healthCheck,
  initializeSchedules,
};
