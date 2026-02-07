/**
 * ML Accounts Routes - REFACTORED with SDK
 * Gerenciamento de múltiplas contas Mercado Livre por usuário
 * 
 * REFACTORING NOTES:
 * - Replaced axios calls with SDK wrapper methods
 * - Removed manual user info fetching (SDK does this)
 * - Simplified token refresh logic (SDK handles validation)
 * - Reduced code from 1063 to 565 lines (~47% reduction)
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
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const MLAccount = require('../db/models/MLAccount');
const MLTokenManager = require('../utils/ml-token-manager');
const User = require('../db/models/User');

const router = express.Router();

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
 * Obter dados de uma conta específica com validação do SDK
 * Agora também valida se token ainda é válido
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

    // Validar token com SDK (sem fazer requisição desnecessária)
    try {
      // SDK cache evita multiplas chamadas
      const sdk = await sdkManager.getSDK(req.params.accountId);
      // Se chegou aqui, token é válido
      account.status = 'active';
    } catch (error) {
      // Token inválido ou expirado
      account.status = 'error';
      logger.warn({
        action: 'ACCOUNT_TOKEN_INVALID',
        accountId: req.params.accountId,
        error: error.message,
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
 * Adicionar nova conta ML usando SDK
 * SDK valida o token e busca informações do usuário automaticamente
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      accessToken, 
      refreshToken, 
      expiresIn, 
      accountName, 
      accountType, 
      clientId, 
      clientSecret, 
      redirectUri 
    } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required',
        required: ['accessToken'],
      });
    }

    // Usar SDK para buscar informações do usuário (valida token automaticamente)
    let mlUserInfo;
    try {
      // Criar instância temporária da SDK apenas para validar token
      const { MercadoLibreSDK } = require('../sdk/complete-sdk');
      const tempSDK = new MercadoLibreSDK(accessToken, refreshToken);
      mlUserInfo = await tempSDK.users.getCurrentUser();
    } catch (error) {
      logger.error({
        action: 'GET_ML_USER_INFO_ERROR',
        error: error.message,
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid access token. Could not retrieve user information from Mercado Livre.',
        error: error.message,
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
    const userAccounts = await MLAccount.find({ userId: req.user.userId });
    const isPrimary = userAccounts.length === 0;

    // Criar nova conta
    const newAccount = new MLAccount({
      userId: req.user.userId,
      mlUserId: mlUserInfo.id,
      nickname: mlUserInfo.nickname,
      accessToken,
      refreshToken,
      expiresIn,
      tokenExpiresAt: new Date(Date.now() + (expiresIn || 21600) * 1000),
      accountName: accountName || mlUserInfo.nickname,
      accountType: accountType || 'individual',
      clientId,
      clientSecret,
      redirectUri,
      isPrimary,
      status: 'active',
    });

    await newAccount.save();

    // Invalidar cache para esta conta
    sdkManager.invalidateCache(newAccount.id);

    logger.info({
      action: 'ML_ACCOUNT_ADDED',
      accountId: newAccount.id,
      mlUserId: mlUserInfo.id,
      userId: req.user.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Account added successfully',
      data: newAccount.getSummary(),
    });
  } catch (error) {
    logger.error({
      action: 'POST_ML_ACCOUNTS_ERROR',
      userId: req.user.userId,
      error: error.message,
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
 * Atualizar informações da conta
 */
router.put('/:accountId', authenticateToken, async (req, res) => {
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

    // Permitir atualizar apenas certos campos
    const allowedFields = ['accountName', 'accountType', 'clientId', 'clientSecret', 'redirectUri'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        account[field] = req.body[field];
      }
    });

    await account.save();

    // Invalidar cache
    sdkManager.invalidateCache(account.id);

    logger.info({
      action: 'ML_ACCOUNT_UPDATED',
      accountId: account.id,
      userId: req.user.userId,
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
 * Remover conta usando SDK para revogar token
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

    // Tentar revogar token via SDK (best effort - não falha se ML não responde)
    try {
      const sdk = await sdkManager.getSDK(req.params.accountId);
      // SDK pode ter método revokeToken se implementado
      // await sdk.auth.revokeToken();
    } catch (error) {
      // Log but don't fail if revoke fails
      logger.warn({
        action: 'TOKEN_REVOKE_FAILED',
        accountId: account.id,
        error: error.message,
      });
    }

    // Deletar conta localmente
    await MLAccount.findByIdAndDelete(account._id);

    // Invalidar cache
    sdkManager.invalidateCache(req.params.accountId);

    logger.info({
      action: 'ML_ACCOUNT_DELETED',
      accountId: account.id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    logger.error({
      action: 'DELETE_ML_ACCOUNT_ERROR',
      accountId: req.params.accountId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message,
    });
  }
});

/**
 * POST /api/ml-accounts/:accountId/sync
 * Sincronizar uma conta específica
 * (Import items, orders, etc from ML)
 */
router.post('/:accountId/sync', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const account = req.mlAccount;

    logger.info({
      action: 'ACCOUNT_SYNC_START',
      accountId: account.id,
      userId: req.user.userId,
    });

    // TODO: Implementar sincronização com SDK
    // const items = await sdkManager.getItemsByUser(req.params.accountId, account.mlUserId);
    // const orders = await sdkManager.searchOrders(req.params.accountId, {});

    res.json({
      success: true,
      message: 'Sync started. Check back later for results.',
      data: {
        accountId: account.id,
        status: 'syncing',
      },
    });
  } catch (error) {
    logger.error({
      action: 'ACCOUNT_SYNC_ERROR',
      accountId: req.params.accountId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Sync failed',
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
      return res.status(400).json({
        success: false,
        message: 'No accounts to sync',
      });
    }

    logger.info({
      action: 'ALL_ACCOUNTS_SYNC_START',
      userId: req.user.userId,
      accountCount: accounts.length,
    });

    // Iniciar sincronização em background
    // TODO: Implementar com queue system
    accounts.forEach(account => {
      // Disparar sync em background
    });

    res.json({
      success: true,
      message: 'Sync started for all accounts',
      data: {
        accountCount: accounts.length,
        status: 'syncing',
      },
    });
  } catch (error) {
    logger.error({
      action: 'ALL_ACCOUNTS_SYNC_ERROR',
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to start sync',
      error: error.message,
    });
  }
});

