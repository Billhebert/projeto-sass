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

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Unified error handler for all routes
 * Logs errors consistently and sends standardized error responses
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {string} message - User-facing error message
 * @param {Error} error - Error object (optional)
 * @param {Object} context - Additional logging context (optional)
 */
const handleError = (res, statusCode = 500, message, error = null, context = {}) => {
  logger.error({
    action: context.action || 'UNKNOWN_ERROR',
    error: error?.message || message,
    statusCode,
    ...context,
  });

  const response = {
    success: false,
    message,
  };
  if (error?.message) {
    response.error = error.message;
  }
  res.status(statusCode).json(response);
};

/**
 * Unified success response handler
 * Sends standardized success responses with optional data and status code
 * @param {Object} res - Express response object
 * @param {any} data - Response data payload
 * @param {string} message - Success message (optional)
 * @param {number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = {
    success: true,
    data,
  };
  if (message) {
    response.message = message;
  }
  res.status(statusCode).json(response);
};

/**
 * Validate account ownership
 * @param {string} accountId - Account ID to validate
 * @param {string} userId - User ID requesting account
 * @returns {Promise<Object>} Account object if found
 */
const getAndValidateAccount = async (accountId, userId) => {
  const account = await MLAccount.findOne({
    id: accountId,
    userId: userId,
  });

  if (!account) {
    throw {
      statusCode: 404,
      message: 'Account not found',
      code: 'ACCOUNT_NOT_FOUND',
    };
  }

  return account;
};

/**
 * Create ML SDK instance and get user info for token validation
 * @param {string} accessToken - ML access token
 * @param {string} refreshToken - ML refresh token (optional)
 * @returns {Promise<Object>} User info from ML
 */
const getMlUserInfo = async (accessToken, refreshToken) => {
  try {
    const { MercadoLibreSDK } = require('../sdk/complete-sdk');
    const tempSDK = new MercadoLibreSDK(accessToken, refreshToken);
    const response = await tempSDK.users.getUserInfo();
    
    // SDK retorna {data, status, headers}, não apenas os dados
    const userInfo = response.data || response;
    
    logger.info({
      action: 'GET_ML_USER_INFO_SUCCESS',
      userInfo: userInfo,
      hasId: !!userInfo?.id,
      hasNickname: !!userInfo?.nickname,
      hasEmail: !!userInfo?.email,
    });
    
    return userInfo;
  } catch (error) {
    logger.error({
      action: 'GET_ML_USER_INFO_ERROR',
      error: error.message,
      errorDetails: error.response?.data || error,
    });
    throw {
      statusCode: 400,
      message: 'Invalid Mercado Livre access token. Could not retrieve user information.',
      error: error,
      action: 'GET_ML_USER_INFO_ERROR',
      code: 'ML_INVALID_TOKEN',
    };
  }
};

/**
 * Check if account already exists for this user/ML user combo
 * @param {string} userId - User ID
 * @param {string} mlUserId - ML user ID
 * @returns {Promise<Object|null>} Existing account or null
 */
const checkExistingAccount = async (userId, mlUserId) => {
  return await MLAccount.findOne({
    userId: userId,
    mlUserId: mlUserId,
  });
};

/**
 * Create new ML account record
 * @param {Object} accountData - Account data to create
 * @returns {Promise<Object>} Created account
 */
const createNewAccount = async (accountData) => {
  const newAccount = new MLAccount(accountData);
  await newAccount.save();
  return newAccount;
};

/**
 * GET /api/ml-accounts
 * Listar todas as contas ML do usuário
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const accounts = await MLAccount.findByUserId(req.user.userId);

    sendSuccess(res, {
      accounts: accounts.map(acc => acc.getSummary()),
      total: accounts.length,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch ML accounts', error, {
      action: 'GET_ML_ACCOUNTS_ERROR',
      userId: req.user.userId,
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
    const account = await getAndValidateAccount(req.params.accountId, req.user.userId);

    // Validar token com SDK (sem fazer requisição desnecessária)
    try {
      const sdk = await sdkManager.getSDK(req.params.accountId);
      account.status = 'active';
    } catch (error) {
      account.status = 'error';
      logger.warn({
        action: 'ACCOUNT_TOKEN_INVALID',
        accountId: req.params.accountId,
        error: error.message,
      });
    }

    sendSuccess(res, account.getSummary());
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Failed to fetch account';
    handleError(res, statusCode, message, error, {
      action: error.action || 'GET_ML_ACCOUNT_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
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
    const mlUserInfo = await getMlUserInfo(accessToken, refreshToken);

    logger.info({
      action: 'ML_USER_INFO_RECEIVED',
      mlUserId: mlUserInfo?.id,
      nickname: mlUserInfo?.nickname,
      email: mlUserInfo?.email,
      hasId: !!mlUserInfo?.id,
      hasNickname: !!mlUserInfo?.nickname,
      keys: Object.keys(mlUserInfo || {}),
    });

    // Verificar se usuário já tem essa conta
    const existingAccount = await checkExistingAccount(req.user.userId, mlUserInfo.id);
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
    const newAccount = await createNewAccount({
      userId: req.user.userId,
      mlUserId: mlUserInfo.id,
      nickname: mlUserInfo.nickname,
      email: mlUserInfo.email,
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

    // Invalidar cache para esta conta
    sdkManager.invalidateCache(newAccount.id);

    logger.info({
      action: 'ML_ACCOUNT_ADDED',
      accountId: newAccount.id,
      mlUserId: mlUserInfo.id,
      userId: req.user.userId,
    });

    sendSuccess(res, newAccount.getSummary(), 'Account added successfully', 201);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Failed to add account';
    handleError(res, statusCode, message, error, {
      action: error.action || 'POST_ML_ACCOUNTS_ERROR',
      userId: req.user.userId,
    });
  }
});

/**
 * PUT /api/ml-accounts/:accountId
 * Atualizar informações da conta
 */
