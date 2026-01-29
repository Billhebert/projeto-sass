/**
 * ML Accounts Routes
 * Gerenciamento de múltiplas contas Mercado Livre por usuário
 *
 * GET    /api/ml-accounts                    - Listar contas do usuário
 * GET    /api/ml-accounts/:accountId         - Obter dados de uma conta
 * POST   /api/ml-accounts                    - Adicionar nova conta
 * PUT    /api/ml-accounts/:accountId         - Atualizar conta
 * DELETE /api/ml-accounts/:accountId         - Remover conta
 * POST   /api/ml-accounts/:accountId/sync    - Sincronizar conta
 * POST   /api/ml-accounts/sync-all           - Sincronizar todas as contas
 * PUT    /api/ml-accounts/:accountId/pause   - Pausar sincronização
 * PUT    /api/ml-accounts/:accountId/resume  - Retomar sincronização
 * PUT    /api/ml-accounts/:accountId/refresh-token - Refresh token manualmente
 */

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');
const MLAccount = require('../db/models/MLAccount');
const MLTokenManager = require('../utils/ml-token-manager');
const User = require('../db/models/User');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * GET /api/ml-accounts
 * Listar todas as contas ML do usuário
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const accounts = await MLAccount.findByUserId(req.user.userId);

    res.json({
      success: true,
      data: {
        accounts: accounts.map(acc => acc.getSummary()),
        total: accounts.length,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ML_ACCOUNTS_ERROR',
      userId: req.user.userId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch ML accounts',
      error: error.message,
    });
  }
});

/**
 * GET /api/ml-accounts/:accountId
 * Obter dados de uma conta específica
 */
