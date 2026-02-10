/**
 * Sync Routes - Sincronização de Contas Mercado Livre
 * 
 * GET  /api/sync/account/:accountId      - Get account data
 * POST /api/sync/account/:accountId      - Trigger sync
 * POST /api/sync/all                     - Sync all accounts
 * GET  /api/sync/status/:accountId       - Get sync status
 */

const express = require('express');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { handleError, sendSuccess } = require('../middleware/response-helpers');

const router = express.Router();

/**
 * GET /api/sync/account/:accountId
 * Obter dados atuais da conta
 */
router.get('/account/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const accessToken = req.headers['x-access-token'] || req.body.accessToken;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required',
        code: 'MISSING_TOKEN',
      });
    }

    // Buscar dados da conta no Mercado Livre
    const accountData = await fetchMLAccountData(accountId, accessToken);

    res.json({
      success: true,
      data: {
        products: accountData.products,
        orders: accountData.orders,
        issues: accountData.issues,
        lastUpdate: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({
      action: 'SYNC_ACCOUNT_ERROR',
      accountId: req.params.accountId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch account data',
      code: 'SYNC_ERROR',
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/account/:accountId
 * Disparar sincronização para uma conta
 */
router.post('/account/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const accessToken = req.headers['x-access-token'] || req.body.accessToken;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required',
        code: 'MISSING_TOKEN',
      });
    }

    logger.info({
      action: 'SYNC_STARTED',
      accountId,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    // Buscar dados da conta
    const accountData = await fetchMLAccountData(accountId, accessToken);

    logger.info({
      action: 'SYNC_COMPLETED',
      accountId,
      products: accountData.products,
      orders: accountData.orders,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Sync completed successfully',
      data: {
        products: accountData.products,
        orders: accountData.orders,
        issues: accountData.issues,
        lastSync: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({
      action: 'SYNC_ERROR',
      accountId: req.params.accountId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Sync failed',
      code: 'SYNC_ERROR',
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/all
 * Sincronizar todas as contas do usuário
 */
router.post('/all', authenticateToken, async (req, res) => {
  try {
    const { accounts } = req.body;

    if (!Array.isArray(accounts)) {
      return res.status(400).json({
        success: false,
        message: 'Accounts array is required',
        code: 'INVALID_INPUT',
      });
    }

    logger.info({
      action: 'SYNC_ALL_STARTED',
      accountCount: accounts.length,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    // Sincronizar todas as contas em paralelo
    const results = await Promise.allSettled(
      accounts.map(account =>
        fetchMLAccountData(account.id, account.accessToken)
          .then(data => ({
            accountId: account.id,
            success: true,
            data,
          }))
          .catch(error => ({
            accountId: account.id,
            success: false,
            error: error.message,
          }))
      )
    );

    const syncResults = results.map(r => r.value);
    const successful = syncResults.filter(r => r.success).length;

    logger.info({
      action: 'SYNC_ALL_COMPLETED',
      totalAccounts: accounts.length,
      successfulSyncs: successful,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Synchronized ${successful}/${accounts.length} accounts`,
      data: {
        results: syncResults,
        summary: {
          total: accounts.length,
          successful,
          failed: accounts.length - successful,
        },
      },
    });
  } catch (error) {
    logger.error({
      action: 'SYNC_ALL_ERROR',
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Bulk sync failed',
      code: 'BULK_SYNC_ERROR',
      error: error.message,
    });
  }
});

/**
 * GET /api/sync/status/:accountId
 * Obter status de sincronização
 */
router.get('/status/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Aqui você buscaria o status do banco de dados
    // Por enquanto, retornamos um status simulado
    const status = {
      accountId,
      syncing: false,
      lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      nextSync: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      syncInterval: '5 minutos',
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error({
      action: 'STATUS_CHECK_ERROR',
      accountId: req.params.accountId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      code: 'STATUS_ERROR',
    });
  }
});

/**
 * Buscar dados da conta no Mercado Livre
 * @param {string} accountId - Account ID
 * @param {string} accessToken - Token de acesso
 */
async function fetchMLAccountData(accountId, accessToken) {
  try {
    // Buscar informações do usuário usando SDK
    const user = await sdkManager.getMe(accountId);

    // Buscar produtos usando SDK
    const productsData = await sdkManager.getAllUserItems(accountId, user.id);
    const productsCount = productsData.paging?.total || 0;

    // Buscar pedidos usando SDK
    const ordersData = await sdkManager.getAllOrders(accountId, user.id);
    const ordersCount = ordersData.paging?.total || 0;

    // Buscar questões usando SDK
    let issuesCount = 0;
    try {
      const questionsData = await sdkManager.getAllSellerQuestions(accountId, user.id);
      issuesCount = questionsData.paging?.total || 0;
    } catch (error) {
      logger.warn({
        action: 'FETCH_ISSUES_FAILED',
        accountId,
        error: error.message,
      });
    }

    return {
      userId: user.id,
      nickname: user.nickname,
      email: user.email,
      products: productsCount,
      orders: ordersCount,
      issues: issuesCount,
      lastUpdate: new Date().toISOString(),
    };
  } catch (error) {
    logger.error({
      action: 'FETCH_ML_DATA_ERROR',
      accountId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    if (error.response?.status === 401) {
      throw new Error('Token expirado ou inválido');
    }

    throw new Error(`Falha ao buscar dados do Mercado Livre: ${error.message}`);
  }
}


module.exports = router;
