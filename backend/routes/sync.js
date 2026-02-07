/**
 * Sync Routes - Sincronização de Contas Mercado Livre
 * 
 * GET  /api/sync/account/:accountId      - Get account data
 * POST /api/sync/account/:accountId      - Trigger sync
 * POST /api/sync/all                     - Sync all accounts
 * GET  /api/sync/status/:accountId       - Get sync status
 */

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// CORE HELPERS
// ============================================================================

/**
 * Handle and log errors with consistent response format
 */
const handleError = (res, statusCode = 500, message, error = null, context = {}) => {
  logger.error({
    action: context.action || 'UNKNOWN_ERROR',
    error: error?.message || message,
    statusCode,
    ...context,
  });

  const response = { success: false, message };
  if (error?.message) response.error = error.message;
  res.status(statusCode).json(response);
};

/**
 * Send success response with consistent format
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = { success: true, data };
  if (message) response.message = message;
  res.status(statusCode).json(response);
};



const ML_API_BASE = 'https://api.mercadolibre.com';
const ML_SANDBOX_BASE = 'https://api.mercadolibre.com'; // Usar sandbox em dev se necessário

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
 * @param {string} userId - ID do usuário no Mercado Livre
 * @param {string} accessToken - Token de acesso
 */
async function fetchMLAccountData(userId, accessToken) {
  try {
    // Headers padrão para requisições ao ML
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Buscar informações do usuário
    const userResponse = await axios.get(`${ML_API_BASE}/users/me`, { headers });
    const user = userResponse.data;

    // Buscar produtos
    const productsResponse = await axios.get(
      `${ML_API_BASE}/users/${user.id}/items/search`,
      { headers }
    );
    const productsCount = productsResponse.data.total || 0;

    // Buscar pedidos
    const ordersResponse = await axios.get(
      `${ML_API_BASE}/orders/search?seller=${user.id}&sort=date_desc&limit=1`,
      { headers }
    );
    const ordersCount = ordersResponse.data.total || 0;

    // Buscar questões/problemas
    let issuesCount = 0;
    try {
      const issuesResponse = await axios.get(
        `${ML_API_BASE}/questions/search?seller_id=${user.id}`,
        { headers }
      );
      issuesCount = issuesResponse.data.total || 0;
    } catch (error) {
      // Se falhar ao buscar questões, continua sem contar
      logger.warn({
        action: 'FETCH_ISSUES_FAILED',
        userId,
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
      userId,
      error: error.message,
      statusCode: error.response?.status,
      timestamp: new Date().toISOString(),
    });

    // Se for erro de autenticação
    if (error.response?.status === 401) {
      throw new Error('Token expirado ou inválido');
    }

    throw new Error(`Falha ao buscar dados do Mercado Livre: ${error.message}`);
  }
}


module.exports = router;
