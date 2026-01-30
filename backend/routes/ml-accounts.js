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
const { validateMLToken } = require('../middleware/ml-token-validation');
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
 * 
 * Aceita dois formatos:
 * 1. Token Manual: { accessToken, accountName? }
 *    - Usuário forneceu token manualmente
 *    - Sistema não pode renovar (sem refreshToken)
 * 
 * 2. OAuth: { accessToken, refreshToken, expiresIn, clientId, clientSecret, redirectUri, accountName? }
 *    - Usuário fez OAuth/login autorizado
 *    - Sistema pode renovar automaticamente com refreshToken + clientId + clientSecret
 * 
 * Sistema automaticamente busca info do usuário e salva tudo
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { accessToken, refreshToken, expiresIn, accountName, accountType, clientId, clientSecret, redirectUri } = req.body;

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

    // Calcular expiração do token
    // Se vem do OAuth, tem expiresIn
    // Se vem manual, assume 6 horas (padrão ML para user tokens)
    const tokenExpiresAtTime = expiresIn 
      ? Date.now() + expiresIn * 1000
      : Date.now() + 6 * 60 * 60 * 1000; // 6 horas como fallback

    // Criar nova conta
    const newAccount = new MLAccount({
      userId: req.user.userId,
      mlUserId: mlUserInfo.id,
      nickname: mlUserInfo.nickname,
      email: mlUserInfo.email,
      accessToken,
      refreshToken: refreshToken || null, // OAuth tem refreshToken, manual não
      tokenExpiresAt: new Date(tokenExpiresAtTime),
      // OAuth Credentials - needed for automatic token refresh
      clientId: clientId || null,
      clientSecret: clientSecret || null,
      redirectUri: redirectUri || null,
      accountName: accountName || mlUserInfo.nickname,
      accountType: accountType || 'individual',
      isPrimary,
      status: 'active',
      // Setup token refresh tracking
      lastTokenRefresh: refreshToken ? new Date() : null, // Marca como "já renovado" se tem refreshToken
      nextTokenRefreshNeeded: new Date(tokenExpiresAtTime - 5 * 60 * 1000), // 5 min antes de expirar
      tokenRefreshStatus: refreshToken ? 'success' : null, // Sucesso se veio do OAuth
    });

    await newAccount.save();

    // Atualizar contador de contas do usuário
    await User.updateOne(
      { id: req.user.userId },
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
      hasRefreshToken: !!refreshToken,
      hasClientCredentials: !!(clientId && clientSecret),
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Account added successfully',
      data: {
        ...newAccount.getSummary(),
        canAutoRefresh: !!(refreshToken && clientId && clientSecret), // Can auto-refresh if has all 3
      },
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
    const accountId = req.params.accountId;
    const userId = req.user.userId;

    logger.info({
      action: 'DELETE_ML_ACCOUNT_START',
      accountId,
      userId,
    });

    // Find account
    const account = await MLAccount.findOne({
      id: accountId,
      userId: userId,
    });

    if (!account) {
      logger.warn({
        action: 'DELETE_ML_ACCOUNT_NOT_FOUND',
        accountId,
        userId,
      });

      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    logger.info({
      action: 'DELETE_ML_ACCOUNT_FOUND',
      accountId,
      userId,
      mlUserId: account.mlUserId,
      nickname: account.nickname,
    });

    // Se era primária, tornar outra como primária
    if (account.isPrimary) {
      const nextAccount = await MLAccount.findOne({
        userId: userId,
        id: { $ne: accountId },
      }).sort({ createdAt: 1 });

      if (nextAccount) {
        nextAccount.isPrimary = true;
        await nextAccount.save();
        logger.info({
          action: 'DELETE_ML_ACCOUNT_PRIMARY_REASSIGNED',
          fromAccount: accountId,
          toAccount: nextAccount.id,
        });
      }
    }

    // Delete account
    const deleteResult = await MLAccount.deleteOne({ 
      id: accountId,
      userId: userId 
    });

    if (deleteResult.deletedCount === 0) {
      logger.warn({
        action: 'DELETE_ML_ACCOUNT_DELETE_FAILED',
        accountId,
        userId,
      });

      return res.status(400).json({
        success: false,
        message: 'Failed to delete account',
      });
    }

    // Update user account count
    await User.updateOne(
      { id: userId },
      { $inc: { 'metadata.totalAccounts': -1 } }
    );

    logger.info({
      action: 'DELETE_ML_ACCOUNT_SUCCESS',
      accountId,
      userId,
      mlUserId: account.mlUserId,
    });

    res.json({
      success: true,
      message: 'Account removed successfully',
      data: {
        accountId,
        mlUserId: account.mlUserId,
      },
    });
  } catch (error) {
    logger.error({
      action: 'DELETE_ML_ACCOUNT_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
      stack: error.stack,
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
 * 
 * Middleware validateMLToken:
 * - Verifies token is not expired
 * - Auto-refreshes if about to expire (if refreshToken available)
 * - Returns error if token is invalid/expired
 */
router.post('/:accountId/sync', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const account = req.mlAccount; // From middleware

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

/**
 * PUT /api/ml-accounts/:accountId/refresh-token
 * Renovar token manualmente
 * 
 * Usado quando:
 * - Usuário clica botão "Renovar Token" no painel
 * - Sistema pode chamar para garantir renovação antes de operação crítica
 * - Token expirou e precisa renovar urgentemente
 * 
 * Funciona APENAS se conta tem refreshToken
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

    // Verificar se tem refresh token
    if (!account.refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'This account does not have automatic token refresh capability. You need to reconnect using OAuth or provide a new token.',
        code: 'NO_REFRESH_TOKEN',
        solution: 'Reconnect account using OAuth or paste a new access token',
      });
    }

    logger.info({
      action: 'MANUAL_TOKEN_REFRESH_START',
      accountId: account.id,
      mlUserId: account.mlUserId,
      userId: req.user.userId,
    });

    // Call Mercado Livre to refresh token
    const result = await MLTokenManager.refreshToken(
      account.refreshToken,
      process.env.ML_APP_CLIENT_ID || '1706187223829083',
      process.env.ML_APP_CLIENT_SECRET || 'vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG'
    );

    if (!result.success) {
      logger.error({
        action: 'MANUAL_TOKEN_REFRESH_FAILED',
        accountId: account.id,
        error: result.error,
      });

      // Mark account as needing reconnection
      account.status = 'error';
      account.tokenRefreshError = result.error;
      await account.save();

      return res.status(401).json({
        success: false,
        message: 'Failed to refresh token. You may need to reconnect your account.',
        code: 'TOKEN_REFRESH_FAILED',
        error: result.error,
        solution: 'Try reconnecting your Mercado Livre account',
      });
    }

    // Update account with new tokens
    await account.refreshedTokens(
      result.accessToken,
      result.refreshToken,
      result.expiresIn
    );

    logger.info({
      action: 'MANUAL_TOKEN_REFRESH_SUCCESS',
      accountId: account.id,
      mlUserId: account.mlUserId,
      expiresIn: result.expiresIn,
      newTokenExpiresAt: account.tokenExpiresAt,
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accountId: account.id,
        tokenExpiresAt: account.tokenExpiresAt,
        expiresIn: result.expiresIn,
        refreshedAt: account.lastTokenRefresh,
      },
    });
  } catch (error) {
    logger.error({
      action: 'MANUAL_TOKEN_REFRESH_ERROR',
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
 * DEBUG ENDPOINT - Get current user info and all their accounts
 * GET /api/ml-accounts/debug/user-info
 */
router.get('/debug/user-info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const accounts = await MLAccount.find({ userId });
    
    res.json({
      debug: true,
      userFromToken: {
        userId,
        username: req.user.username,
      },
      accountsFound: accounts.length,
      accounts: accounts.map(acc => ({
        id: acc.id,
        mlUserId: acc.mlUserId,
        nickname: acc.nickname,
        email: acc.email,
        status: acc.status,
        isPrimary: acc.isPrimary,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
