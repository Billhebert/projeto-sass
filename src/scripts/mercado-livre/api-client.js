/**
 * Cliente HTTP para API Mercado Livre
 * Com retry automático, timeout e cache
 */

class MLAPIClient {
  constructor(accessToken, userId) {
    this.accessToken = accessToken;
    this.userId = userId;
    this.baseURL = 'https://api.mercadolibre.com';
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.requestTimeout = 15000;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Fazer requisição com retry automático
   */
  async request(method, endpoint, data = null, useCache = true) {
    const cacheKey = `${method}:${endpoint}`;

    // Verificar cache para GET requests
    if (method === 'GET' && useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached.expiry > Date.now()) {
        console.log(`[CACHE HIT] ${endpoint}`);
        return cached.data;
      }
    }

    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this._makeRequest(method, endpoint, data);
        
        // Cachear resposta se for GET
        if (method === 'GET') {
          this.cache.set(cacheKey, {
            data: response,
            expiry: Date.now() + this.cacheExpiry
          });
        }

        return response;

      } catch (error) {
        lastError = error;

        // Não fazer retry em certos erros
        if (error.status === 401) {
          throw new Error('Token expirado - faça login novamente');
        }
        if (error.status === 403) {
          throw new Error('Sem permissão para este recurso');
        }
        if (error.status === 404) {
          throw new Error('Recurso não encontrado');
        }
        if (error.status === 429) {
          throw new Error('Rate limit excedido - tente mais tarde');
        }

        // Aguardar antes de retry (backoff exponencial)
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`[RETRY ${attempt + 1}/${this.maxRetries}] ${endpoint} em ${delay}ms`);
          await this._sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Fazer requisição HTTP
   */
  async _makeRequest(method, endpoint, data = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const url = `${this.baseURL}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Dashboard-SASS/1.0'
        },
        signal: controller.signal
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.message || errorData.error || `HTTP ${response.status}`
        );
        error.status = response.status;
        error.response = errorData;
        throw error;
      }

      return await response.json();

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Dormir por X ms
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpar cache
   */
  clearCache() {
    this.cache.clear();
    console.log('✓ Cache limpo');
  }

  // ==================== MÉTODOS DE USUÁRIO ====================

  async getUser() {
    return this.request('GET', `/users/${this.userId}`);
  }

  async getUserSummary() {
    return this.request('GET', `/users/${this.userId}/summary`);
  }

  async getUserAddresses() {
    return this.request('GET', `/users/${this.userId}/addresses`);
  }

  // ==================== MÉTODOS DE PRODUTOS ====================

  async getItems(limit = 50, offset = 0) {
    return this.request(
      'GET',
      `/users/${this.userId}/items/search?limit=${limit}&offset=${offset}`
    );
  }

  async getItem(itemId) {
    return this.request('GET', `/items/${itemId}`);
  }

  async updateItem(itemId, data) {
    this.clearCache(); // Invalidar cache ao atualizar
    return this.request('PUT', `/items/${itemId}`, data, false);
  }

  async updateItemPrice(itemId, price) {
    return this.updateItem(itemId, { price });
  }

  async updateItemStock(itemId, quantity) {
    return this.updateItem(itemId, { available_quantity: quantity });
  }

  // ==================== MÉTODOS DE VENDAS ====================

  async getOrders(filters = {}) {
    const params = new URLSearchParams({
      seller_id: this.userId,
      ...filters
    });

    return this.request(
      'GET',
      `/orders/search/all?${params.toString()}`
    );
  }

  async getOrdersLastDays(days = 30) {
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return this.getOrders({
      'order.date_created.from': from.toISOString(),
      'order.date_created.to': now.toISOString()
    });
  }

  async getOrder(orderId) {
    return this.request('GET', `/orders/${orderId}`);
  }

  async updateOrder(orderId, data) {
    this.clearCache();
    return this.request('PUT', `/orders/${orderId}`, data, false);
  }

  // ==================== MÉTODOS DE ENVIOS ====================

  async getShipment(shipmentId) {
    return this.request('GET', `/shipments/${shipmentId}`);
  }

  async updateShipment(shipmentId, data) {
    this.clearCache();
    return this.request('PUT', `/shipments/${shipmentId}`, data, false);
  }

  async markShipmentAsShipped(shipmentId, trackingNumber) {
    return this.updateShipment(shipmentId, {
      status: 'shipped',
      tracking: {
        number: trackingNumber,
        date: new Date().toISOString()
      }
    });
  }

  // ==================== MÉTODOS DE PAGAMENTOS ====================

  async getSellerMoney() {
    return this.request(
      'GET',
      `/users/${this.userId}/payments/money`
    );
  }

  async getCollection(collectionId) {
    return this.request('GET', `/collections/${collectionId}`);
  }

  // ==================== MÉTODOS DE MÉTRICAS ====================

  async getReputationMetrics() {
    const user = await this.getUser();
    return {
      reputation_level: user.seller_reputation?.level_id,
      power_seller_status: user.seller_reputation?.power_seller_status,
      transactions: user.seller_reputation?.transactions,
      rating: user.seller_reputation?.transactions?.ratings
    };
  }

  async getSalesDistribution() {
    return this.request(
      'GET',
      `/seller/${this.userId}/sales_distribution`
    );
  }

  async getItemVisits(itemId) {
    return this.request('GET', `/visits/items/${itemId}`);
  }

  // ==================== MÉTODOS DE BUSCA ====================

  async searchItems(query, limit = 50) {
    return this.request(
      'GET',
      `/sites/MLB/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }
}

// Exportar para uso global
window.MLAPIClient = MLAPIClient;