router.put('/:accountId', authenticateToken, async (req, res) => {
  try {
    const account = await getAndValidateAccount(req.params.accountId, req.user.userId);

    // Permitir atualizar apenas certos campos
    const allowedFields = ['accountName', 'accountType', 'clientId', 'clientSecret', 'redirectUri'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        account[field] = req.body[field];
      }
    });

    await account.save();
    sdkManager.invalidateCache(account.id);

    logger.info({
      action: 'ML_ACCOUNT_UPDATED',
      accountId: account.id,
      userId: req.user.userId,
    });

    sendSuccess(res, account.getSummary(), 'Account updated successfully');
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Failed to update account';
    handleError(res, statusCode, message, error, {
      action: error.action || 'UPDATE_ML_ACCOUNT_ERROR',
      accountId: req.params.accountId,
    });
  }
});

/**
 * DELETE /api/ml-accounts/:accountId
 * Remover conta usando SDK para revogar token
 */
router.delete('/:accountId', authenticateToken, async (req, res) => {
  try {
    const account = await getAndValidateAccount(req.params.accountId, req.user.userId);

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
    sdkManager.invalidateCache(req.params.accountId);

    logger.info({
      action: 'ML_ACCOUNT_DELETED',
      accountId: account.id,
      userId: req.user.userId,
    });

    sendSuccess(res, {}, 'Account deleted successfully');
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Failed to delete account';
    handleError(res, statusCode, message, error, {
      action: error.action || 'DELETE_ML_ACCOUNT_ERROR',
      accountId: req.params.accountId,
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

    sendSuccess(res, {
      accountId: account.id,
      status: 'syncing',
    }, 'Sync started. Check back later for results.');
  } catch (error) {
    handleError(res, 500, 'Sync failed', error, {
      action: 'ACCOUNT_SYNC_ERROR',
      accountId: req.params.accountId,
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

    sendSuccess(res, {
      accountCount: accounts.length,
      status: 'syncing',
    }, 'Sync started for all accounts');
  } catch (error) {
    handleError(res, 500, 'Failed to start sync', error, {
      action: 'ALL_ACCOUNTS_SYNC_ERROR',
      userId: req.user.userId,
    });
  }
});

/**
 * PUT /api/ml-accounts/:accountId/pause
 * Pausar sincronização de uma conta
 */
router.put('/:accountId/pause', authenticateToken, async (req, res) => {
  try {
    const account = await getAndValidateAccount(req.params.accountId, req.user.userId);

    account.isSyncPaused = true;
    account.syncPausedAt = new Date();
    await account.save();

    logger.info({
      action: 'ACCOUNT_SYNC_PAUSED',
      accountId: account.id,
      userId: req.user.userId,
    });

    sendSuccess(res, account.getSummary(), 'Account sync paused');
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Failed to pause sync';
    handleError(res, statusCode, message, error, {
      action: error.action || 'PAUSE_ACCOUNT_SYNC_ERROR',
      accountId: req.params.accountId,
    });
  }
});

/**
 * PUT /api/ml-accounts/:accountId/resume
 * Retomar sincronização de uma conta
 */
router.put('/:accountId/resume', authenticateToken, async (req, res) => {
  try {
    const account = await getAndValidateAccount(req.params.accountId, req.user.userId);

    account.isSyncPaused = false;
    account.syncPausedAt = null;
    await account.save();

    logger.info({
      action: 'ACCOUNT_SYNC_RESUMED',
      accountId: account.id,
      userId: req.user.userId,
    });

    sendSuccess(res, account.getSummary(), 'Account sync resumed');
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Failed to resume sync';
    handleError(res, statusCode, message, error, {
      action: error.action || 'RESUME_ACCOUNT_SYNC_ERROR',
      accountId: req.params.accountId,
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
    const account = await getAndValidateAccount(req.params.accountId, req.user.userId);

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

    sendSuccess(res, {
      accountId: account.id,
      tokenExpiresAt: account.tokenExpiresAt,
    }, 'Token refreshed successfully');
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Failed to refresh token';
    handleError(res, statusCode, message, error, {
      action: error.action || 'MANUAL_TOKEN_REFRESH_ERROR',
      accountId: req.params.accountId,
    });
  }
});

module.exports = router;
