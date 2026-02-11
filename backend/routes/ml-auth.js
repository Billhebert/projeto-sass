/**
 * ML Auth Invisible Routes
 * OAuth 2.0 Mercado Livre - Sem configuração necessária
 *
 * Endpoints:
 * GET  /api/ml-auth/url        - Retorna URL de autorização
 * GET  /api/ml-auth/callback   - Callback do ML após autorização
 * GET  /api/ml-auth/status     - Verifica se está conectado
 * DELETE /api/ml-auth/disconnect - Desconecta conta
 */

const express = require("express");
const logger = require("../logger");
const { authenticateToken, optionalAuth } = require("../middleware/auth");
const oauthService = require("../services/ml-oauth-invisible");

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "https://vendata.com.br";

// ============================================================================
// HELPER FUNCTIONS - Reduce duplication in error handling and redirects
// ============================================================================

/**
 * Send redirect with status parameters
 * @param {Response} res - Express response object
 * @param {string} status - "success" or "error"
 * @param {string} message - Message to display
 * @param {object} data - Additional query parameters (accountId, isNew, etc)
 */
const redirectWithStatus = (res, status, message, data = {}) => {
  const params = new URLSearchParams({
    status,
    message,
    ...data,
  });
  res.redirect(`${FRONTEND_URL}/ml-auth?${params.toString()}`);
};

/**
 * Send JSON error response
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} errorMessage - Detailed error message (optional)
 */
const sendJsonError = (res, statusCode, message, errorMessage = null) => {
  const response = {
    success: false,
    message,
  };
  if (errorMessage) {
    response.error = errorMessage;
  }
  res.status(statusCode).json(response);
};

/**
 * Log error with consistent format
 * @param {string} action - Action identifier
 * @param {object} data - Additional data to log
 */
const logError = (action, data = {}) => {
  logger.error({
    action,
    timestamp: new Date().toISOString(),
    ...data,
  });
};

/**
 * Log info with consistent format
 * @param {string} action - Action identifier
 * @param {object} data - Additional data to log
 */
const logInfo = (action, data = {}) => {
  logger.info({
    action,
    timestamp: new Date().toISOString(),
    ...data,
  });
};

/**
 * GET /api/ml-auth/url
 * Retorna a URL de autorização do Mercado Livre
 *
 * O frontend deve redirecionar o usuário para esta URL
 */
router.get("/url", optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId || req.query.userId || "anonymous";
    logInfo("ML_AUTH_URL_REQUEST", { userId });

    const state = oauthService.generateState();
    const authUrl = oauthService.getAuthorizationUrl(userId, state);

    logInfo("ML_AUTH_URL_GENERATED", {
      userId,
      authUrl: authUrl.substring(0, 100) + "...",
    });

    res.json({
      success: true,
      data: {
        authorizationUrl: authUrl,
        expiresIn: 600,
        message: "Redirecione o usuário para esta URL para completar a conexão",
      },
    });
  } catch (error) {
    logError("ML_AUTH_URL_ERROR", {
      userId: req.user?.userId,
      error: error.message,
    });
    sendJsonError(res, 500, "Failed to generate authorization URL", error.message);
  }
});

/**
 * GET /api/ml-auth/callback
 * Callback do OAuth Mercado Livre
 *
 * O ML redireciona aqui após o usuário conceder permissão
 * O código de autorização é trocado por tokens
 */
router.get("/callback", async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    logInfo("ML_AUTH_CALLBACK_RECEIVED", { hasCode: !!code, hasError: !!error });

    if (error) {
      logInfo("ML_AUTH_CALLBACK_ERROR", { error, errorDescription: error_description });
      return redirectWithStatus(res, "error", error_description || error);
    }

    if (!code || !state) {
      return redirectWithStatus(res, "error", "Código de autorização não recebido");
    }

    const result = await oauthService.completeOAuthConnection(code, state);

    if (!result.success) {
      logError("ML_AUTH_CALLBACK_FAILED", {
        code: result.code,
        error: result.error,
      });
      return redirectWithStatus(res, "error", result.error);
    }

    logInfo("ML_AUTH_CALLBACK_SUCCESS", {
      userId: result.user?.mlUserId,
      accountId: result.accountId,
      isNewAccount: result.isNewAccount,
    });

    redirectWithStatus(res, "success", "Conectado com sucesso!", {
      accountId: result.accountId,
      isNew: result.isNewAccount,
    });
  } catch (error) {
    logError("ML_AUTH_CALLBACK_UNEXPECTED_ERROR", { error: error.message });
    redirectWithStatus(res, "error", "Erro inesperado durante conexão");
  }
});

/**
 * GET /api/ml-auth/status
 * Verifica o status da conexão ML do usuário
 * Opcional: pode ser acessado sem autenticação para status público
 */