router.get('/:accountId', authenticateToken, async (req, res) => {
  try {
    const account = await MLAccount.findOne({
      id: req.params.accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    res.json({
      success: true,
      data: account.getSummary(),
    });
  } catch (error) {
    logger.error({
      action: 'GET_ML_ACCOUNT_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch account',
      error: error.message,
    });
  }
});

/**
 * POST /api/ml-accounts
 * Adicionar nova conta ML
 * Agora aceita apenas o access token
 * Busca automaticamente as informações do usuário da API ML
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { accessToken, accountName, accountType } = req.body;

    // Validação
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required',
        required: ['accessToken'],
      });
    }

    // Buscar informações do usuário na API ML
    let mlUserInfo;
    try {
      const response = await axios.get(`${ML_API_BASE}/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
      mlUserInfo = response.data;
    } catch (error) {
      logger.error({
        action: 'GET_ML_USER_INFO_ERROR',
        error: error.response?.data || error.message,
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid access token. Could not retrieve user information from Mercado Livre.',
        error: error.response?.data?.message || error.message,
      });
    }

    // Verificar se usuário já tem essa conta
    const existingAccount = await MLAccount.findOne({
      userId: req.user.userId,
      mlUserId: mlUserInfo.id,
    });

    if (existingAccount) {
      return res.status(409).json({
        success: false,
        message: 'This Mercado Livre account is already connected',
      });
    }

    // Verificar se é a primeira conta (será primária)
    const existingAccounts = await MLAccount.findByUserId(req.user.userId);
    const isPrimary = existingAccounts.length === 0;

    // Criar nova conta
    const newAccount = new MLAccount({
      userId: req.user.userId,
      mlUserId: mlUserInfo.id,
      nickname: mlUserInfo.nickname,
      email: mlUserInfo.email,
      accessToken,
      refreshToken: null, // Sem refresh token, usuário fornece novo token quando expirar
      tokenExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 horas (padrão do ML)
      accountName: accountName || mlUserInfo.nickname,
      accountType: accountType || 'individual',
      isPrimary,
      status: 'active',
    });

    await newAccount.save();

    // Atualizar contador de contas do usuário
    await User.updateOne(
      { _id: req.user.userId },
      {
        $inc: { 'metadata.totalAccounts': 1 },
        $set: { 'metadata.accountsLimit': Math.max(5, existingAccounts.length + 1) },
      }
    );

    logger.info({
      action: 'ML_ACCOUNT_ADDED',
      userId: req.user.userId,
      accountId: newAccount.id,
      mlUserId: mlUserInfo.id,
      nickname: mlUserInfo.nickname,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Account added successfully',
      data: newAccount.getSummary(),
    });
  } catch (error) {
    logger.error({
      action: 'ADD_ML_ACCOUNT_ERROR',
      userId: req.user.userId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to add account',
      error: error.message,
    });
  }
});

/**
 * PUT /api/ml-accounts/:accountId
 * Atualizar dados da conta
 */
router.put('/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountName, isPrimary, syncInterval, notificationsEnabled } = req.body;

    const account = await MLAccount.findOne({
      id: req.params.accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Atualizar campos permitidos
    if (accountName) account.accountName = accountName;
    if (syncInterval) account.syncInterval = syncInterval;
    if (notificationsEnabled !== undefined) account.notificationsEnabled = notificationsEnabled;

    // Se marcar como primária, desmarcar outras
    if (isPrimary === true && !account.isPrimary) {
      await MLAccount.updateMany(
        { userId: req.user.userId, isPrimary: true },
        { isPrimary: false }
      );
      account.isPrimary = true;
    }

    await account.save();

    logger.info({
      action: 'ML_ACCOUNT_UPDATED',
      userId: req.user.userId,
      accountId: account.id,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Account updated successfully',
      data: account.getSummary(),
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_ML_ACCOUNT_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update account',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/ml-accounts/:accountId
 * Remover conta
 */
router.delete('/:accountId', authenticateToken, async (req, res) => {
  try {
    const account = await MLAccount.findOne({
      id: req.params.accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Se era primária, tornar outra como primária
    if (account.isPrimary) {
      const nextAccount = await MLAccount.findOne({
        userId: req.user.userId,
        id: { $ne: req.params.accountId },
      }).sort({ createdAt: 1 });

      if (nextAccount) {
        nextAccount.isPrimary = true;
        await nextAccount.save();
      }
    }

    await MLAccount.deleteOne({ id: req.params.accountId });

    // Atualizar contador
    await User.updateOne(
      { _id: req.user.userId },
      { $inc: { 'metadata.totalAccounts': -1 } }
    );

    logger.info({
      action: 'ML_ACCOUNT_REMOVED',
      userId: req.user.userId,
      accountId: account.id,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Account removed successfully',
    });
  } catch (error) {
    logger.error({
      action: 'REMOVE_ML_ACCOUNT_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to remove account',
      error: error.message,
    });
  }
});

/**
 * POST /api/ml-accounts/:accountId/sync
 * Sincronizar uma conta específica
 */
router.post('/:accountId/sync', authenticateToken, async (req, res) => {
  try {
    const account = await MLAccount.findOne({
      id: req.params.accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Verificar se token está expirado
    if (account.isTokenExpired()) {
      return res.status(401).json({
        success: false,
        message: 'Account token has expired. Please reconnect the account.',
        code: 'TOKEN_EXPIRED',
      });
    }

    await account.updateSyncStatus('in_progress');

    // Buscar dados
    const accountData = await fetchMLAccountData(account.mlUserId, account.accessToken);
    await account.updateCachedData(accountData);
    await account.updateSyncStatus('success');

    await account.touchLastActivity();

    logger.info({
      action: 'ML_ACCOUNT_SYNCED',
      accountId: account.id,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Account synchronized successfully',
      data: {
        accountId: account.id,
        syncedAt: account.lastSync,
        data: account.cachedData,
      },
    });
  } catch (error) {
    const account = await MLAccount.findOne({
      id: req.params.accountId,
      userId: req.user.userId,
    });

    if (account) {
      await account.updateSyncStatus('failed', error.message);

      if (error.response?.status === 401) {
        account.status = 'expired';
        await account.save();
      }
    }

    logger.error({
      action: 'ML_ACCOUNT_SYNC_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to synchronize account',
      error: error.message,
    });
  }
});

/**
 * POST /api/ml-accounts/sync-all
 * Sincronizar todas as contas do usuário
 */
router.post('/sync-all', authenticateToken, async (req, res) => {
  try {
    const accounts = await MLAccount.findByUserId(req.user.userId);

    if (accounts.length === 0) {
      return res.json({
        success: true,
        message: 'No accounts to sync',
        data: {
          results: [],
          summary: {
            total: 0,
            successful: 0,
            failed: 0,
          },
        },
      });
    }

    logger.info({
      action: 'SYNC_ALL_STARTED',
      userId: req.user.userId,
      accountCount: accounts.length,
      timestamp: new Date().toISOString(),
    });

    // Sincronizar em paralelo
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        if (account.isTokenExpired()) {
          await account.updateSyncStatus('failed', 'Token expired');
          account.status = 'expired';
          await account.save();
          return {
            accountId: account.id,
            success: false,
            error: 'Token expired',
          };
        }

        try {
          await account.updateSyncStatus('in_progress');
          const data = await fetchMLAccountData(account.mlUserId, account.accessToken);
          await account.updateCachedData(data);
          await account.updateSyncStatus('success');
          await account.touchLastActivity();

          return {
            accountId: account.id,
            success: true,
            data,
          };
        } catch (error) {
          await account.updateSyncStatus('failed', error.message);
          return {
            accountId: account.id,
            success: false,
            error: error.message,
          };
        }
      })
    );

    const syncResults = results.map((r) => r.value || r.reason);
    const successful = syncResults.filter((r) => r.success).length;

    logger.info({
      action: 'SYNC_ALL_COMPLETED',
      userId: req.user.userId,
      totalAccounts: accounts.length,
      successfulSyncs: successful,
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
      userId: req.user.userId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to sync all accounts',
      error: error.message,
    });
  }
});

/**
 * PUT /api/ml-accounts/:accountId/pause
 * Pausar sincronização
 */
router.put('/:accountId/pause', authenticateToken, async (req, res) => {
  try {
    const account = await MLAccount.findOne({
      id: req.params.accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    await account.pauseSync();

    logger.info({
      action: 'ML_ACCOUNT_PAUSED',
      accountId: account.id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Account synchronization paused',
      data: account.getSummary(),
    });
  } catch (error) {
    logger.error({
      action: 'PAUSE_ML_ACCOUNT_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to pause account',
      error: error.message,
    });
  }
});

/**
 * PUT /api/ml-accounts/:accountId/resume
 * Retomar sincronização
 */
router.put('/:accountId/resume', authenticateToken, async (req, res) => {
  try {
    const account = await MLAccount.findOne({
      id: req.params.accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    await account.resumeSync();

    logger.info({
      action: 'ML_ACCOUNT_RESUMED',
      accountId: account.id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Account synchronization resumed',
      data: account.getSummary(),
    });
  } catch (error) {
    logger.error({
      action: 'RESUME_ML_ACCOUNT_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to resume account',
      error: error.message,
    });
  }
});

/**
 * PUT /api/ml-accounts/:accountId/refresh-token
 * Refresh account token manually
 */
router.put('/:accountId/refresh-token', authenticateToken, async (req, res) => {
  try {
    const account = await MLAccount.findOne({
      id: req.params.accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    if (!account.refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Cannot refresh token: refresh token not available',
        code: 'NO_REFRESH_TOKEN',
      });
    }

    // Attempt token refresh
    const refreshResult = await MLTokenManager.refreshToken(
      account.refreshToken,
      process.env.ML_CLIENT_ID,
      process.env.ML_CLIENT_SECRET
    );

    if (!refreshResult.success) {
      logger.error({
        action: 'ML_ACCOUNT_TOKEN_REFRESH_FAILED',
        accountId: account.id,
        userId: req.user.userId,
        error: refreshResult.error,
      });

      // Mark account as expired if token refresh failed
      account.status = 'expired';
      await account.save();

      return res.status(401).json({
        success: false,
        message: 'Failed to refresh token',
        error: refreshResult.error,
        code: 'TOKEN_REFRESH_FAILED',
      });
    }

    // Update account with new tokens
    account.accessToken = refreshResult.accessToken;
    account.refreshToken = refreshResult.refreshToken;
    account.tokenExpiresAt = refreshResult.tokenExpiresAt;
    account.lastTokenRefresh = new Date();
    account.status = 'active';
    await account.save();

    logger.info({
      action: 'ML_ACCOUNT_TOKEN_REFRESHED',
      accountId: account.id,
      userId: req.user.userId,
      expiresAt: refreshResult.tokenExpiresAt,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accountId: account.id,
        status: account.status,
        tokenExpiresAt: refreshResult.tokenExpiresAt,
        tokenInfo: MLTokenManager.getTokenInfo(account),
      },
    });
  } catch (error) {
    logger.error({
      action: 'REFRESH_TOKEN_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message,
    });
  }
});

/**
 * GET /api/ml-accounts/:accountId/token-info
 * Get token expiry information and health
 */
router.get('/:accountId/token-info', authenticateToken, async (req, res) => {
  try {
    const account = await MLAccount.findOne({
      id: req.params.accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    const tokenInfo = MLTokenManager.getTokenInfo(account);

    res.json({
      success: true,
      data: {
        accountId: account.id,
        tokenInfo,
        status: account.status,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_TOKEN_INFO_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get token info',
      error: error.message,
    });
  }
});

/**
 * Buscar dados da conta no Mercado Livre
 */
async function fetchMLAccountData(mlUserId, accessToken) {
  try {
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
      logger.warn({
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
    logger.error({
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

module.exports = router;
