/**
 * SDK Manager - Gerenciamento Centralizado da SDK do Mercado Livre/Mercado Pago
 *
 * Este serviço centraliza todas as chamadas à API do Mercado Livre e Mercado Pago,
 * garantindo que cada conta use seus próprios tokens de autenticação.
 *
 * Benefícios:
 * - Gerenciamento automático de tokens por conta
 * - Cache de instâncias da SDK para melhor performance
 * - Tratamento de erros padronizado
 * - Retry automático em falhas temporárias
 * - Logging centralizado
 */

const { MercadoLibreSDK } = require("../sdk/complete-sdk");
const logger = require("../logger");
const MLAccount = require("../db/models/MLAccount");

class SDKManager {
  constructor() {
    // Cache de instâncias SDK por accountId
    this.sdkCache = new Map();

    // Tempo de vida do cache (5 minutos)
    this.cacheTimeout = 5 * 60 * 1000;

    // Limpar cache periodicamente
    setInterval(() => this.cleanupCache(), this.cacheTimeout);
  }

  /**
   * Obtém uma instância da SDK para uma conta específica
   * @param {string} accountId - ID da conta ML
   * @returns {Promise<MercadoLibreSDK>} Instância configurada da SDK
   */
  async getSDK(accountId) {
    try {
      // Verificar cache
      const cached = this.sdkCache.get(accountId);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.sdk;
      }

      // Buscar dados da conta no MongoDB
      const account = await MLAccount.findOne({ id: accountId });
      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }

      if (!account.accessToken) {
        throw new Error(`Account ${accountId} has no access token`);
      }

      // Criar nova instância da SDK
      const sdk = new MercadoLibreSDK(
        account.accessToken,
        account.refreshToken || null,
      );

      // Configurar token do Mercado Pago se disponível
      if (account.mpAccessToken) {
        sdk.setMPAccessToken(account.mpAccessToken);
      }

      // Salvar no cache
      this.sdkCache.set(accountId, {
        sdk,
        timestamp: Date.now(),
        accountId,
      });

      logger.info({
        action: "SDK_INSTANCE_CREATED",
        accountId,
        hasMLToken: !!account.accessToken,
        hasMPToken: !!account.mpAccessToken,
      });

