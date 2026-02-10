/**
 * Accounts Routes
 * 
 * GET  /api/accounts              - List all accounts
 * GET  /api/accounts/:accountId   - Get single account
 * DELETE /api/accounts/:accountId - Delete account
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

// Database functions
const { 
  getAllAccounts,
  getAccount,
  deleteAccount
} = require('../db/accounts');

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * GET /api/accounts
 * 
 * List all connected accounts with their status and summary
 * 
 * Response:
 * {
 *   accounts: [
 *     {
 *       id: string,
 *       userId: number,
 *       nickname: string,
 *       email: string,
 *       status: string,
 *       lastSyncTime: string,
 *       lastSyncStatus: string
 *     }
 *   ]
 * }
 */
router.get('/', async (req, res, next) => {
  try {
    const accounts = await getAllAccounts();

    // Filter out sensitive data
    const safeAccounts = accounts.map(account => ({
      id: account.id,
      userId: account.userId,
      nickname: account.nickname,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      status: account.status,
      lastSyncTime: account.lastSyncTime,
      lastSyncStatus: account.lastSyncStatus,
      createdAt: account.createdAt,
      tokenExpiry: account.tokenExpiry
    }));

    res.json({
      accounts: safeAccounts,
      total: safeAccounts.length
    });

  } catch (error) {
    console.error('Error fetching accounts:', error.message);
    next(error);
  }
});

/**
 * GET /api/accounts/:accountId
 * 
 * Get details of a specific account
 * 
 * Response:
 * {
 *   account: { ... }
 * }
 */
router.get('/:accountId', async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await getAccount(accountId);

    if (!account) {
      return res.status(404).json({ 
        error: 'Account not found',
        accountId
      });
    }

    // Return safe data without tokens
    res.json({
      account: {
        id: account.id,
        userId: account.userId,
        nickname: account.nickname,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        status: account.status,
        lastSyncTime: account.lastSyncTime,
        lastSyncStatus: account.lastSyncStatus,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        tokenExpiry: account.tokenExpiry
      }
    });

  } catch (error) {
    console.error('Error fetching account:', error.message);
    next(error);
  }
});

/**
 * GET /api/accounts/:accountId/summary
 * 
 * Get account summary from Mercado Livre
 * Includes user metrics, reputation, sales info
 */
router.get('/:accountId/summary', async (req, res, next) => {
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
        error: 'Account not connected',
        details: 'Access token not available'
      });
    }

    // Fetch user summary from ML
    const summary = await getUserSummary(account.accessToken, account.userId);

    res.json({
      accountId: account.id,
      summary
    });

  } catch (error) {
    console.error('Error fetching account summary:', error.message);
    next(error);
  }
});

/**
 * DELETE /api/accounts/:accountId
 * 
 * Disconnect and remove an account
 */
router.delete('/:accountId', async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await getAccount(accountId);

    if (!account) {
      return res.status(404).json({ 
        error: 'Account not found'
      });
    }

    // Delete the account
    await deleteAccount(accountId);

    res.json({
      success: true,
      message: 'Account deleted successfully',
      accountId
    });

  } catch (error) {
    console.error('Error deleting account:', error.message);
    next(error);
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get user summary from Mercado Livre
 */
async function getUserSummary(accessToken, userId) {
  try {
    const response = await axios.get(
      `${ML_API_BASE}/users/${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 15000
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching user summary:', error.message);
    throw new Error(`Failed to get user summary: ${error.message}`);
  }
}

module.exports = router;
