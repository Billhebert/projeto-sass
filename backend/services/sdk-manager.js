/**
 * SDK Manager - Gerenciamento Centralizado da SDK do Mercado Livre
 * 
 * Este serviço centraliza todas as chamadas à API do Mercado Livre,
 * garantindo que cada conta use seus próprios tokens de autenticação.
 *
 * Benefícios:
 * - Gerenciamento automático de tokens por conta
 * - Cache de instâncias da SDK para melhor performance
 * - Tratamento de erros padronizado
 * - Paginação automática completa
 * - Retry automático em falhas temporárias
 * - Logging centralizado
 */

const MercadoLivreSDK = require("../sdk/mercadolivre-full-sdk");
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
   * @returns {Promise<MercadoLivreSDK>} Instância configurada da SDK
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

      // Criar nova instância da SDK com configurações completas
      const sdk = new MercadoLivreSDK({
        accessToken: account.accessToken,
        refreshToken: account.refreshToken || null,
        clientId: account.clientId || null,
        clientSecret: account.clientSecret || null,
        redirectUri: account.redirectUri || null,
        siteId: account.siteId || 'MLB',
        timeout: 60000,
        maxRetries: 3,
        requestDelay: 100,
      });

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
        hasRefreshToken: !!account.refreshToken,
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
      });
      throw this.normalizeError(error);
    }
  }

  /**
   * Normaliza erros da API em um formato padrão
   */
  normalizeError(error) {
    if (error.isNormalized) {
      return error;
    }

    const normalizedError = new Error(error.message || "Unknown error");
    normalizedError.isNormalized = true;
    normalizedError.originalError = error;

    if (error.response?.data) {
      normalizedError.apiError = error.response.data;
      normalizedError.message = error.response.data.message || error.message;
    }

    if (error.response?.status) {
      normalizedError.statusCode = error.response.status;
    }

    if (error.response?.status === 401) {
      normalizedError.type = "AUTHENTICATION_ERROR";
      normalizedError.message = "Token inválido ou expirado";
    } else if (error.response?.status === 403) {
      normalizedError.type = "AUTHORIZATION_ERROR";
      normalizedError.message = "Sem permissão para esta operação";
    } else if (error.response?.status === 404) {
      normalizedError.type = "NOT_FOUND";
      normalizedError.message = "Recurso não encontrado";
    } else if (error.response?.status === 429) {
      normalizedError.type = "RATE_LIMIT";
      normalizedError.message = "Limite de requisições excedido";
    } else if (error.response?.status >= 500) {
      normalizedError.type = "SERVER_ERROR";
      normalizedError.message = "Erro no servidor do Mercado Livre";
    } else {
      normalizedError.type = "API_ERROR";
    }

    return normalizedError;
  }

  // ==================== USUÁRIOS ====================
  async getMe(accountId) {
    return this.execute(accountId, (sdk) => sdk.getMe());
  }

  async getUser(accountId, userId) {
    return this.execute(accountId, (sdk) => sdk.getUser(userId));
  }

  // ==================== ITENS ====================
  async getItem(accountId, itemId) {
    return this.execute(accountId, (sdk) => sdk.getItem(itemId));
  }

  async getItemsByIds(accountId, itemIds) {
    return this.execute(accountId, (sdk) => sdk.getItemsByIds(itemIds));
  }

  async createItem(accountId, item) {
    return this.execute(accountId, (sdk) => sdk.createItem(item));
  }

  async updateItem(accountId, itemId, item) {
    return this.execute(accountId, (sdk) => sdk.updateItem(itemId, item));
  }

  async getItemDescription(accountId, itemId) {
    return this.execute(accountId, (sdk) => sdk.getItemDescription(itemId));
  }

  async getVariations(accountId, itemId) {
    return this.execute(accountId, (sdk) => sdk.getVariations(itemId));
  }

  async getItemWithDetails(accountId, itemId) {
    return this.execute(accountId, (sdk) => sdk.getItemWithDetails(itemId));
  }

  async getAllUserItems(accountId, userId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.getAllUserItems(userId, options));
  }

  // Alias para compatibilidade com código antigo que retorna formato paginado
  async getItemsByUser(accountId, userId, params = {}) {
    // Usa a API do ML para buscar items por paginação
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const status = params.status;
    
    return this.execute(accountId, async (sdk) => {
      let url = `/users/${userId}/items/search?limit=${limit}&offset=${offset}`;
      if (status) url += `&status=${status}`;
      
      const response = await sdk.client.get(url);
      
      return {
        data: {
          results: response.data.results || [],
          paging: response.data.paging || { total: 0, limit, offset },
          seller_id: userId,
        },
        status: response.status,
      };
    });
  }

  // ==================== PEDIDOS ====================
  async searchOrders(accountId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.searchOrders(options));
  }

  async getSellerOrders(accountId, sellerId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.getSellerOrders(sellerId, options));
  }

  async getPaidOrders(accountId, sellerId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.getPaidOrders(sellerId, options));
  }

  async getOrder(accountId, orderId) {
    return this.execute(accountId, (sdk) => sdk.getOrder(orderId));
  }

  async getAllOrders(accountId, sellerId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.getAllOrders(sellerId, options));
  }

  // ==================== PERGUNTAS ====================
  async searchQuestions(accountId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.searchQuestions(options));
  }

  async getSellerQuestions(accountId, sellerId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.getSellerQuestions(sellerId, options));
  }

  async getAllSellerQuestions(accountId, sellerId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.getAllSellerQuestions(sellerId, options));
  }

  // ==================== ENVIOS ====================
  async searchShipments(accountId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.searchShipments(options));
  }

  async getAllShipments(accountId, sellerId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.getAllShipments(sellerId, options));
  }

  async getShipmentStatuses(accountId) {
    return this.execute(accountId, (sdk) => sdk.getShipmentStatuses());
  }

  // ==================== SITES E CATEGORIAS ====================
  async listSites(accountId) {
    return this.execute(accountId, (sdk) => sdk.listSites());
  }

  async getSite(accountId, siteId) {
    return this.execute(accountId, (sdk) => sdk.getSite(siteId));
  }

  async getAllSiteCategories(accountId, siteId) {
    return this.execute(accountId, (sdk) => sdk.getAllSiteCategories(siteId));
  }

  async getCategory(accountId, categoryId) {
    return this.execute(accountId, (sdk) => sdk.getCategory(categoryId));
  }

  async getCategoryAttributes(accountId, categoryId) {
    return this.execute(accountId, (sdk) => sdk.getCategoryAttributes(categoryId));
  }

  // ==================== BUSCA ====================
  async search(accountId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.search(options));
  }

  async searchByQuery(accountId, query, options = {}) {
    return this.execute(accountId, (sdk) => sdk.searchByQuery(query, options));
  }

  async searchAllByCategory(accountId, categoryId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.searchAllByCategory(categoryId, options));
  }

  // ==================== MOEDAS ====================
  async listCurrencies(accountId) {
    return this.execute(accountId, (sdk) => sdk.listCurrencies());
  }

  async getCurrency(accountId, currencyId) {
    return this.execute(accountId, (sdk) => sdk.getCurrency(currencyId));
  }

  // ==================== FEEDBACK ====================
  async getOrderFeedback(accountId, orderId) {
    return this.execute(accountId, (sdk) => sdk.getOrderFeedback(orderId));
  }

  async getItemReviews(accountId, itemId) {
    return this.execute(accountId, (sdk) => sdk.getItemReviews(itemId));
  }

  async getAllItemReviews(accountId, itemId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.getAllItemReviews(itemId, options));
  }

  // ==================== PUBLICIDADE ====================
  async listAdvertisers(accountId, productId = null) {
    return this.execute(accountId, (sdk) => sdk.listAdvertisers(productId));
  }

  async getBonifications(accountId) {
    return this.execute(accountId, (sdk) => sdk.getBonifications());
  }

  // ==================== CATÁLOGO ====================
  async searchCatalog(accountId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.searchCatalog(options));
  }

  // ==================== PRECIFICAÇÃO ====================
  async getPriceSuggestions(accountId, userId) {
    return this.execute(accountId, (sdk) => sdk.getPriceSuggestions(userId));
  }

  // ==================== FLEX ====================
  async getFlexSubscriptions(accountId, siteId, userId) {
    return this.execute(accountId, (sdk) => sdk.getFlexSubscriptions(siteId, userId));
  }

  // ==================== TENDÊNCIAS ====================
  async getTrends(accountId, siteId) {
    return this.execute(accountId, (sdk) => sdk.getTrends(siteId));
  }

  async getBrazilTrends(accountId) {
    return this.execute(accountId, (sdk) => sdk.getBrazilTrends());
  }

  async getAllTrends(accountId) {
    return this.execute(accountId, (sdk) => sdk.getAllTrends());
  }

  async getCategoryTrends(accountId, siteId, categoryId) {
    return this.execute(accountId, (sdk) => sdk.getCategoryTrends(siteId, categoryId));
  }

  // ==================== REPUTAÇÃO ====================
  async getSellerReputation(accountId, sellerId) {
    return this.execute(accountId, (sdk) => sdk.getSellerReputation(sellerId));
  }

  // ==================== VISITAS ====================
  async getUserVisits(accountId, userId, dateFrom, dateTo) {
    return this.execute(accountId, (sdk) => sdk.getUserVisits(userId, dateFrom, dateTo));
  }

  async getVisitsTimeWindow(accountId, userId, last = 30, unit = 'day') {
    return this.execute(accountId, (sdk) => sdk.getVisitsTimeWindow(userId, last, unit));
  }

  // ==================== MODERAÇÃO ====================
  async getCatalogQualityStatus(accountId, sellerId, includeItems = true, version = 2) {
    return this.execute(accountId, (sdk) => sdk.getCatalogQualityStatus(sellerId, includeItems, version));
  }

  // ==================== MENSAGENS ====================
  async getUnreadMessages(accountId, tag = 'post_sale') {
    return this.execute(accountId, (sdk) => sdk.getUnreadMessages(tag));
  }

  async getMessagesByPack(accountId, packId, sellerId, tag = 'post_sale') {
    return this.execute(accountId, (sdk) => sdk.getMessagesByPack(packId, sellerId, tag));
  }

  async getAllMessages(accountId, tag = 'post_sale', options = {}) {
    return this.execute(accountId, (sdk) => sdk.getAllMessages(tag, options));
  }

  // ==================== FAVORITOS ====================
  async listFavorites(accountId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.listFavorites(options));
  }

  // ==================== FATURAMENTO ====================
  async getBillingPeriods(accountId, options = {}) {
    return this.execute(accountId, (sdk) => sdk.getBillingPeriods(options));
  }

  // ==================== AUTENTICAÇÃO ====================
  async exchangeCodeForToken(accountId, code) {
    return this.execute(accountId, (sdk) => sdk.exchangeCodeForToken(code));
  }

  async refreshAccessToken(accountId) {
    return this.execute(accountId, (sdk) => sdk.refreshAccessToken());
  }

  // ==================== COLLETA COMPLETA ====================
  async collectAllData(accountId, config) {
    const sdk = await this.getSDK(accountId);
    return sdk.collectAllData(config);
  }
}

// Exporta instância singleton
module.exports = new SDKManager();