router.get("/status", optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;

    logInfo("ML_AUTH_STATUS_REQUEST", { userId: userId || "anonymous" });

    if (!userId) {
      return res.json({
        success: true,
        connected: false,
        accounts: [],
        tokenRefreshed: false,
        tokenValid: false,
        message: "Not authenticated",
      });
    }

    const result = await oauthService.getAccountStatus(userId);

    if (!result.success) {
      return sendJsonError(res, 500, result.error);
    }

    res.json({
      success: true,
      connected: result.connected,
      accounts: result.accounts || [],
      tokenRefreshed: result.tokenRefreshed || false,
      tokenValid: result.tokenValid !== false,
    });
  } catch (error) {
    logError("ML_AUTH_STATUS_ERROR", {
      userId: req.user?.userId,
      error: error.message,
    });
    sendJsonError(res, 500, error.message);
  }
});

/**
 * DELETE /api/ml-auth/disconnect
 * Desconecta a conta ML do usuário
 */
router.delete("/disconnect", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { accountId } = req.body;

    logInfo("ML_AUTH_DISCONNECT_REQUEST", { userId, accountId });

    if (!accountId) {
      return sendJsonError(res, 400, "accountId é obrigatório");
    }

    const result = await oauthService.disconnectAccount(userId, accountId);

    if (!result.success) {
      logError("ML_AUTH_DISCONNECT_FAILED", {
        userId,
        accountId,
        code: result.code,
        error: result.error,
      });
      return sendJsonError(res, 400, result.error);
    }

    logInfo("ML_AUTH_DISCONNECT_SUCCESS", {
      userId,
      accountId: result.accountId,
      mlUserId: result.mlUserId,
    });

    res.json({
      success: true,
      message: "Conta desconectada com sucesso",
      data: {
        accountId: result.accountId,
        mlUserId: result.mlUserId,
      },
    });
  } catch (error) {
    logError("ML_AUTH_DISCONNECT_ERROR", {
      userId: req.user.userId,
      error: error.message,
    });
    sendJsonError(res, 500, error.message);
  }
});

/**
 * POST /api/ml-auth/complete
 * Complete OAuth connection from frontend callback
 *
 * Frontend receives code/state from ML redirect and sends here
 */
router.post("/complete", authenticateToken, async (req, res) => {
  try {
    const { code, state } = req.body;

    logInfo("ML_AUTH_COMPLETE_REQUEST", {
      userId: req.user.userId,
      hasCode: !!code,
      hasState: !!state,
    });

    if (!code || !state) {
      return sendJsonError(res, 400, "Code and state are required");
    }

    const result = await oauthService.completeOAuthConnection(code, state);

    if (!result.success) {
      logError("ML_AUTH_COMPLETE_FAILED", {
        code: result.code,
        error: result.error,
      });
      return sendJsonError(res, 400, result.error || "Failed to complete OAuth connection");
    }

    logInfo("ML_AUTH_COMPLETE_SUCCESS", {
      userId: req.user.userId,
      accountId: result.accountId,
      isNewAccount: result.isNewAccount,
    });

    res.json({
      success: true,
      message: result.isNewAccount
        ? "Conta conectada com sucesso!"
        : "Conta atualizada com sucesso!",
      data: {
        accountId: result.accountId,
        isNewAccount: result.isNewAccount,
        user: result.user,
      },
    });
  } catch (error) {
    logError("ML_AUTH_COMPLETE_ERROR", {
      userId: req.user.userId,
      error: error.message,
    });
    sendJsonError(res, 500, "Erro ao completar conexão");
  }
});

/**
 * POST /api/ml-auth/url-custom
 * Gera URL de autorização com credenciais customizadas
 *
 * Usado quando o usuário quer usar suas próprias credenciais OAuth
 * Pode ser acessado sem autenticação (para novo usuário fazer OAuth)
 */
router.post("/url-custom", async (req, res) => {
  try {
    const userId = req.user?.userId || req.body.userId || "anonymous";
    const { clientId, clientSecret, redirectUri } = req.body;

    if (!clientId || !clientSecret) {
      return sendJsonError(res, 400, "Client ID e Client Secret são obrigatórios");
    }

    logInfo("ML_AUTH_URL_CUSTOM_REQUEST", {
      userId,
      hasClientId: !!clientId,
    });

    const state = oauthService.generateCustomState(
      userId,
      clientId,
      clientSecret,
      redirectUri,
    );
    const authUrl = oauthService.getCustomAuthorizationUrl(
      clientId,
      clientSecret,
      redirectUri,
      state,
    );

    logInfo("ML_AUTH_URL_CUSTOM_GENERATED", {
      userId,
      authUrl: authUrl.substring(0, 100) + "...",
    });

    res.json({
      success: true,
      data: {
        authorizationUrl: authUrl,
        expiresIn: 600,
      },
    });
  } catch (error) {
    logError("ML_AUTH_URL_CUSTOM_ERROR", {
      userId: req.user?.userId,
      error: error.message,
    });
    sendJsonError(res, 500, "Failed to generate authorization URL", error.message);
  }
});

module.exports = router;
