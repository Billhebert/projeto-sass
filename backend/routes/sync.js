/**
 * Sync Routes
 * 
 * POST /api/sync/account/:accountId   - Sync single account
 * POST /api/sync/all                  - Sync all accounts
 * GET  /api/sync/status/:accountId    - Get sync status
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

// Database functions
const { 
  getAccount,
  getAllAccounts,
  updateAccount
} = require('../db/accounts');

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * POST /api/sync/account/:accountId
 * 
 * Trigger sync for a single account
 * Fetches products, orders, and metrics from Mercado Livre
 */
router.post('/account/:accountId', async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await getAccount(accountId);

    if (!account) {
      return res.status(404).json({ 
        error: 'Account not found'
      });
    }

    if (account.status !== 'connected' || !account.accessToken) {
      return res.status(401).json({ 
        error: 'Account not connected'
      });
    }

    // Start sync asynchronously
    res.json({
      status: 'syncing',
      message: 'Sync started for account',
      accountId
    });

    // Process sync in background
    syncAccountData(account)
      .catch(error => console.error('Sync error:', error));

  } catch (error) {
    console.error('Error starting sync:', error.message);
    next(error);
  }
});

/**
 * POST /api/sync/all
 * 
 * Trigger sync for all connected accounts
 */
router.post('/all', async (req, res, next) => {
  try {
    const accounts = await getAllAccounts();
    const connectedAccounts = accounts.filter(a => a.status === 'connected' && a.accessToken);

    res.json({
      status: 'syncing',
      message: `Sync started for ${connectedAccounts.length} accounts`,
      count: connectedAccounts.length
    });

    // Process syncs in background
    Promise.all(
      connectedAccounts.map(account => syncAccountData(account))
    ).catch(error => console.error('Bulk sync error:', error));

  } catch (error) {
    console.error('Error starting bulk sync:', error.message);
    next(error);
  }
});

/**
 * GET /api/sync/status/:accountId
 * 
 * Get sync status for an account
 */
router.get('/status/:accountId', async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await getAccount(accountId);

    if (!account) {
      return res.status(404).json({ 
        error: 'Account not found'
      });
    }

    res.json({
      accountId: account.id,
      syncStatus: account.lastSyncStatus || 'never',
      lastSyncTime: account.lastSyncTime || null,
      accountStatus: account.status
    });

  } catch (error) {
    console.error('Error fetching sync status:', error.message);
    next(error);
  }
});

// ============================================
// SYNC IMPLEMENTATION
// ============================================

/**
 * Sync account data from Mercado Livre
 */
async function syncAccountData(account) {
  const startTime = Date.now();
  console.log(`Starting sync for account: ${account.id}`);

  try {
    // Update sync status
    account.lastSyncStatus = 'in_progress';
    account.lastSyncTime = new Date().toISOString();
    await updateAccount(account.id, account);

    // Fetch data in parallel for better performance
    const [itemsData, ordersData, userMetrics] = await Promise.all([
      fetchAccountItems(account.accessToken, account.userId),
      fetchAccountOrders(account.accessToken),
      fetchUserMetrics(account.accessToken, account.userId)
    ]);

    // Prepare sync summary
    const syncData = {
      itemsCount: itemsData.length,
      ordersCount: ordersData.length,
      metrics: userMetrics,
      syncedAt: new Date().toISOString()
    };

    // Update account with sync results
    account.lastSyncStatus = 'success';
    account.lastSyncData = syncData;
    account.updatedAt = new Date().toISOString();
    await updateAccount(account.id, account);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Sync completed for account ${account.id} (${duration}s) - Items: ${itemsData.length}, Orders: ${ordersData.length}`);

    // Notify WebSocket clients
    const notifyAccountUpdate = require('../server').app.locals.notifyAccountUpdate;
    notifyAccountUpdate(account.id, {
      type: 'sync-complete',
      status: 'success',
      data: syncData
    });

  } catch (error) {
    console.error(`Sync failed for account ${account.id}:`, error.message);

    // Update account with error status
    account.lastSyncStatus = 'failed';
    account.lastSyncError = error.message;
    account.updatedAt = new Date().toISOString();
    await updateAccount(account.id, account);

    // Notify WebSocket clients of error
    const notifyAccountUpdate = require('../server').app.locals.notifyAccountUpdate;
    notifyAccountUpdate(account.id, {
      type: 'sync-error',
      status: 'failed',
      error: error.message
    });
  }
}

/**
 * Fetch user's items/products from Mercado Livre
 */
async function fetchAccountItems(accessToken, userId) {
  try {
    const response = await axios.get(
      `${ML_API_BASE}/users/${userId}/items/search?search_type=active`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          limit: 100,
          offset: 0
        },
        timeout: 20000
      }
    );

    return response.data.results || [];
  } catch (error) {
    console.error('Error fetching items:', error.message);
    return [];
  }
}

/**
 * Fetch user's orders from Mercado Livre
 */
async function fetchAccountOrders(accessToken) {
  try {
    const response = await axios.get(
      `${ML_API_BASE}/orders/search`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          limit: 100,
          offset: 0,
          sort: 'date_desc'
        },
        timeout: 20000
      }
    );

    return response.data.results || [];
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    return [];
  }
}

/**
 * Fetch user metrics from Mercado Livre
 */
async function fetchUserMetrics(accessToken, userId) {
  try {
    const response = await axios.get(
      `${ML_API_BASE}/users/${userId}/reputation`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 15000
      }
    );

    return response.data || {};
  } catch (error) {
    console.error('Error fetching metrics:', error.message);
    return {};
  }
}

module.exports = router;