      return sdk;
    } catch (error) {
      logger.error({
        action: "SDK_GET_ERROR",
        accountId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Limpa a instância da SDK de uma conta específica do cache
   * Útil após atualização de tokens
   */
  invalidateCache(accountId) {
    this.sdkCache.delete(accountId);
    logger.info({
      action: "SDK_CACHE_INVALIDATED",
      accountId,
    });
  }

  /**
   * Limpa todo o cache
   */
  clearCache() {
    this.sdkCache.clear();
    logger.info({ action: "SDK_CACHE_CLEARED" });
  }

  /**
   * Remove instâncias antigas do cache
   */
  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [accountId, cached] of this.sdkCache.entries()) {
      if (now - cached.timestamp >= this.cacheTimeout) {
        this.sdkCache.delete(accountId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info({
        action: "SDK_CACHE_CLEANUP",
        cleaned,
        remaining: this.sdkCache.size,
      });
    }
  }

  /**
   * Executa uma operação da SDK com tratamento de erros
   * @param {string} accountId - ID da conta
   * @param {Function} operation - Função que recebe a SDK e executa a operação
   * @returns {Promise<any>} Resultado da operação
   */
  async execute(accountId, operation) {
    try {
      const sdk = await this.getSDK(accountId);
      return await operation(sdk);
    } catch (error) {
      logger.error({
        action: "SDK_EXECUTE_ERROR",
        accountId,
        error: error.message,
        stack: error.stack,
      });

      // Transformar erro para formato padrão
      throw this.normalizeError(error);
    }
  }

  /**
   * Normaliza erros da API em um formato padrão
   */
  normalizeError(error) {
    // Se já é um erro normalizado, retorna
    if (error.isNormalized) {
      return error;
    }

    const normalizedError = new Error(error.message || "Unknown error");
    normalizedError.isNormalized = true;
    normalizedError.originalError = error;

    // Extrair informações úteis
    if (error.data) {
      normalizedError.apiError = error.data;
      normalizedError.message = error.data.message || error.message;
    }

    if (error.status) {
      normalizedError.statusCode = error.status;
    }

    // Classificar tipo de erro
    if (error.status === 401) {
      normalizedError.type = "AUTHENTICATION_ERROR";
      normalizedError.message = "Token inválido ou expirado";
    } else if (error.status === 403) {
      normalizedError.type = "AUTHORIZATION_ERROR";
      normalizedError.message = "Sem permissão para esta operação";
    } else if (error.status === 404) {
      normalizedError.type = "NOT_FOUND";
      normalizedError.message = "Recurso não encontrado";
    } else if (error.status === 429) {
      normalizedError.type = "RATE_LIMIT";
      normalizedError.message = "Limite de requisições excedido";
    } else if (error.status >= 500) {
      normalizedError.type = "SERVER_ERROR";
      normalizedError.message = "Erro no servidor do Mercado Livre";
    } else {
      normalizedError.type = "API_ERROR";
    }

    return normalizedError;
  }

  /**
   * Wrapper helpers para operações comuns
   */

  // ==================== ITEMS ====================
  async getItem(accountId, itemId) {
    return this.execute(accountId, (sdk) => sdk.items.getItem(itemId));
  }

  async getItemWithDescription(accountId, itemId) {
    return this.execute(accountId, (sdk) =>
      sdk.items.getItemWithDescription(itemId),
    );
  }

  async createItem(accountId, itemData) {
    return this.execute(accountId, (sdk) => sdk.items.createItem(itemData));
  }

  async updateItem(accountId, itemId, itemData) {
    return this.execute(accountId, (sdk) =>
      sdk.items.updateItem(itemId, itemData),
    );
  }

  async deleteItem(accountId, itemId) {
    return this.execute(accountId, (sdk) => sdk.items.deleteItem(itemId));
  }

  async searchItems(accountId, params) {
    return this.execute(accountId, (sdk) => sdk.items.searchItems(params));
  }

  async getItemsByUser(accountId, userId, params = {}) {
    return this.execute(accountId, (sdk) =>
      sdk.items.getItemsByUser(userId, params),
    );
  }

  // ==================== ORDERS ====================
  async getOrder(accountId, orderId) {
    return this.execute(accountId, (sdk) => sdk.orders.getOrder(orderId));
  }

  async searchOrders(accountId, params) {
    return this.execute(accountId, (sdk) => sdk.orders.searchOrders(params));
  }

  async updateOrder(accountId, orderId, orderData) {
    return this.execute(accountId, (sdk) =>
      sdk.orders.updateOrder(orderId, orderData),
    );
  }

  // ==================== QUESTIONS ====================
  async getQuestions(accountId, params) {
    return this.execute(accountId, (sdk) => sdk.questions.getQuestions(params));
  }

  async getQuestion(accountId, questionId) {
    return this.execute(accountId, (sdk) =>
      sdk.questions.getQuestion(questionId),
    );
  }

  async answerQuestion(accountId, questionId, text) {
    return this.execute(accountId, (sdk) =>
      sdk.questions.answerQuestion(questionId, text),
    );
  }

  async deleteQuestion(accountId, questionId) {
    return this.execute(accountId, (sdk) =>
      sdk.questions.deleteQuestion(questionId),
    );
  }

  // ==================== MESSAGES ====================
  async getMessages(accountId, params) {
    return this.execute(accountId, (sdk) => sdk.messages.getMessages(params));
  }

  async getMessage(accountId, messageId) {
    return this.execute(accountId, (sdk) => sdk.messages.getMessage(messageId));
  }

  async sendMessage(accountId, messageData) {
    return this.execute(accountId, (sdk) =>
      sdk.messages.sendMessage(messageData),
    );
  }

  // ==================== SHIPMENTS ====================
  async getShipment(accountId, shipmentId) {
    return this.execute(accountId, (sdk) =>
      sdk.shipping.getShipment(shipmentId),
    );
  }

  async updateShipment(accountId, shipmentId, shipmentData) {
    return this.execute(accountId, (sdk) =>
      sdk.shipping.updateShipment(shipmentId, shipmentData),
    );
  }

  async searchShipments(accountId, params) {
    return this.execute(accountId, (sdk) =>
      sdk.shipping.searchShipments(params),
    );
  }

  // ==================== CATEGORIES ====================
  async getCategories(accountId) {
    return this.execute(accountId, (sdk) => sdk.categories.getCategories());
  }

  async getCategory(accountId, categoryId) {
    return this.execute(accountId, (sdk) =>
      sdk.categories.getCategory(categoryId),
    );
  }

  async getCategoryAttributes(accountId, categoryId) {
    return this.execute(accountId, (sdk) =>
      sdk.categories.getCategoryAttributes(categoryId),
    );
  }

  // ==================== USERS ====================
  async getUserInfo(accountId) {
    return this.execute(accountId, (sdk) => sdk.users.getUserInfo());
  }

  async getUser(accountId, userId) {
    return this.execute(accountId, (sdk) => sdk.users.getUser(userId));
  }

  // ==================== MERCADO PAGO ====================
  async mpCreatePayment(accountId, paymentData) {
    return this.execute(accountId, (sdk) =>
      sdk.mpPayments.createPayment(paymentData),
    );
  }

  async mpGetPayment(accountId, paymentId) {
    return this.execute(accountId, (sdk) =>
      sdk.mpPayments.getPayment(paymentId),
    );
  }

  async mpSearchPayments(accountId, params) {
    return this.execute(accountId, (sdk) =>
      sdk.mpPayments.searchPayments(params),
    );
  }

  async mpCreateCustomer(accountId, customerData) {
    return this.execute(accountId, (sdk) =>
      sdk.mpCustomers.createCustomer(customerData),
    );
  }

  async mpGetCustomer(accountId, customerId) {
    return this.execute(accountId, (sdk) =>
      sdk.mpCustomers.getCustomer(customerId),
    );
  }

  // ==================== GLOBAL SELLING ====================
  async gsListProducts(accountId, params) {
    return this.execute(accountId, (sdk) =>
      sdk.globalSelling.listProducts(params),
    );
  }

  async gsGetProduct(accountId, productId) {
    return this.execute(accountId, (sdk) =>
      sdk.globalSelling.getProduct(productId),
    );
  }
}

// Exporta instância singleton
module.exports = new SDKManager();