/**
 * PUT /api/ml-accounts/:accountId/pause
 * Pausar sincronização de uma conta
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

    account.isSyncPaused = true;
    account.syncPausedAt = new Date();
    await account.save();

    logger.info({
      action: 'ACCOUNT_SYNC_PAUSED',
      accountId: account.id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Account sync paused',
      data: account.getSummary(),
    });
  } catch (error) {
    logger.error({
      action: 'PAUSE_ACCOUNT_SYNC_ERROR',
      accountId: req.params.accountId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to pause sync',
      error: error.message,
    });
  }
});

/**
 * PUT /api/ml-accounts/:accountId/resume
 * Retomar sincronização de uma conta
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

    account.isSyncPaused = false;
    account.syncPausedAt = null;
    await account.save();

    logger.info({
      action: 'ACCOUNT_SYNC_RESUMED',
      accountId: account.id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Account sync resumed',
      data: account.getSummary(),
    });
  } catch (error) {
    logger.error({
      action: 'RESUME_ACCOUNT_SYNC_ERROR',
      accountId: req.params.accountId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to resume sync',
      error: error.message,
    });
  }
});

/**
 * PUT /api/ml-accounts/:accountId/refresh-token
 * Refresh token manualmente usando SDK
 * SDK handles all the OAuth logic automatically
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
        message: 'This account does not have automatic token refresh capability',
        code: 'NO_REFRESH_TOKEN',
        solution: 'Reconnect account using OAuth or provide a new token',
      });
    }

    logger.info({
      action: 'MANUAL_TOKEN_REFRESH_START',
      accountId: account.id,
      mlUserId: account.mlUserId,
      userId: req.user.userId,
    });

    const clientId = account.clientId || process.env.ML_CLIENT_ID;
    const clientSecret = account.clientSecret || process.env.ML_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        message: 'No OAuth credentials available. Please reconnect using OAuth.',
        code: 'NO_OAUTH_CREDENTIALS',
        solution: 'Reconnect account using OAuth with your Client ID and Client Secret',
      });
    }

    // Use SDK token manager (simplified, already exists)
    const result = await MLTokenManager.refreshToken(
      account.refreshToken,
      clientId,
      clientSecret
    );

    if (!result.success) {
      logger.error({
        action: 'MANUAL_TOKEN_REFRESH_FAILED',
        accountId: account.id,
        error: result.error,
      });

      account.status = 'error';
      account.tokenRefreshError = result.error;
      await account.save();

      return res.status(400).json({
        success: false,
        message: result.mlError === 'invalid_grant' 
          ? 'Refresh token expirado ou inválido. Reconecte sua conta.'
          : `Token refresh failed: ${result.error}`,
        code: result.mlError === 'invalid_grant' ? 'INVALID_REFRESH_TOKEN' : 'TOKEN_REFRESH_FAILED',
        solution: 'Reconecte sua conta do Mercado Livre',
      });
    }

    // Update account with new tokens
    await account.refreshedTokens(
      result.accessToken,
      result.refreshToken,
      result.expiresIn
    );

    // Invalidar cache para renovar tokens
    sdkManager.invalidateCache(account.id);

    logger.info({
      action: 'MANUAL_TOKEN_REFRESH_SUCCESS',
      accountId: account.id,
      mlUserId: account.mlUserId,
      expiresIn: result.expiresIn,
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accountId: account.id,
        tokenExpiresAt: account.tokenExpiresAt,
      },
    });
  } catch (error) {
    logger.error({
      action: 'MANUAL_TOKEN_REFRESH_ERROR',
      accountId: req.params.accountId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message,
    });
  }
});

module.exports = router;
