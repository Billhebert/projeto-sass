/**
 * Mercado Livre SDK Completo - Sem Limites
 * Busca TUDO de TUDO com paginação completa
 */

const axios = require('axios');

class MercadoLivreError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.name = 'MercadoLivreError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

class MercadoLivre {
  constructor(config = {}) {
    this.config = {
      siteId: 'MLB',
      timeout: 60000,
      baseURL: 'https://api.mercadolibre.com',
      maxRetries: 3,
      requestDelay: 100,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MercadoLivre-SDK-Full/2.0',
      },
    });

    this._setupInterceptors();
  }

  _setupInterceptors() {
    this.client.interceptors.request.use((config) => {
      if (this.config.accessToken && !config.headers.skipAuth) {
        config.headers.Authorization = `Bearer ${this.config.accessToken}`;
      }
      if (this.config.siteId) {
        config.headers['X-Site-Id'] = this.config.siteId;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.config.refreshToken) {
          try {
            await this.refreshAccessToken();
            return this.client.request(error.config);
          } catch {
            throw new MercadoLivreError('Token expirado', 401, 'TOKEN_EXPIRED');
          }
        }
        throw new MercadoLivreError(
          error.response?.data?.message || error.message,
          error.response?.status,
          error.response?.data?.code
        );
      }
    );
  }

  setAccessToken(accessToken) {
    this.config.accessToken = accessToken;
  }

  setSiteId(siteId) {
    this.config.siteId = siteId;
  }

  async _requestWithRetry(method, url, data = null, retries = 0) {
    try {
      if (this.config.requestDelay && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.requestDelay * retries));
      }
      
      if (method === 'get') {
        const response = await this.client.get(url);
        return response.data;
      } else if (method === 'post') {
        const response = await this.client.post(url, data);
        return response.data;
      }
    } catch (error) {
      if (retries < this.config.maxRetries && error.response?.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        return this._requestWithRetry(method, url, data, retries + 1);
      }
      throw error;
    }
  }

  async get(url) {
    return this._requestWithRetry('get', url);
  }

  async post(url, data) {
    return this._requestWithRetry('post', url, data);
  }

  // ========== PAGINAÇÃO COMPLETA (PARA AUTOMATICAMENTE) ==========
  async getAll(url, options = {}) {
    const allResults = [];
    let offset = options.offset || 0;
    const limit = options.limit || 100;
    let total = null;
    let consecutiveEmpty = 0;
    const maxEmptyConsecutive = 3;
    const maxOffset = options.maxOffset || 100000; // Limite de segurança
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;

    console.log(`  🔄 Iniciando paginação (limit: ${limit})`);

    while (true) {
      // Limite de segurança para evitar loop infinito
      if (offset >= maxOffset) {
        console.log(`  🛑 Parando: offset ${offset} >= limite máximo ${maxOffset}`);
        break;
      }
      
      // Muitos erros consecutivos → parar
      if (consecutiveErrors >= maxConsecutiveErrors) {
        console.log(`  🛑 Parando: ${consecutiveErrors} erros consecutivos`);
        break;
      }

      const separator = url.includes('?') ? '&' : '?';
      const currentUrl = `${url}${separator}offset=${offset}&limit=${limit}`;
      
      try {
        const response = await this.get(currentUrl);
        consecutiveErrors = 0; // Reset em sucesso
        
        let items = [];
        let responseTotal = null;
        
        if (Array.isArray(response)) {
          items = response;
          responseTotal = items.length;
        } else if (response.paging?.total !== undefined) {
          items = response.results || response.data || [];
          responseTotal = response.paging.total;
        } else if (response.results) {
          items = response.results;
          responseTotal = offset + items.length;
        } else if (response.data) {
          items = response.data;
          responseTotal = offset + items.length;
        } else {
          items = [response];
          responseTotal = offset + 1;
        }
        
        // Na primeira resposta, define o total se existir
        if (total === null && responseTotal !== null) {
          total = responseTotal;
          console.log(`  📊 Total de registros: ${total}`);
        }
        
        if (items.length === 0) {
          consecutiveEmpty++;
          console.log(`  📭 Offset ${offset}: vazio (${consecutiveEmpty}/${maxEmptyConsecutive})`);
          if (consecutiveEmpty >= maxEmptyConsecutive) {
            console.log(`  🛑 Parando: ${consecutiveEmpty} páginas consecutivas vazias`);
            break;
          }
        } else {
          consecutiveEmpty = 0;
          allResults.push(...items);
          const progress = total ? `(${(offset / total * 100).toFixed(0)}%)` : '';
          console.log(`  📥 Offset ${offset}: +${items.length} itens ${progress}`);
        }
        
        // CONDIÇÕES PARA PARAR:
        // 1. items.length < limit → última página
        // 2. offset + items.length >= total → chegou ao fim
        // 3. consecutiveEmpty >= maxEmptyConsecutive → sem mais dados
        if (items.length < limit) {
          console.log(`  🛑 Parando: última página (${items.length} < ${limit})`);
          break;
        }
        
        if (total !== null && offset + items.length >= total) {
          console.log(`  🛑 Parando: offset ${offset + items.length} >= total ${total}`);
          break;
        }
        
        offset += limit;
        
        await new Promise(resolve => setTimeout(resolve, this.config.requestDelay || 50));
        
      } catch (error) {
        consecutiveErrors++;
        console.error(`  ❌ Erro no offset ${offset}: ${error.message}`);
        
        if (error.response?.status === 429) {
          console.log(`  ⏳ Rate limited, aguardando 2 segundos...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else if (error.response?.status === 401) {
          console.log(`  🔒 Token expirado. Gere um novo token.`);
          break;
        } else if (error.response?.status >= 400 && error.response?.status < 500) {
          console.log(`  🛑 Parando: erro ${error.response?.status}`);
          break;
        } else {
          offset += limit;
        }
      }
    }

    console.log(`  ✅ Finalizado: ${allResults.length} registros coletados`);
    
    return {
      data: allResults,
      paging: {
        total: allResults.length,
        offset: 0,
        limit: allResults.length
      }
    };
   }

  // ========== AUTENTICAÇÃO ==========
  async exchangeCodeForToken(code) {
    return this.post('/oauth/token', {
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
    });
  }

  async refreshAccessToken() {
    const response = await this.post('/oauth/token', {
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
    });
    this.setAccessToken(response.access_token);
    if (response.refresh_token) {
      this.config.refreshToken = response.refresh_token;
    }
    return response;
  }

  // ========== USUÁRIOS ==========
  async getMe() {
    return this.get('/users/me');
  }

  async getUser(userId) {
    return this.get(`/users/${userId}`);
  }

  async getUserAddresses(userId) {
    return this.getAll(`/users/${userId}/addresses`);
  }

  async getUserItems(userId, options = {}) {
    return this.getAll(`/users/${userId}/items/search`, options);
  }

  async getUserBrands(userId) {
    try {
      return await this.get(`/users/${userId}/brands`);
    } catch {
      return [];
    }
  }

  async getSellerRecoveryStatus(userId) {
    try {
      return await this.get(`/users/${userId}/reputation/seller_recovery/status`);
    } catch {
      return { status: 'not_available' };
    }
  }

  // ========== ITENS ==========
  async getItem(itemId) {
    return this.get(`/items/${itemId}`);
  }

  async getItemsByIds(itemIds, attributes = null) {
    const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
    const batches = [];
    for (let i = 0; i < ids.length; i += 20) {  // API permite máximo 20 IDs por requisição
      batches.push(ids.slice(i, i + 20));
    }
    
    const allResults = [];
    for (const batch of batches) {
      const params = new URLSearchParams({ ids: batch.join(',') });
      if (attributes) params.append('attributes', attributes.join(','));
      const result = await this.get(`/items?${params.toString()}`);
      allResults.push(...result);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return allResults;
  }

  async createItem(item) {
    return this.post('/items', item);
  }

  async updateItem(itemId, item) {
    return this.put(`/items/${itemId}`, item);
  }

  async getItemDescription(itemId) {
    return this.get(`/items/${itemId}/description`);
  }

  async getItemPictures(itemId) {
    return this.get(`/items/${itemId}/pictures`);
  }

  async getVariations(itemId) {
    try {
      return await this.get(`/items/${itemId}/variations`);
    } catch {
      return [];
    }
  }

  async getItemWithDetails(itemId) {
    const [item, description, pictures, variations] = await Promise.all([
      this.get(`/items/${itemId}`),
      this.getItemDescription(itemId).catch(() => null),
      this.getItemPictures(itemId).catch(() => []),
      this.getVariations(itemId).catch(() => []),
    ]);
    
    return {
      ...item,
      description,
      pictures,
      variations,
    };
  }

  // ========== TODOS OS ITENS DO USUÁRIO ==========
  async getAllUserItems(userId, options = {}) {
    console.log(`🔍 Buscando TODOS os itens do usuário ${userId}...`);
    
    const searchResult = await this.getAll(`/users/${userId}/items/search`, options);
    
    const itemIds = searchResult.data;
    console.log(`📦 Total de IDs: ${itemIds.length}`);
    
    if (itemIds.length === 0) return { items: [], total: 0 };
    
    console.log(`🔍 Buscando detalhes de ${itemIds.length} itens...`);
    
    const items = [];
    for (let i = 0; i < itemIds.length; i += 50) {
      const batch = itemIds.slice(i, i + 50);
      const batchItems = await this.getItemsByIds(batch);
      items.push(...batchItems);
      
      const progress = Math.round(((i + 50) / itemIds.length) * 100);
      console.log(`  Progresso: ${progress}% (${i + batch.length}/${itemIds.length})`);
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return {
      items,
      total: items.length,
      ids: itemIds,
    };
  }

  // ========== PEDIDOS ==========
  async searchOrders(options = {}) {
    return this.getAll('/orders/search', options);
  }

  async getSellerOrders(sellerId, options = {}) {
    return this.searchOrders({ seller: sellerId, ...options });
  }

  async getPaidOrders(sellerId, options = {}) {
    return this.searchOrders({ seller: sellerId, 'order.status': 'paid', ...options });
  }

  async getOrder(orderId) {
    return this.get(`/orders/${orderId}`);
  }

  async getAllOrders(sellerId, options = {}) {
    console.log(`🔍 Buscando TODOS os pedidos do vendedor ${sellerId}...`);
    return this.getSellerOrders(sellerId, options);
  }

  // ========== PERGUNTAS ==========
  async searchQuestions(options = {}) {
    try {
      return await this.get('/questions/search', options);
    } catch (error) {
      if (error.message?.includes('Invalid client') || error.statusCode === 401) {
        console.log(`  ⚠️ Permissão necessária: questions_access`);
        return { questions: [], paging: { total: 0 } };
      }
      throw error;
    }
  }

  async getSellerQuestions(sellerId, options = {}) {
    return this.searchQuestions({ seller_id: sellerId, ...options });
  }

  async getAllSellerQuestions(sellerId, options = {}) {
    console.log(`🔍 Buscando TODAS as perguntas do vendedor ${sellerId}...`);
    return this.getSellerQuestions(sellerId, options);
  }

  // ========== ENVIOS ==========
  async searchShipments(options = {}) {
    try {
      return await this.get('/shipments/search', options);
    } catch (error) {
      if (error.message?.includes('Invalid client') || error.statusCode === 401) {
        console.log(`  ⚠️ Permissão necessária: shipments`);
        return { shipments: [], paging: { total: 0 } };
      }
      throw error;
    }
  }

  async getAllShipments(sellerId, options = {}) {
    console.log(`🔍 Buscando TODOS os envios...`);
    return this.searchShipments({ seller_id: sellerId, ...options });
  }

  async getShipmentStatuses() {
    return this.get('/shipment_statuses');
  }

  // ========== SITES E CATEGORIAS ==========
  async listSites() {
    return this.get('/sites');
  }

  async getSite(siteId) {
    return this.get(`/sites/${siteId}`);
  }

  async getListingTypes(siteId) {
    return this.get(`/sites/${siteId}/listing_types`);
  }

  async getSitePaymentMethods(siteId) {
    return this.get(`/sites/${siteId}/payment_methods`);
  }

  async getSiteShippingMethods(siteId) {
    return this.get(`/sites/${siteId}/shipping_methods`);
  }

  async getSiteCategories(siteId) {
    return this.get(`/sites/${siteId}/categories`);
  }

  async getAllSiteCategories(siteId) {
    console.log(`🔍 Buscando TODAS as categorias do site ${siteId}...`);
    const categories = await this.get(`/sites/${siteId}/categories`);
    
    const allCategories = [];
    for (const cat of categories) {
      const categoryData = await this.get(`/categories/${cat.id}`);
      const attributes = await this.get(`/categories/${cat.id}/attributes`).catch(() => []);
      
      allCategories.push({
        ...categoryData,
        attributes,
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return allCategories;
  }

  async getCategory(categoryId) {
    return this.get(`/categories/${categoryId}`);
  }

  async getCategoryAttributes(categoryId) {
    return this.get(`/categories/${categoryId}/attributes`);
  }

  // ========== BUSCA ==========
  async search(options = {}) {
    return this.getAll(`/sites/${this.config.siteId}/search`, options);
  }

  async searchByQuery(query, options = {}) {
    return this.search({ q: query, ...options });
  }

  async searchByCategory(categoryId, options = {}) {
    return this.search({ category: categoryId, ...options });
  }

  async searchAllByCategory(categoryId, options = {}) {
    console.log(`🔍 Buscando TODOS os produtos da categoria ${categoryId}...`);
    return this.searchByCategory(categoryId, { ...options, maxIterations: 10000 });
  }

  // ========== MOEDAS ==========
  async listCurrencies() {
    return this.get('/currencies');
  }

  async getCurrency(currencyId) {
    return this.get(`/currencies/${currencyId}`);
  }

  async convertCurrency(from, to) {
    return this.get(`/currency_conversions/search?from=${from}&to=${to}`);
  }

  // ========== LOCALIZAÇÃO ==========
  async listCountries() {
    return this.get('/classified_locations/countries');
  }

  async getStates(countryId) {
    return this.get(`/classified_locations/countries/${countryId}/states`);
  }

  async getCities(stateId) {
    return this.get(`/classified_locations/states/${stateId}/cities`);
  }

  async getAllStatesAndCities(countryId) {
    console.log(`🔍 Buscando todos os estados e cidades de ${countryId}...`);
    try {
      const states = await this.getStates(countryId);
      
      if (!states || states.length === 0) {
        console.log(`  ℹ️ Nenhum estado encontrado para ${countryId} (endpoint pode estar desabilitado)`);
        return [];
      }
      
      const allLocations = [];
      for (const state of states) {
        try {
          const cities = await this.getCities(state.id).catch(() => []);
          allLocations.push({ ...state, cities });
        } catch {
          allLocations.push({ ...state, cities: [] });
        }
      }
      
      return allLocations;
    } catch (error) {
      if (error.message?.includes('not found') || error.statusCode === 404) {
        console.log(`  ⚠️ Endpoint de localidades indisponível no momento`);
      } else {
        console.log(`  ⚠️ Erro ao buscar localidades: ${error.message}`);
      }
      return [];
    }
  }

  // ========== FEEDBACK ==========
  async getOrderFeedback(orderId) {
    return this.get(`/orders/${orderId}/feedback`);
  }

  async getItemReviews(itemId) {
    return this.get(`/reviews/item/${itemId}`);
  }

  async getAllItemReviews(itemId, options = {}) {
    return this.getAll(`/reviews/item/${itemId}`, options);
  }

  // ========== PUBLICIDADE ==========
  async listAdvertisers(productId) {
    try {
      if (productId) {
        return await this.get(`/advertising/advertisers?product_id=${productId}`);
      }
      return await this.get('/advertising/advertisers');
    } catch {
      return [];
    }
  }

  async getBonifications() {
    return this.get('/advertising/advertisers/bonifications');
  }

  // ========== CATÁLOGO ==========
  async searchCatalog(options = {}) {
    return this.getAll('/products/search', { ...options, maxIterations: 10000 });
  }

  async listAvailableDomains(siteId) {
    return this.get(`/catalog_suggestions/domains/${siteId}/available/full`);
  }

  async getTechnicalSpecs(domainId) {
    return this.get(`/domains/${domainId}/technical_specs`);
  }

  async getSuggestionQuota(userId) {
    try {
      return await this.get(`/catalog_suggestions/users/${userId}/quota`);
    } catch {
      return { quota: 0, used: 0, available: 0 };
    }
  }

  // ========== PRECIFICAÇÃO ==========
  async getPriceSuggestions(userId) {
    return this.get(`/suggestions/user/${userId}/items`);
  }

  // ========== FLEX ==========
  async getFlexSubscriptions(siteId, userId) {
    return this.get(`/flex/sites/${siteId}/users/${userId}/subscriptions/v1`);
  }

  // ========== TENDÊNCIAS ==========
  async getTrends(siteId) {
    return this.get(`/trends/${siteId}`);
  }

  async getBrazilTrends() {
    return this.get('/trends/MLB');
  }

  async getAllTrends() {
    console.log('🔍 Buscando tendências de TODOS os sites...');
    const sites = await this.listSites();
    
    const allTrends = {};
    for (const site of sites) {
      console.log(`  📈 Tendências de ${site.id} (${site.name})...`);
      try {
        allTrends[site.id] = await this.getTrends(site.id);
      } catch {
        allTrends[site.id] = [];
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return allTrends;
  }

  async getCategoryTrends(siteId, categoryId) {
    return this.get(`/trends/${siteId}/${categoryId}`);
  }

  // ========== REPUTAÇÃO ==========
  async getSellerReputation(sellerId) {
    try {
      return await this.get(`/users/${sellerId}/reputation`);
    } catch {
      return { level_id: null, power_seller_status: null, transactions: { total: 0, completed: 0, canceled: 0 } };
    }
  }

  // ========== VISITAS ==========
  async getUserVisits(userId, dateFrom, dateTo) {
    return this.get(`/users/${userId}/items_visits?date_from=${dateFrom}&date_to=${dateTo}`);
  }

  async getVisitsTimeWindow(userId, last = 30, unit = 'day', ending = new Date().toISOString().split('T')[0]) {
    return this.get(`/users/${userId}/items_visits/time_window?last=${last}&unit=${unit}&ending=${ending}`);
  }

  // ========== MODERAÇÃO ==========
  async getCatalogQualityStatus(sellerId, includeItems = true, version = 2) {
    return this.get(`/catalog_quality/status?seller_id=${sellerId}&include_items=${includeItems}&v=${version}`);
  }

  // ========== MENSAGENS ==========
  async getUnreadMessages(tag = 'post_sale') {
    return this.get(`/messages/unread?tag=${tag}`);
  }

  async getMessagesByPack(packId, sellerId, tag = 'post_sale') {
    return this.get(`/messages/packs/${packId}/sellers/${sellerId}?tag=${tag}`);
  }

  async getAllMessages(tag = 'post_sale', options = {}) {
    console.log(`🔍 Buscando TODAS as mensagens...`);
    try {
      return await this.getAll(`/messages?tag=${tag}`, options);
    } catch (error) {
      if (error.message?.includes('Invalid client') || error.statusCode === 401) {
        console.log(`  ⚠️ Permissão necessária: messages_access`);
        return { data: [], paging: { total: 0 } };
      }
      throw error;
    }
  }

  // ========== FAVORITOS ==========
  async listFavorites(options = {}) {
    return this.getAll('/favorites', options);
  }

  // ========== FATURAMENTO ==========
  async getBillingPeriods(options = {}) {
    const params = new URLSearchParams(options);
    return this.get(`/billing/integration/monthly/periods?${params.toString()}`);
  }

  // ========== COLETA COMPLETA DE TUDO ==========
  async collectAllData(config) {
    const { userId, siteId = 'MLB' } = config;
    
    console.log('='.repeat(60));
    console.log('🔎 COLETANDO TUDO DE TUDO DO MERCADO LIVRE');
    console.log('='.repeat(60));
    console.log(`Usuário: ${userId}`);
    console.log(`Site: ${siteId}`);
    console.log('='.repeat(60));
    
    const allData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        userId,
        siteId,
        version: '2.0-FULL',
      },
    };

    // 1. PERFIL DO USUÁRIO
    console.log('\n👤 Coletando perfil do usuário...');
    allData.user = await this.getMe();

    // 2. TODOS OS ENDEREÇOS
    console.log('\n📍 Coletando todos os endereços...');
    allData.addresses = await this.getUserAddresses(userId);

    // 3. TODOS OS ITENS (COMPLETO)
    console.log('\n📦 Coletando TODOS os itens...');
    allData.items = await this.getAllUserItems(userId);

    // 4. TODAS AS PERGUNTAS
    console.log('\n💬 Coletando TODAS as perguntas...');
    allData.questions = await this.getAllSellerQuestions(userId);

    // 5. TODOS OS PEDIDOS
    console.log('\n🛒 Coletando TODOS os pedidos...');
    allData.orders = await this.getAllOrders(userId);

    // 6. TODOS OS ENVIOS
    console.log('\n🚚 Coletando TODOS os envios...');
    allData.shipments = await this.getAllShipments(userId);

    // 7. TODAS AS CATEGORIAS
    console.log('\n📁 Coletando TODAS as categorias...');
    allData.categories = await this.getAllSiteCategories(siteId);

    // 8. TODOS OS SITES
    console.log('\n🌐 Coletando TODOS os sites...');
    allData.sites = await this.listSites();

    // 9. TODOS OS PAÍSES, ESTADOS E CIDADES
    console.log('\n🗺️ Coletando TODAS as localidades...');
    allData.locations = await this.getAllStatesAndCities('BR');

    // 10. TODAS AS MOEDAS
    console.log('\n💰 Coletando TODAS as moedas...');
    allData.currencies = await this.listCurrencies();

    // 11. TODAS AS TENDÊNCIAS
    console.log('\n📈 Coletando TODAS as tendências...');
    allData.trends = await this.getAllTrends();

    // 12. MÉTODOS DE PAGAMENTO E ENVIO DO SITE
    console.log('\n💳 Coletando métodos de pagamento...');
    allData.paymentMethods = await this.getSitePaymentMethods(siteId);
    
    console.log('\n🚛 Coletando métodos de envio...');
    allData.shippingMethods = await this.getSiteShippingMethods(siteId);

    // 13. REPUTAÇÃO DO VENDEDOR
    console.log('\n⭐ Coletando reputação...');
    allData.reputation = await this.getSellerReputation(userId);

    // 14. MENSAGENS
    console.log('\n📧 Coletando mensagens...');
    allData.messages = await this.getAllMessages();

    // 15. STATUS DE MODERAÇÃO
    console.log('\n🛡️ Coletando status de moderação...');
    allData.moderation = await this.getCatalogQualityStatus(userId);

    console.log('\n' + '='.repeat(60));
    console.log('✅ COLETA COMPLETA FINALIZADA!');
    console.log('='.repeat(60));
    
    return allData;
  }
}

module.exports = MercadoLivre;
module.exports.default = MercadoLivre;
module.exports.MercadoLivreError = MercadoLivreError;
