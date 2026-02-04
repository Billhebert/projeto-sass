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
const { authenticateToken } = require("../middleware/auth");
const oauthService = require("../services/ml-oauth-invisible");

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "https://vendata.com.br";

/**
 * GET /api/ml-auth/url
 * Retorna a URL de autorização do Mercado Livre
 *
 * O frontend deve redirecionar o usuário para esta URL
 */
router.get("/url", async (req, res) => {
  try {
    // Get userId from authenticated user or from query param for OAuth flow
    const userId = req.user?.userId || req.query.userId || "anonymous";

    logger.info({
      action: "ML_AUTH_URL_REQUEST",
      userId,
      timestamp: new Date().toISOString(),
    });

    const state = oauthService.generateState();
    const authUrl = oauthService.getAuthorizationUrl(userId, state);

    logger.info({
      action: "ML_AUTH_URL_GENERATED",
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
    logger.error({
      action: "ML_AUTH_URL_ERROR",
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Failed to generate authorization URL",
      error: error.message,
    });
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

    logger.info({
      action: "ML_AUTH_CALLBACK_RECEIVED",
      hasCode: !!code,
      hasError: !!error,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      logger.warn({
        action: "ML_AUTH_CALLBACK_ERROR",
        error,
        errorDescription: error_description,
      });

      return res.redirect(
        `${FRONTEND_URL}/ml-auth?status=error&message=${encodeURIComponent(error_description || error)}`,
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${FRONTEND_URL}/ml-auth?status=error&message=${encodeURIComponent("Código de autorização não recebido")}`,
      );
    }

    const result = await oauthService.completeOAuthConnection(code, state);

    if (!result.success) {
      logger.error({
        action: "ML_AUTH_CALLBACK_FAILED",
        code: result.code,
        error: result.error,
      });

      return res.redirect(
        `${FRONTEND_URL}/ml-auth?status=error&message=${encodeURIComponent(result.error)}`,
      );
    }

    logger.info({
      action: "ML_AUTH_CALLBACK_SUCCESS",
      userId: result.user?.mlUserId,
      accountId: result.accountId,
      isNewAccount: result.isNewAccount,
    });

    res.redirect(
      `${FRONTEND_URL}/ml-auth?status=success&accountId=${result.accountId}&isNew=${result.isNewAccount}`,
    );
  } catch (error) {
    logger.error({
      action: "ML_AUTH_CALLBACK_UNEXPECTED_ERROR",
      error: error.message,
      stack: error.stack,
    });

    res.redirect(
      `${FRONTEND_URL}/ml-auth?status=error&message=${encodeURIComponent("Erro inesperado durante conexão")}`,
    );
  }
});

/**
 * GET /api/ml-auth/status
 * Verifica o status da conexão ML do usuário
 * Opcional: pode ser acessado sem autenticação para status público
 */
router.get("/status", async (req, res) => {
  try {
    // Tenta pegar userId do usuário autenticado, senão retorna status anônimo
    const userId = req.user?.userId;

    logger.info({
      action: "ML_AUTH_STATUS_REQUEST",
      userId: userId || "anonymous",
    });

    if (!userId) {
      // Retorna status padrão para usuário anônimo
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
      return res.status(500).json({
        success: false,
        message: result.error,
        connected: false,
      });
    }

    res.json({
      success: true,
      connected: result.connected,
      accounts: result.accounts || [],
      tokenRefreshed: result.tokenRefreshed || false,
      tokenValid: result.tokenValid !== false,
    });
  } catch (error) {
    logger.error({
      action: "ML_AUTH_STATUS_ERROR",
      userId: req.user?.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: error.message,
      connected: false,
    });
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

    logger.info({
      action: "ML_AUTH_DISCONNECT_REQUEST",
      userId,
      accountId,
    });

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "accountId é obrigatório",
      });
    }

    const result = await oauthService.disconnectAccount(userId, accountId);

    if (!result.success) {
      logger.error({
        action: "ML_AUTH_DISCONNECT_FAILED",
        userId,
        accountId,
        code: result.code,
        error: result.error,
      });

      return res.status(400).json({
        success: false,
        message: result.error,
        code: result.code,
      });
    }

    logger.info({
      action: "ML_AUTH_DISCONNECT_SUCCESS",
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
    logger.error({
      action: "ML_AUTH_DISCONNECT_ERROR",
      userId: req.user.userId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: error.message,
    });
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

    logger.info({
      action: "ML_AUTH_COMPLETE_REQUEST",
      userId: req.user.userId,
      hasCode: !!code,
      hasState: !!state,
    });

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: "Code and state are required",
      });
    }

    const result = await oauthService.completeOAuthConnection(code, state);

    if (!result.success) {
      logger.error({
        action: "ML_AUTH_COMPLETE_FAILED",
        code: result.code,
        error: result.error,
      });

      return res.status(400).json({
        success: false,
        message: result.error || "Failed to complete OAuth connection",
      });
    }

    logger.info({
      action: "ML_AUTH_COMPLETE_SUCCESS",
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
    logger.error({
      action: "ML_AUTH_COMPLETE_ERROR",
      userId: req.user.userId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Erro ao completar conexão",
    });
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
    // userId é opcional - pode ser fornecido ou deixado vazio para novos usuários
    const userId = req.user?.userId || req.body.userId || "anonymous";
    const { clientId, clientSecret, redirectUri } = req.body;

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        message: "Client ID e Client Secret são obrigatórios",
      });
    }

    logger.info({
      action: "ML_AUTH_URL_CUSTOM_REQUEST",
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

    logger.info({
      action: "ML_AUTH_URL_CUSTOM_GENERATED",
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
    logger.error({
      action: "ML_AUTH_URL_CUSTOM_ERROR",
      userId: req.user?.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to generate authorization URL",
      error: error.message,
    });
  }
});

module.exports = router;
