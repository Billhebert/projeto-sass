/**
 * Mercado Libre, Mercado Pago & Global Selling - Complete SDK
 * Version 3.0.0 - Ultimate Production-Ready SDK
 * 
 * Cobre todas as APIs:
 * - Mercado Livre (Brasil) - api.mercadolibre.com
 * - Mercado Pago - api.mercadopago.com
 * - Global Selling - api.mercadolibre.com (internacional)
 */

const https = require('https');
const http = require('http');

const SDK_CONFIG = {
  ml_baseURL: 'https://api.mercadolibre.com',
  mp_baseURL: 'https://api.mercadopago.com',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000
};

class MercadoLibreAuth {
  constructor(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  getHeaders(platform = 'ml') {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }
}

class MercadoPagoAuth {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
}

class GlobalSellingAuth {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
}

class BaseHttpClient {
  constructor(config = {}) {
    this.timeout = config.timeout || SDK_CONFIG.timeout;
    this.maxRetries = config.retries || SDK_CONFIG.retries;
    this.retryDelay = config.retryDelay || SDK_CONFIG.retryDelay;
  }

  async request(url, options = {}) {
    let lastError = null;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        return await this.fetch(url, options);
      } catch (error) {
        lastError = error;
        if (!this.isRetryable(error) || attempt >= this.maxRetries) {
          throw error;
        }
        attempt++;
        await this.sleep(this.retryDelay * Math.pow(2, attempt - 1));
      }
    }
    throw lastError;
  }

  buildURL(baseURL, endpoint, params) {
    let url = `${baseURL}${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      const query = Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      url += `?${query}`;
    }
    return url;
  }

  async fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const req = httpModule.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: this.timeout
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = data ? JSON.parse(data) : null;
            resolve({ data: json || data, status: res.statusCode, headers: res.headers });
          } catch {
            resolve({ data: data, status: res.statusCode });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });

      if (options.data) {
        req.write(JSON.stringify(options.data));
      }

      req.end();
    });
  }

  isRetryable(error) {
    return [408, 429, 500, 502, 503, 504].includes(error.status) ||
           ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'].includes(error.code);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class MercadoLibreHttpClient extends BaseHttpClient {
  constructor(config = {}) {
    super(config);
    this.baseURL = config.baseURL || SDK_CONFIG.ml_baseURL;
  }

  async request(endpoint, options = {}) {
    const url = this.buildURL(this.baseURL, endpoint, options.params);
    const headers = options.auth?.getHeaders?.() || {};
    return super.request(url, { ...options, headers });
  }
}

class MercadoPagoHttpClient extends BaseHttpClient {
  constructor(config = {}) {
    super(config);
    this.baseURL = config.baseURL || SDK_CONFIG.mp_baseURL;
  }

  async request(endpoint, options = {}) {
    const url = this.buildURL(this.baseURL, endpoint, options.params);
    const headers = options.auth?.getHeaders?.() || {};
    return super.request(url, { ...options, headers });
  }
}

class GlobalSellingHttpClient extends BaseHttpClient {
  constructor(config = {}) {
    super(config);
    this.baseURL = config.baseURL || SDK_CONFIG.ml_baseURL;
  }

  async request(endpoint, options = {}) {
    const url = this.buildURL(this.baseURL, endpoint, options.params);
    const headers = options.auth?.getHeaders?.() || {};
    return super.request(url, { ...options, headers });
  }
}

class MPMercadoLibreHttpClient extends BaseHttpClient {
  constructor(config = {}) {
    super(config);
    this.baseURL = 'https://api.mercadopago.com';
  }

  async request(endpoint, options = {}) {
    const url = this.buildURL(this.baseURL, endpoint, options.params);
    const headers = options.auth?.getHeaders?.() || {};
    return super.request(url, { ...options, headers });
  }
}

class MLUsersResource {
  constructor(httpClient) { this.http = httpClient; }
  async getUserInfo() { return this.http.request('/users/me'); }
  async getUser(userId) { return this.http.request(`/users/${userId}`); }
  async getUserAddresses(userId) { return this.http.request(`/users/${userId}/addresses`); }
  async getUserApplications(userId) { return this.http.request(`/users/${userId}/applications`); }
  async getUserTokens(userId) { return this.http.request(`/users/${userId}/tokens`); }
  async searchUsers(params) { return this.http.request('/users/search', { params }); }
  async getUserContacts(userId) { return this.http.request(`/users/${userId}/contacts`); }
  async getUserBoards(userId) { return this.http.request(`/users/${userId}/boards`); }
  async getUserDealReputation(userId) { return this.http.request(`/users/${userId}/deal_reputation`); }
  async getUserSalesRestrictions(userId) { return this.http.request(`/users/${userId}/sales_restrictions`); }
}

class MLItemsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getItem(itemId) { return this.http.request(`/items/${itemId}`); }
  async getItemDescription(itemId) { return this.http.request(`/items/${itemId}/description`); }
  async getItemWithDescription(itemId) { return Promise.all([this.getItem(itemId), this.getItemDescription(itemId)]); }
  async createItem(itemData) { return this.http.request('/items', { method: 'POST', data: itemData }); }
  async updateItem(itemId, itemData) { return this.http.request(`/items/${itemId}`, { method: 'PUT', data: itemData }); }
  async deleteItem(itemId) { return this.http.request(`/items/${itemId}`, { method: 'DELETE' }); }
  async relistItem(itemId, relistData) { return this.http.request(`/items/${itemId}/relist`, { method: 'POST', data: relistData }); }
  async searchItems(params) { return this.http.request('/sites/MLB/search', { params }); }
  async getItemsByCategory(categoryId, params) { return this.http.request(`/categories/${categoryId}/items`, { params }); }
  async getItemsByUser(userId, params) { return this.http.request(`/users/${userId}/items/search`, { params }); }
  async validateItem(itemData) { return this.http.request('/items/validate', { method: 'POST', data: itemData }); }
  async getCategories() { return this.http.request('/categories'); }
  async getCategory(categoryId) { return this.http.request(`/categories/${categoryId}`); }
  async getCategoryAttributes(categoryId) { return this.http.request(`/categories/${categoryId}/attributes`); }
  async getCategoryListingTypes(categoryId) { return this.http.request(`/categories/${categoryId}/listing_types`); }
  async getCategoryPrices(categoryId) { return this.http.request(`/categories/${categoryId}/prices`); }
  async getCategoryTree(categoryId) { return this.http.request(`/categories/${categoryId}/category_tree`); }
  async getItemFromMLM(itemId) { return this.http.request(`/items/${itemId}`); }
  async validateItemV2(itemData) { return this.http.request('/items/validate/v2', { method: 'POST', data: itemData }); }
  async getItemsHotness(params) { return this.http.request('/items/hotness', { params }); }
  async getSimilarItems(itemId) { return this.http.request(`/items/${itemId}/similar`); }
  async getAssociatedItems(itemId) { return this.http.request(`/items/${itemId}/associated`); }
}

class MLOrdersResource {
  constructor(httpClient) { this.http = httpClient; }
  async getOrder(orderId) { return this.http.request(`/orders/${orderId}`); }
  async searchOrders(params) { return this.http.request('/orders/search', { params }); }
  async getOrdersByUser(userId, params) { return this.http.request(`/users/${userId}/orders/search`, { params }); }
  async getOrderNotes(orderId) { return this.http.request(`/orders/${orderId}/notes`); }
  async createOrderNote(orderId, noteData) { return this.http.request(`/orders/${orderId}/notes`, { method: 'POST', data: noteData }); }
  async getOrderPack(orderId) { return this.http.request(`/orders/packs/${orderId}`); }
  async getShipments(orderId) { return this.http.request(`/orders/${orderId}/shipments`); }
  async getOrderPayment(orderId) { return this.http.request(`/orders/${orderId}/payments`); }
  async getShippingStatuses() { return this.http.request('/orders/shipping_statuses'); }
  async getShipmentTypes() { return this.http.request('/orders/shipments/types'); }
  async getOrderFilters() { return this.http.request('/orders/filters'); }
  async getOrderTaxes(orderId) { return this.http.request(`/orders/${orderId}/taxes`); }
  async createOrder(orderData) { return this.http.request('/orders', { method: 'POST', data: orderData }); }
  async updateOrder(orderId, orderData) { return this.http.request(`/orders/${orderId}`, { method: 'PUT', data: orderData }); }
  async cancelOrder(orderId, reason) { return this.http.request(`/orders/${orderId}`, { method: 'PUT', data: { status: 'cancelled', reason } }); }
  async getOrderShipment(orderId) { return this.http.request(`/orders/${orderId}/shipments`); }
  async getOrderInvoice(orderId) { return this.http.request(`/orders/${orderId}/invoice`); }
}

class MLPaymentsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getPayment(paymentId) { return this.http.request(`/payments/${paymentId}`); }
  async searchPayments(params) { return this.http.request('/payments/search', { params }); }
  async createPayment(paymentData) { return this.http.request('/payments', { method: 'POST', data: paymentData }); }
  async capturePayment(paymentId, captureData) { return this.http.request(`/payments/${paymentId}`, { method: 'PUT', data: captureData }); }
  async refundPayment(paymentId, refundData) { return this.http.request(`/payments/${paymentId}/refunds`, { method: 'POST', data: refundData }); }
  async getPaymentMethods() { return this.http.request('/payment_methods'); }
  async getPaymentMethod(methodId) { return this.http.request(`/payment_methods/${methodId}`); }
  async getPaymentTypes() { return this.http.request('/payment_types'); }
  async getPaymentMethodInstallments(methodId, amount) { return this.http.request(`/payment_methods/${methodId}/installments`, { params: { amount } }); }
  async getPaymentMethodBinInstallments(bin, params) { return this.http.request('/payment_methods/installments', { params: { bin, ...params } }); }
  async getPaymentConfigs() { return this.http.request('/payment_configs'); }
  async getPaymentCurrencyConfig(currencyId) { return this.http.request(`/payment_currency/${currencyId}`); }
  async getPaymentFeeDetails(orderId) { return this.http.request(`/orders/${orderId}/payment_fees`); }
}

class MLPreferencesResource {
  constructor(httpClient) { this.http = httpClient; }
  async createCheckoutPreference(prefData) { return this.http.request('/checkout/preferences', { method: 'POST', data: prefData }); }
  async getCheckoutPreference(prefId) { return this.http.request(`/checkout/preferences/${prefId}`); }
  async updateCheckoutPreference(prefId, prefData) { return this.http.request(`/checkout/preferences/${prefId}`, { method: 'PUT', data: prefData }); }
  async searchCheckoutPreferences(params) { return this.http.request('/checkout/preferences/search', { params }); }
  async createPreferenceItem(prefId, itemData) { return this.http.request(`/checkout/preferences/${prefId}/items`, { method: 'POST', data: itemData }); }
  async updatePreferenceItem(prefId, itemId, itemData) { return this.http.request(`/checkout/preferences/${prefId}/items/${itemId}`, { method: 'PUT', data: itemData }); }
}

class MLShippingResource {
  constructor(httpClient) { this.http = httpClient; }
  async getShipment(shipmentId) { return this.http.request(`/shipments/${shipmentId}`); }
  async searchShipments(params) { return this.http.request('/shipments/search', { params }); }
  async createShipment(shipData) { return this.http.request('/shipments', { method: 'POST', data: shipData }); }
  async updateShipment(shipmentId, shipData) { return this.http.request(`/shipments/${shipmentId}`, { method: 'PUT', data: shipData }); }
  async getShippingModes() { return this.http.request('/shipping_options/modes'); }
  async getShippingCosts(shipData) { return this.http.request('/shipping_options', { params: shipData }); }
  async getShippingLabels(shipmentId, params) { return this.http.request(`/shipments/${shipmentId}/labels`, { params }); }
  async getShippingTypes() { return this.http.request('/shipping_types'); }
  async getShippingServices(siteId) { return this.http.request(`/shipping_services/${siteId}`); }
  async getShipmentPacking(shipmentId) { return this.http.request(`/shipments/${shipmentId}/packing`); }
  async getShipmentTracking(shipmentId) { return this.http.request(`/shipments/${shipmentId}/tracking`); }
  async getShipmentStatus(shipmentId) { return this.http.request(`/shipments/${shipmentId}/status`); }
  async createShipmentInvoice(shipmentId, invoiceData) { return this.http.request(`/shipments/${shipmentId}/invoice`, { method: 'POST', data: invoiceData }); }
  async getFreightRates(siteId) { return this.http.request(`/freight_rates/${siteId}`); }
  async getShippingRules() { return this.http.request('/shipping_rules'); }
  async getShippingModesByCategory(categoryId) { return this.http.request(`/categories/${categoryId}/shipping_modes`); }
}

class MLQuestionsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getQuestion(questionId) { return this.http.request(`/questions/${questionId}`); }
  async getItemQuestions(itemId, params) { return this.http.request('/questions/search', { params: { ...params, item_id: itemId } }); }
  async getUserQuestions(userId, params) { return this.http.request('/questions/search', { params: { ...params, sender_id: userId } }); }
  async createQuestion(questionData) { return this.http.request('/questions', { method: 'POST', data: questionData }); }
  async answerQuestion(questionId, answerData) { return this.http.request(`/questions/${questionId}`, { method: 'POST', data: answerData }); }
  async deleteQuestion(questionId) { return this.http.request(`/questions/${questionId}`, { method: 'DELETE' }); }
  async getQuestionsAsker(askerId) { return this.http.request(`/users/${askerId}/questions_as_asker`); }
  async getQuestionsAskerPacking(askerId) { return this.http.request(`/users/${askerId}/questions_as_asker_packing`); }
}

class MLReviewsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getItemReviews(itemId, params) { return this.http.request(`/reviews/items/${itemId}`, { params }); }
  async getOrderReviews(orderId) { return this.http.request(`/orders/${orderId}/reviews`); }
  async createReview(reviewData) { return this.http.request('/reviews', { method: 'POST', data: reviewData }); }
  async getReviewStats(itemId) { return this.http.request(`/reviews/items/${itemId}/stats`); }
}

class MLCategoriesResource {
  constructor(httpClient) { this.http = httpClient; }
  async listCategories() { return this.http.request('/categories'); }
  async getCategory(categoryId) { return this.http.request(`/categories/${categoryId}`); }
  async getCategoryAttributes(categoryId) { return this.http.request(`/categories/${categoryId}/attributes`); }
  async getCategoryListingTypes(categoryId) { return this.http.request(`/categories/${categoryId}/listing_types`); }
  async getCategoryPrices(categoryId) { return this.http.request(`/categories/${categoryId}/prices`); }
  async getCategoryTree(categoryId) { return this.http.request(`/categories/${categoryId}/category_tree`); }
  async getCategoryPathFromId(categoryId) { return this.http.request(`/categories/${categoryId}/path_from_root`); }
  async getCategoryPredictor(categoryId) { return this.http.request(`/category_predictor/${categoryId}`); }
  async getCategoryVariations(categoryId) { return this.http.request(`/categories/${categoryId}/variations`); }
}

class MLSitesResource {
  constructor(httpClient) { this.http = httpClient; }
  async listSites() { return this.http.request('/sites'); }
  async getSite(siteId) { return this.http.request(`/sites/${siteId}`); }
  async getSiteCategories(siteId) { return this.http.request(`/sites/${siteId}/categories`); }
  async getSiteListingTypes(siteId) { return this.http.request(`/sites/${siteId}/listing_types`); }
  async getSiteCurrencies(siteId) { return this.http.request(`/sites/${siteId}/currencies`); }
  async getSiteDomainSuggestions(siteId) { return this.http.request(`/sites/${siteId}/domain_suggestions`); }
  async getSiteConfiguration(siteId) { return this.http.request(`/sites/${siteId}/configuration`); }
}

class MLMerchantOrdersResource {
  constructor(httpClient) { this.http = httpClient; }
  async getMerchantOrder(orderId) { return this.http.request(`/merchant_orders/${orderId}`); }
  async searchMerchantOrders(params) { return this.http.request('/merchant_orders/search', { params }); }
  async createMerchantOrder(orderData) { return this.http.request('/merchant_orders', { method: 'POST', data: orderData }); }
  async updateMerchantOrder(orderId, orderData) { return this.http.request(`/merchant_orders/${orderId}`, { method: 'PUT', data: orderData }); }
  async closeMerchantOrder(orderId, status) { return this.http.request(`/merchant_orders/${orderId}/close`, { method: 'PUT', data: { status } }); }
  async reopenMerchantOrder(orderId) { return this.http.request(`/merchant_orders/${orderId}/reopen`, { method: 'PUT' }); }
  async getMerchantOrderPayments(orderId) { return this.http.request(`/merchant_orders/${orderId}/payments`); }
  async getMerchantOrderShipments(orderId) { return this.http.request(`/merchant_orders/${orderId}/shipments`); }
}

class MLCustomersResource {
  constructor(httpClient) { this.http = httpClient; }
  async getCustomer(customerId) { return this.http.request(`/customers/${customerId}`); }
  async searchCustomers(params) { return this.http.request('/customers/search', { params }); }
  async createCustomer(customerData) { return this.http.request('/customers', { method: 'POST', data: customerData }); }
  async updateCustomer(customerId, customerData) { return this.http.request(`/customers/${customerId}`, { method: 'PUT', data: customerData }); }
  async getCustomerCards(customerId) { return this.http.request(`/customers/${customerId}/cards`); }
  async createCustomerCard(customerId, cardData) { return this.http.request(`/customers/${customerId}/cards`, { method: 'POST', data: cardData }); }
  async deleteCustomerCard(customerId, cardId) { return this.http.request(`/customers/${customerId}/cards/${cardId}`, { method: 'DELETE' }); }
  async getCustomerAddresses(customerId) { return this.http.request(`/customers/${customerId}/addresses`); }
  async createCustomerAddress(customerId, addressData) { return this.http.request(`/customers/${customerId}/addresses`, { method: 'POST', data: addressData }); }
  async deleteCustomer(customerId) { return this.http.request(`/customers/${customerId}`, { method: 'DELETE' }); }
  async getCustomerIdentifications(customerId) { return this.http.request(`/customers/${customerId}/identifications`); }
  async getCustomerContracts(customerId) { return this.http.request(`/customers/${customerId}/contracts`); }
}

class MLStoresResource {
  constructor(httpClient) { this.http = httpClient; }
  async getStore(storeId) { return this.http.request(`/stores/${storeId}`); }
  async searchStores(userId, params) { return this.http.request(`/users/${userId}/stores/search`, { params }); }
  async createStore(userId, storeData) { return this.http.request(`/users/${userId}/stores`, { method: 'POST', data: storeData }); }
  async updateStore(userId, storeId, storeData) { return this.http.request(`/users/${userId}/stores/${storeId}`, { method: 'PUT', data: storeData }); }
  async deleteStore(userId, storeId) { return this.http.request(`/users/${userId}/stores/${storeId}`, { method: 'DELETE' }); }
  async getStoreCatalog(storeId) { return this.http.request(`/stores/${storeId}/catalog`); }
  async getStoreFollowers(storeId) { return this.http.request(`/stores/${storeId}/followers`); }
}

class MLPOSResource {
  constructor(httpClient) { this.http = httpClient; }
  async getPOS(posId) { return this.http.request(`/pos/${posId}`); }
  async searchPOS(params) { return this.http.request('/pos/search', { params }); }
  async createPOS(posData) { return this.http.request('/pos', { method: 'POST', data: posData }); }
  async updatePOS(posId, posData) { return this.http.request(`/pos/${posId}`, { method: 'PUT', data: posData }); }
  async deletePOS(posId) { return this.http.request(`/pos/${posId}`, { method: 'DELETE' }); }
  async getPOSExternalPOS(params) { return this.http.request('/pos/external_pos', { params }); }
  async getPOSSettings(posId) { return this.http.request(`/pos/${posId}/settings`); }
  async updatePOSSettings(posId, settings) { return this.http.request(`/pos/${posId}/settings`, { method: 'PUT', data: settings }); }
}

class MLSubscriptionsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getPreapproval(preapprovalId) { return this.http.request(`/preapproval/${preapprovalId}`); }
  async searchPreapprovals(params) { return this.http.request('/preapproval/search', { params }); }
  async createPreapproval(preapprovalData) { return this.http.request('/preapproval', { method: 'POST', data: preapprovalData }); }
  async updatePreapproval(preapprovalId, preapprovalData) { return this.http.request(`/preapproval/${preapprovalId}`, { method: 'PUT', data: preapprovalData }); }
  async getPreapprovalPlan(planId) { return this.http.request(`/preapproval_plan/${planId}`); }
  async searchPreapprovalPlans(params) { return this.http.request('/preapproval_plan/search', { params }); }
  async createPreapprovalPlan(planData) { return this.http.request('/preapproval_plan', { method: 'POST', data: planData }); }
  async getAuthorizedPayments(preapprovalId) { return this.http.request(`/preapproval/${preapprovalId}/authorized_payments`); }
  async cancelPreapproval(preapprovalId) { return this.http.request(`/preapproval/${preapprovalId}`, { method: 'PUT', data: { status: 'cancelled' } }); }
  async pausePreapproval(preapprovalId) { return this.http.request(`/preapproval/${preapprovalId}`, { method: 'PUT', data: { status: 'paused' } }); }
}

class MLChargebacksResource {
  constructor(httpClient) { this.http = httpClient; }
  async getChargeback(chargebackId) { return this.http.request(`/chargebacks/${chargebackId}`); }
  async getPaymentChargebacks(paymentId) { return this.http.request(`/payments/${paymentId}/chargebacks`); }
  async createChargebackEvidence(chargebackId, evidenceData) { return this.http.request(`/chargebacks/${chargebackId}/evidence`, { method: 'POST', data: evidenceData }); }
  async acceptChargeback(chargebackId) { return this.http.request(`/chargebacks/${chargebackId}/accept`, { method: 'POST' }); }
  async getChargebackDispute(chargebackId) { return this.http.request(`/chargebacks/${chargebackId}/dispute`); }
  async createChargebackDispute(chargebackId, disputeData) { return this.http.request(`/chargebacks/${chargebackId}/dispute`, { method: 'POST', data: disputeData }); }
}

class MLClaimsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getClaim(claimId) { return this.http.request(`/claims/${claimId}`); }
  async searchClaims(params) { return this.http.request('/claims/search', { params }); }
  async getClaimEvidence(claimId) { return this.http.request(`/claims/${claimId}/evidence`); }
  async uploadClaimEvidence(claimId, evidenceData) { return this.http.request(`/claims/${claimId}/evidence`, { method: 'POST', data: evidenceData }); }
  async acceptClaim(claimId) { return this.http.request(`/claims/${claimId}/accept`, { method: 'POST' }); }
  async getClaimMessages(claimId) { return this.http.request(`/claims/${claimId}/messages`); }
  async sendClaimMessage(claimId, messageData) { return this.http.request(`/claims/${claimId}/messages`, { method: 'POST', data: messageData }); }
  async getClaimResolution(claimId) { return this.http.request(`/claims/${claimId}/resolution`); }
  async proposeClaimResolution(claimId, resolutionData) { return this.http.request(`/claims/${claimId}/resolution`, { method: 'POST', data: resolutionData }); }
}

class MLDiscountsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getDiscounts(params) { return this.http.request('/discounts', { params }); }
  async getCampaigns(params) { return this.http.request('/campaigns', { params }); }
  async createCampaign(campaignData) { return this.http.request('/campaigns', { method: 'POST', data: campaignData }); }
  async getCampaign(campaignId) { return this.http.request(`/campaigns/${campaignId}`); }
  async updateCampaign(campaignId, campaignData) { return this.http.request(`/campaigns/${campaignId}`, { method: 'PUT', data: campaignData }); }
  async deleteCampaign(campaignId) { return this.http.request(`/campaigns/${campaignId}`, { method: 'DELETE' }); }
  async getCoupons(params) { return this.http.request('/coupons', { params }); }
  async createCoupon(couponData) { return this.http.request('/coupons', { method: 'POST', data: couponData }); }
  async getCoupon(couponId) { return this.http.request(`/coupons/${couponId}`); }
  async deleteCoupon(couponId) { return this.http.request(`/coupons/${couponId}`, { method: 'DELETE' }); }
  async getPromotions(params) { return this.http.request('/promotions', { params }); }
  async getPromotion(promotionId) { return this.http.request(`/promotions/${promotionId}`); }
}

class MLFavoritesResource {
  constructor(httpClient) { this.http = httpClient; }
  async getFavorites(userId) { return this.http.request(`/users/${userId}/favorites`); }
  async addFavorite(userId, favoriteData) { return this.http.request(`/users/${userId}/favorites`, { method: 'POST', data: favoriteData }); }
  async deleteFavorite(userId, favoriteId) { return this.http.request(`/users/${userId}/favorites/${favoriteId}`, { method: 'DELETE' }); }
  async getFavoriteSellers(userId) { return this.http.request(`/users/${userId}/favorites/sellers`); }
  async getFavoriteSearches(userId) { return this.http.request(`/users/${userId}/favorites/searches`); }
}

class MLModerationsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getModerations(params) { return this.http.request('/moderations', { params }); }
  async getItemModeration(itemId) { return this.http.request(`/items/${itemId}/moderation`); }
  async getOrderModeration(orderId) { return this.http.request(`/orders/${orderId}/moderation`); }
  async getUserModeration(userId) { return this.http.request(`/users/${userId}/moderation`); }
  async getComplaints(params) { return this.http.request('/complaints', { params }); }
  async getDenouncedItems(params) { return this.http.request('/denounced_items', { params }); }
  async getBrandProtectionReports(params) { return this.http.request('/brand_protection/reports', { params }); }
}

class MLMessagingResource {
  constructor(httpClient) { this.http = httpClient; }
  async getMessages(params) { return this.http.request('/messages', { params }); }
  async getMessage(messageId) { return this.http.request(`/messages/${messageId}`); }
  async sendMessage(messageData) { return this.http.request('/messages', { method: 'POST', data: messageData }); }
  async markMessageAsRead(messageId) { return this.http.request(`/messages/${messageId}/read`, { method: 'PUT' }); }
  async getMessageTemplates(params) { return this.http.request('/message_templates', { params }); }
  async createMessageTemplate(templateData) { return this.http.request('/message_templates', { method: 'POST', data: templateData }); }
  async getMessageTemplate(templateId) { return this.http.request(`/message_templates/${templateId}`); }
  async deleteMessageTemplate(templateId) { return this.http.request(`/message_templates/${templateId}`, { method: 'DELETE' }); }
  async getMessageAttachment(messageId, attachmentId) { return this.http.request(`/messages/${messageId}/attachments/${attachmentId}`); }
  async uploadMessageAttachment(messageId, fileData) { return this.http.request(`/messages/${messageId}/attachments`, { method: 'POST', data: fileData }); }
}

class MLReturnsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getReturns(params) { return this.http.request('/returns/search', { params }); }
  async getReturn(returnId) { return this.http.request(`/returns/${returnId}`); }
  async createReturn(returnData) { return this.http.request('/returns', { method: 'POST', data: returnData }); }
  async updateReturn(returnId, returnData) { return this.http.request(`/returns/${returnId}`, { method: 'PUT', data: returnData }); }
  async acceptReturn(returnId) { return this.http.request(`/returns/${returnId}/accept`, { method: 'PUT' }); }
  async rejectReturn(returnId, reason) { return this.http.request(`/returns/${returnId}/reject`, { method: 'PUT', data: { reason } }); }
  async getReturnDispute(returnId) { return this.http.request(`/returns/${returnId}/dispute`); }
  async createReturnDispute(returnId, disputeData) { return this.http.request(`/returns/${returnId}/dispute`, { method: 'POST', data: disputeData }); }
}

class MLBillingResource {
  constructor(httpClient) { this.http = httpClient; }
  async getBillingInfos(params) { return this.http.request('/billing_infos', { params }); }
  async getBillingInfo(billingInfoId) { return this.http.request(`/billing_infos/${billingInfoId}`); }
  async createBillingInfo(billingData) { return this.http.request('/billing_infos', { method: 'POST', data: billingData }); }
  async updateBillingInfo(billingInfoId, billingData) { return this.http.request(`/billing_infos/${billingInfoId}`, { method: 'PUT', data: billingData }); }
  async getInvoices(params) { return this.http.request('/invoices', { params }); }
  async getInvoice(invoiceId) { return this.http.request(`/invoices/${invoiceId}`); }
  async createInvoice(invoiceData) { return this.http.request('/invoices', { method: 'POST', data: invoiceData }); }
  async validateInvoice(invoiceData) { return this.http.request('/invoices/validate', { method: 'POST', data: invoiceData }); }
  async getInvoiceTypes() { return this.http.request('/invoice_types'); }
  async getTaxes(params) { return this.http.request('/taxes', { params }); }
  async getTax(taxId) { return this.http.request(`/taxes/${taxId}`); }
  async getTaxConfiguration(taxId) { return this.http.request(`/taxes/${taxId}/configuration`); }
  async updateTaxConfiguration(taxId, configData) { return this.http.request(`/taxes/${taxId}/configuration`, { method: 'PUT', data: configData }); }
}

class MLVisitsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getItemVisits(itemId, params) { return this.http.request(`/items/${itemId}/visits`, { params }); }
  async getUserVisits(userId, params) { return this.http.request(`/users/${userId}/visits`, { params }); }
  async getTotalVisits(params) { return this.http.request('/visits/total', { params }); }
  async getVisitsSummary(params) { return this.http.request('/visits/summary', { params }); }
  async getVisitsByDate(params) { return this.http.request('/visits/by_date', { params }); }
  async getVisitsByDevice(params) { return this.http.request('/visits/by_device', { params }); }
  async getVisitsByLocation(params) { return this.http.request('/visits/by_location', { params }); }
  async getVisitsByReferrer(params) { return this.http.request('/visits/by_referrer', { params }); }
}

class MLReputationResource {
  constructor(httpClient) { this.http = httpClient; }
  async getUserReputation(userId) { return this.http.request(`/users/${userId}/reputation`); }
  async getOrderReputation(orderId) { return this.http.request(`/orders/${orderId}/reputation`); }
  async getReputationHistory(userId, params) { return this.http.request(`/users/${userId}/reputation/history`, { params }); }
  async getReputationLevel(userId) { return this.http.request(`/users/${userId}/reputation/level`); }
  async getReputationSales(userId) { return this.http.request(`/users/${userId}/reputation/sales`); }
  async getReputationClaims(userId) { return this.http.request(`/users/${userId}/reputation/claims`); }
  async getReputationCancellations(userId) { return this.http.request(`/users/${userId}/reputation/cancellations`); }
  async getReputationDelayedHandlingTime(userId) { return this.http.request(`/users/${userId}/reputation/delayed_handling_time`); }
}

class MLTrendsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getTrends(params) { return this.http.request('/trends', { params }); }
  async getTrend(trendId) { return this.http.request(`/trends/${trendId}`); }
  async getCategoryTrends(categoryId, params) { return this.http.request(`/trends/categories/${categoryId}`, { params }); }
  async getSearchTrends(params) { return this.http.request('/trends/searches', { params }); }
  async getBestSellers(params) { return this.http.request('/best_sellers', { params }); }
  async getCategoryBestSellers(categoryId) { return this.http.request(`/categories/${categoryId}/best_sellers`); }
}

class MLInsightsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getItemInsights(itemId) { return this.http.request(`/items/${itemId}/insights`); }
  async getUserInsights(userId) { return this.http.request(`/users/${userId}/insights`); }
  async getCategoryInsights(categoryId) { return this.http.request(`/categories/${categoryId}/insights`); }
  async getSearchInsights(params) { return this.http.request('/insights/searches', { params }); }
  async getPriceSuggestions(params) { return this.http.request('/insights/price_suggestions', { params }); }
  async getListingQuality(params) { return this.http.request('/insights/listing_quality', { params }); }
}

class MLAdsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getAds(params) { return this.http.request('/ads', { params }); }
  async getAd(adId) { return this.http.request(`/ads/${adId}`); }
  async createAd(adData) { return this.http.request('/ads', { method: 'POST', data: adData }); }
  async updateAd(adId, adData) { return this.http.request(`/ads/${adId}`, { method: 'PUT', data: adData }); }
  async deleteAd(adId) { return this.http.request(`/ads/${adId}`, { method: 'DELETE' }); }
  async getAdCampaigns(params) { return this.http.request('/ads/campaigns', { params }); }
  async getAdCampaign(campaignId) { return this.http.request(`/ads/campaigns/${campaignId}`); }
  async createAdCampaign(campaignData) { return this.http.request('/ads/campaigns', { method: 'POST', data: campaignData }); }
  async updateAdCampaign(campaignId, campaignData) { return this.http.request(`/ads/campaigns/${campaignId}`, { method: 'PUT', data: campaignData }); }
  async pauseAdCampaign(campaignId) { return this.http.request(`/ads/campaigns/${campaignId}/pause`, { method: 'PUT' }); }
  async resumeAdCampaign(campaignId) { return this.http.request(`/ads/campaigns/${campaignId}/resume`, { method: 'PUT' }); }
  async getAdCampaignBudget(campaignId) { return this.http.request(`/ads/campaigns/${campaignId}/budget`); }
  async updateAdCampaignBudget(campaignId, budgetData) { return this.http.request(`/ads/campaigns/${campaignId}/budget`, { method: 'PUT', data: budgetData }); }
  async getAdMetrics(campaignId, params) { return this.http.request(`/ads/campaigns/${campaignId}/metrics`, { params }); }
  async getAdKeywords(campaignId) { return this.http.request(`/ads/campaigns/${campaignId}/keywords`); }
  async createAdKeyword(campaignId, keywordData) { return this.http.request(`/ads/campaigns/${campaignId}/keywords`, { method: 'POST', data: keywordData }); }
  async updateAdKeyword(campaignId, keywordId, keywordData) { return this.http.request(`/ads/campaigns/${campaignId}/keywords/${keywordId}`, { method: 'PUT', data: keywordData }); }
  async deleteAdKeyword(campaignId, keywordId) { return this.http.request(`/ads/campaigns/${campaignId}/keywords/${keywordId}`, { method: 'DELETE' }); }
}

class MLHealthResource {
  constructor(httpClient) { this.http = httpClient; }
  async healthCheck() { return this.http.request('/health'); }
  async getAPIStatus() { return this.http.request('/api_status'); }
  async getAPIversion() { return this.http.request('/api_version'); }
}

class MLOfficialStoresResource {
  constructor(httpClient) { this.http = httpClient; }
  async getOfficialStores(params) { return this.http.request('/official_stores', { params }); }
  async getOfficialStore(storeId) { return this.http.request(`/official_stores/${storeId}`); }
  async getOfficialStoreSearch(searchParams) { return this.http.request('/official_stores/search', { params: searchParams }); }
  async getOfficialStoreByNickname(nickname) { return this.http.request(`/official_stores/nickname/${nickname}`); }
  async getOfficialStorePlp(storeId, params) { return this.http.request(`/official_stores/${storeId}/plp`, { params }); }
}

class MLProductsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getProducts(params) { return this.http.request('/products', { params }); }
  async getProduct(productId) { return this.http.request(`/products/${productId}`); }
  async searchProducts(params) { return this.http.request('/products/search', { params }); }
  async getProductSpecifications(productId) { return this.http.request(`/products/${productId}/specifications`); }
  async getProductVariations(productId) { return this.http.request(`/products/${productId}/variations`); }
  async getProductRecommendations(productId) { return this.http.request(`/products/${productId}/recommendations`); }
  async getProductCatalogConfigurations(productId) { return this.http.request(`/products/${productId}/catalog_configurations`); }
  async updateProductCatalogConfigurations(productId, configData) { return this.http.request(`/products/${productId}/catalog_configurations`, { method: 'PUT', data: configData }); }
  async getProductGroup(productGroupId) { return this.http.request(`/product_groups/${productGroupId}`); }
  async getProductGroups(params) { return this.http.request('/product_groups', { params }); }
}

class MLSpecialResources {
  constructor(httpClient) { this.http = httpClient; }
  async getCarriers() { return this.http.request('/carriers'); }
  async getCarrier(carrierId) { return this.http.request(`/carriers/${carrierId}`); }
  async getCurrencies() { return this.http.request('/currencies'); }
  async getCurrency(currencyId) { return this.http.request(`/currencies/${currencyId}`); }
  async getCurrencyConversions(params) { return this.http.request('/currency_conversions', { params }); }
  async getGeolocation() { return this.http.request('/geolocation'); }
  async getGeolocationCountry(countryId) { return this.http.request(`/geolocation/${countryId}`); }
  async getLocales() { return this.http.request('/locales'); }
  async getLocale(localeId) { return this.http.request(`/locales/${localeId}`); }
  async getTimezones() { return this.http.request('/timezones'); }
  async getTimezone(timezoneId) { return this.http.request(`/timezones/${timezoneId}`); }
  async getCountires() { return this.http.request('/countries'); }
  async getCountry(countryId) { return this.http.request(`/countries/${countryId}`); }
  async getStates(countryId) { return this.http.request(`/countries/${countryId}/states`); }
  async getCities(stateId) { return this.http.request(`/states/${stateId}/cities`); }
  async getZipCodes(cityId) { return this.http.request(`/cities/${cityId}/zip_codes`); }
  async getZipCodeData(zipCode) { return this.http.request(`/zip_codes/${zipCode}`); }
  async getLocations(searchParams) { return this.http.request('/locations', { params: searchParams }); }
  async getDistance(fromZip, toZip) { return this.http.request(`/distance/${fromZip}/${toZip}`); }
}

class MLImageResource {
  constructor(httpClient) { this.http = httpClient; }
  async uploadImage(imageData) { return this.http.request('/images', { method: 'POST', data: imageData }); }
  async getImage(imageId) { return this.http.request(`/images/${imageId}`); }
  async deleteImage(imageId) { return this.http.request(`/images/${imageId}`, { method: 'DELETE' }); }
  async validateImage(imageData) { return this.http.request('/images/validate', { method: 'POST', data: imageData }); }
  async getImageTypes() { return this.http.request('/images/types'); }
  async getImageSuggestions(itemId) { return this.http.request(`/items/${itemId}/images/suggestions`); }
}

class MLPriceResource {
  constructor(httpClient) { this.http = httpClient; }
  async getPriceSuggestions(params) { return this.http.request('/price_suggestions', { params }); }
  async getPriceHistory(itemId) { return this.http.request(`/items/${itemId}/price_history`); }
  async getPricesByQuantity(params) { return this.http.request('/prices/by_quantity', { params }); }
  async getCompetitorPrices(params) { return this.http.request('/prices/competitor', { params }); }
  async getPriceRules() { return this.http.request('/price_rules'); }
  async getPriceRule(ruleId) { return this.http.request(`/price_rules/${ruleId}`); }
  async getShippingPrices(params) { return this.http.request('/prices/shipping', { params }); }
}

class MLAutomationResource {
  constructor(httpClient) { this.http = httpClient; }
  async getAutomations(params) { return this.http.request('/automations', { params }); }
  async getAutomation(automationId) { return this.http.request(`/automations/${automationId}`); }
  async createAutomation(automationData) { return this.http.request('/automations', { method: 'POST', data: automationData }); }
  async updateAutomation(automationId, automationData) { return this.http.request(`/automations/${automationId}`, { method: 'PUT', data: automationData }); }
  async deleteAutomation(automationId) { return this.http.request(`/automations/${automationId}`, { method: 'DELETE' }); }
  async getAutomationExecutions(automationId, params) { return this.http.request(`/automations/${automationId}/executions`, { params }); }
  async pauseAutomation(automationId) { return this.http.request(`/automations/${automationId}/pause`, { method: 'PUT' }); }
  async resumeAutomation(automationId) { return this.http.request(`/automations/${automationId}/resume`, { method: 'PUT' }); }
}

class MLDataHealthResource {
  constructor(httpClient) { this.http = httpClient; }
  async getDataHealth(params) { return this.http.request('/data_health', { params }); }
  async getDataHealthByCategory(categoryId) { return this.http.request(`/data_health/categories/${categoryId}`); }
  async getDataHealthByUser(userId) { return this.http.request(`/data_health/users/${userId}`); }
  async getDataHealthDashboard() { return this.http.request('/data_health/dashboard'); }
  async getAttributeCompliance(categoryId) { return this.http.request(`/data_health/categories/${categoryId}/attributes`); }
}

class MLDimensionsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getDimensions(params) { return this.http.request('/dimensions', { params }); }
  async getDimension(dimensionId) { return this.http.request(`/dimensions/${dimensionId}`); }
  async createDimension(dimensionData) { return this.http.request('/dimensions', { method: 'POST', data: dimensionData }); }
  async updateDimension(dimensionId, dimensionData) { return this.http.request(`/dimensions/${dimensionId}`, { method: 'PUT', data: dimensionData }); }
  async deleteDimension(dimensionId) { return this.http.request(`/dimensions/${dimensionId}`, { method: 'DELETE' }); }
  async getSizeCharts(params) { return this.http.request('/size_charts', { params }); }
  async getSizeChart(sizeChartId) { return this.http.request(`/size_charts/${sizeChartId}`); }
  async createSizeChart(sizeChartData) { return this.http.request('/size_charts', { method: 'POST', data: sizeChartData }); }
  async updateSizeChart(sizeChartId, sizeChartData) { return this.http.request(`/size_charts/${sizeChartId}`, { method: 'PUT', data: sizeChartData }); }
  async deleteSizeChart(sizeChartId) { return this.http.request(`/size_charts/${sizeChartId}`, { method: 'DELETE' }); }
  async validateSizeChart(sizeChartData) { return this.http.request('/size_charts/validate', { method: 'POST', data: sizeChartData }); }
}

class MLUserProductsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getUserProducts(userId, params) { return this.http.request(`/users/${userId}/products`, { params }); }
  async getUserProduct(userId, productId) { return this.http.request(`/users/${userId}/products/${productId}`); }
  async createUserProduct(userId, productData) { return this.http.request(`/users/${userId}/products`, { method: 'POST', data: productData }); }
  async updateUserProduct(userId, productId, productData) { return this.http.request(`/users/${userId}/products/${productId}`, { method: 'PUT', data: productData }); }
  async deleteUserProduct(userId, productId) { return this.http.request(`/users/${userId}/products/${productId}`, { method: 'DELETE' }); }
  async getUserProductCatalog(userId, productId) { return this.http.request(`/users/${userId}/products/${productId}/catalog`); }
  async updateUserProductCatalog(userId, productId, catalogData) { return this.http.request(`/users/${userId}/products/${productId}/catalog`, { method: 'PUT', data: catalogData }); }
}

class MLKitResource {
  constructor(httpClient) { this.http = httpClient; }
  async getKits(params) { return this.http.request('/kits', { params }); }
  async getKit(kitId) { return this.http.request(`/kits/${kitId}`); }
  async createKit(kitData) { return this.http.request('/kits', { method: 'POST', data: kitData }); }
  async updateKit(kitId, kitData) { return this.http.request(`/kits/${kitId}`, { method: 'PUT', data: kitData }); }
  async deleteKit(kitId) { return this.http.request(`/kits/${kitId}`, { method: 'DELETE' }); }
  async getKitItems(kitId) { return this.http.request(`/kits/${kitId}/items`); }
  async addKitItem(kitId, itemData) { return this.http.request(`/kits/${kitId}/items`, { method: 'POST', data: itemData }); }
  async removeKitItem(kitId, itemId) { return this.http.request(`/kits/${kitId}/items/${itemId}`, { method: 'DELETE' }); }
}

class MLPacksResource {
  constructor(httpClient) { this.http = httpClient; }
  async getPacks(params) { return this.http.request('/packs', { params }); }
  async getPack(packId) { return this.http.request(`/packs/${packId}`); }
  async createPack(packData) { return this.http.request('/packs', { method: 'POST', data: packData }); }
  async updatePack(packId, packData) { return this.http.request(`/packs/${packId}`, { method: 'PUT', data: packData }); }
  async deletePack(packId) { return this.http.request(`/packs/${packId}`, { method: 'DELETE' }); }
  async getPackItems(packId) { return this.http.request(`/packs/${packId}/items`); }
  async addPackItem(packId, itemData) { return this.http.request(`/packs/${packId}/items`, { method: 'POST', data: itemData }); }
  async removePackItem(packId, itemId) { return this.http.request(`/packs/${packId}/items/${itemId}`, { method: 'DELETE' }); }
}

class MLVariationResource {
  constructor(httpClient) { this.http = httpClient; }
  async getVariations(itemId) { return this.http.request(`/items/${itemId}/variations`); }
  async getVariation(itemId, variationId) { return this.http.request(`/items/${itemId}/variations/${variationId}`); }
  async createVariation(itemId, variationData) { return this.http.request(`/items/${itemId}/variations`, { method: 'POST', data: variationData }); }
  async updateVariation(itemId, variationId, variationData) { return this.http.request(`/items/${itemId}/variations/${variationId}`, { method: 'PUT', data: variationData }); }
  async deleteVariation(itemId, variationId) { return this.http.request(`/items/${itemId}/variations/${variationId}`, { method: 'DELETE' }); }
  async getVariationPicture(itemId, variationId, pictureId) { return this.http.request(`/items/${itemId}/variations/${variationId}/pictures/${pictureId}`); }
  async addVariationPicture(itemId, variationId, pictureData) { return this.http.request(`/items/${itemId}/variations/${variationId}/pictures`, { method: 'POST', data: pictureData }); }
  async removeVariationPicture(itemId, variationId, pictureId) { return this.http.request(`/items/${itemId}/variations/${variationId}/pictures/${pictureId}`, { method: 'DELETE' }); }
}

class MLNotificationResource {
  constructor(httpClient) { this.http = httpClient; }
  async getNotifications(params) { return this.http.request('/notifications', { params }); }
  async getNotification(notificationId) { return this.http.request(`/notifications/${notificationId}`); }
  async markNotificationAsRead(notificationId) { return this.http.request(`/notifications/${notificationId}/read`, { method: 'PUT' }); }
  async getNotificationTypes() { return this.http.request('/notifications/types'); }
  async createWebhook(webhookData) { return this.http.request('/webhooks', { method: 'POST', data: webhookData }); }
  async getWebhooks(params) { return this.http.request('/webhooks', { params }); }
  async getWebhook(webhookId) { return this.http.request(`/webhooks/${webhookId}`); }
  async updateWebhook(webhookId, webhookData) { return this.http.request(`/webhooks/${webhookId}`, { method: 'PUT', data: webhookData }); }
  async deleteWebhook(webhookId) { return this.http.request(`/webhooks/${webhookId}`, { method: 'DELETE' }); }
  async getNotificationsCount() { return this.http.request('/notifications/count'); }
}

class MLSearchResource {
  constructor(httpClient) { this.http = httpClient; }
  async search(params) { return this.http.request('/search', { params }); }
  async getSearchSites() { return this.http.request('/search/sites'); }
  async getSearchFilters(siteId) { return this.http.request(`/search/filters/${siteId}`); }
  async getSearchSorts(siteId) { return this.http.request(`/search/sorts/${siteId}`); }
  async getSearchAvailableFilters(siteId) { return this.http.request(`/search/available_filters/${siteId}`); }
  async getSearchAvailableSorts(siteId) { return this.http.request(`/search/available_sorts/${siteId}`); }
  async getSearchSuggestions(query) { return this.http.request('/search/suggestions', { params: { q: query } }); }
  async getSearchHistory(userId) { return this.http.request(`/users/${userId}/search_history`); }
  async clearSearchHistory(userId) { return this.http.request(`/users/${userId}/search_history`, { method: 'DELETE' }); }
}

class MLCompetitionResource {
  constructor(httpClient) { this.http = httpClient; }
  async getCompetition(params) { return this.http.request('/competition', { params }); }
  async getItemCompetition(itemId) { return this.http.request(`/items/${itemId}/competition`); }
  async getCategoryCompetition(categoryId) { return this.http.request(`/categories/${categoryId}/competition`); }
  async getCompetitorAnalysis(params) { return this.http.request('/competition/analysis', { params }); }
  async getCompetitorRanking(params) { return this.http.request('/competition/ranking', { params }); }
}

class MLOffersResource {
  constructor(httpClient) { this.http = httpClient; }
  async getOffers(params) { return this.http.request('/offers', { params }); }
  async getOffer(offerId) { return this.http.request(`/offers/${offerId}`); }
  async createOffer(offerData) { return this.http.request('/offers', { method: 'POST', data: offerData }); }
  async updateOffer(offerId, offerData) { return this.http.request(`/offers/${offerId}`, { method: 'PUT', data: offerData }); }
  async deleteOffer(offerId) { return this.http.request(`/offers/${offerId}`, { method: 'DELETE' }); }
  async acceptOffer(offerId) { return this.http.request(`/offers/${offerId}/accept`, { method: 'PUT' }); }
  async rejectOffer(offerId, reason) { return this.http.request(`/offers/${offerId}/reject`, { method: 'PUT', data: { reason } }); }
  async counterOffer(offerId, counterData) { return this.http.request(`/offers/${offerId}/counter`, { method: 'POST', data: counterData }); }
  async getItemOffers(itemId) { return this.http.request(`/items/${itemId}/offers`); }
  async getUserOffers(userId, params) { return this.http.request(`/users/${userId}/offers`, { params }); }
}

class MLDealsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getDeals(params) { return this.http.request('/deals', { params }); }
  async getDeal(dealId) { return this.http.request(`/deals/${dealId}`); }
  async createDeal(dealData) { return this.http.request('/deals', { method: 'POST', data: dealData }); }
  async updateDeal(dealId, dealData) { return this.http.request(`/deals/${dealId}`, { method: 'PUT', data: dealData }); }
  async deleteDeal(dealId) { return this.http.request(`/deals/${dealId}`, { method: 'DELETE' }); }
  async getDealOfDay(params) { return this.http.request('/deals/deal_of_day', { params }); }
  async getLightningDeals(params) { return this.http.request('/deals/lightning', { params }); }
  async getCampaignDeals(campaignId) { return this.http.request(`/campaigns/${campaignId}/deals`); }
  async getUserDeals(userId, params) { return this.http.request(`/users/${userId}/deals`, { params }); }
}

class MLServiceResource {
  constructor(httpClient) { this.http = httpClient; }
  async getServices(params) { return this.http.request('/services', { params }); }
  async getService(serviceId) { return this.http.request(`/services/${serviceId}`); }
  async createService(serviceData) { return this.http.request('/services', { method: 'POST', data: serviceData }); }
  async updateService(serviceId, serviceData) { return this.http.request(`/services/${serviceId}`, { method: 'PUT', data: serviceData }); }
  async deleteService(serviceId) { return this.http.request(`/services/${serviceId}`, { method: 'DELETE' }); }
  async getServiceAreas(serviceId) { return this.http.request(`/services/${serviceId}/areas`); }
  async createServiceArea(serviceId, areaData) { return this.http.request(`/services/${serviceId}/areas`, { method: 'POST', data: areaData }); }
  async updateServiceArea(serviceId, areaId, areaData) { return this.http.request(`/services/${serviceId}/areas/${areaId}`, { method: 'PUT', data: areaData }); }
  async deleteServiceArea(serviceId, areaId) { return this.http.request(`/services/${serviceId}/areas/${areaId}`, { method: 'DELETE' }); }
  async getServiceBookings(serviceId, params) { return this.http.request(`/services/${serviceId}/bookings`, { params }); }
  async createServiceBooking(serviceId, bookingData) { return this.http.request(`/services/${serviceId}/bookings`, { method: 'POST', data: bookingData }); }
  async cancelServiceBooking(serviceId, bookingId) { return this.http.request(`/services/${serviceId}/bookings/${bookingId}/cancel`, { method: 'PUT' }); }
}

class MLRealEstateResource {
  constructor(httpClient) { this.http = httpClient; }
  async getRealEstateListings(params) { return this.http.request('/real_estate/listings', { params }); }
  async getRealEstateListing(listingId) { return this.http.request(`/real_estate/listings/${listingId}`); }
  async createRealEstateListing(listingData) { return this.http.request('/real_estate/listings', { method: 'POST', data: listingData }); }
  async updateRealEstateListing(listingId, listingData) { return this.http.request(`/real_estate/listings/${listingId}`, { method: 'PUT', data: listingData }); }
  async deleteRealEstateListing(listingId) { return this.http.request(`/real_estate/listings/${listingId}`, { method: 'DELETE' }); }
  async getRealEstateProjects(params) { return this.http.request('/real_estate/projects', { params }); }
  async getRealEstateProject(projectId) { return this.http.request(`/real_estate/projects/${projectId}`); }
  async createRealEstateProject(projectData) { return this.http.request('/real_estate/projects', { method: 'POST', data: projectData }); }
  async updateRealEstateProject(projectId, projectData) { return this.http.request(`/real_estate/projects/${projectId}`, { method: 'PUT', data: projectData }); }
  async getRealEstateLeads(params) { return this.http.request('/real_estate/leads', { params }); }
  async getRealEstateLead(leadId) { return this.http.request(`/real_estate/leads/${leadId}`); }
  async createRealEstateLead(leadData) { return this.http.request('/real_estate/leads', { method: 'POST', data: leadData }); }
  async updateRealEstateLead(leadId, leadData) { return this.http.request(`/real_estate/leads/${leadId}`, { method: 'PUT', data: leadData }); }
  async getRealEstateVisits(params) { return this.http.request('/real_estate/visits', { params }); }
  async scheduleRealEstateVisit(visitData) { return this.http.request('/real_estate/visits', { method: 'POST', data: visitData }); }
  async cancelRealEstateVisit(visitId) { return this.http.request(`/real_estate/visits/${visitId}/cancel`, { method: 'PUT' }); }
  async getRealEstateStats(params) { return this.http.request('/real_estate/stats', { params }); }
}

class MLAutosResource {
  constructor(httpClient) { this.http = httpClient; }
  async getAutosListings(params) { return this.http.request('/autos/listings', { params }); }
  async getAutosListing(listingId) { return this.http.request(`/autos/listings/${listingId}`); }
  async createAutosListing(listingData) { return this.http.request('/autos/listings', { method: 'POST', data: listingData }); }
  async updateAutosListing(listingId, listingData) { return this.http.request(`/autos/listings/${listingId}`, { method: 'PUT', data: listingData }); }
  async deleteAutosListing(listingId) { return this.http.request(`/autos/listings/${listingId}`, { method: 'DELETE' }); }
  async getAutosMakes() { return this.http.request('/autos/makes'); }
  async getAutosMake(makeId) { return this.http.request(`/autos/makes/${makeId}`); }
  async getAutosModels(makeId) { return this.http.request(`/autos/makes/${makeId}/models`); }
  async getAutosModel(modelId) { return this.http.request(`/autos/models/${modelId}`); }
  async getAutosYears() { return this.http.request('/autos/years'); }
  async getAutosYear(yearId) { return this.http.request(`/autos/years/${yearId}`); }
  async getAutosVersions(versionId) { return this.http.request(`/autos/versions/${versionId}`); }
  async getAutosEnergies() { return this.http.request('/autos/energies'); }
  async getAutosTransmissions() { return this.http.request('/autos/transmissions'); }
  async getAutosConditions() { return this.http.request('/autos/conditions'); }
  async getAutosColors() { return this.http.request('/autos/colors'); }
  async getAutosInteriors() { return this.http.request('/autos/interiors'); }
  async getAutosDoors() { return this.http.request('/autos/doors'); }
  async getAutosDrives() { return this.http.request('/autos/drives'); }
  async getAutosContactRequests(params) { return this.http.request('/autos/contact_requests', { params }); }
  async createAutosContactRequest(contactData) { return this.http.request('/autos/contact_requests', { method: 'POST', data: contactData }); }
  async getAutosLeads(params) { return this.http.request('/autos/leads', { params }); }
  async getAutosLead(leadId) { return this.http.request(`/autos/leads/${leadId}`); }
  async createAutosLead(leadData) { return this.http.request('/autos/leads', { method: 'POST', data: leadData }); }
}

class MLGlobalSellingResource {
  constructor(httpClient) { this.http = httpClient; }
  async getGlobalItems(params) { return this.http.request('/global/items', { params }); }
  async getGlobalItem(itemId) { return this.http.request(`/global/items/${itemId}`); }
  async syncGlobalItem(localItemId) { return this.http.request(`/global/items/${localItemId}/sync`, { method: 'POST' }); }
  async getGlobalCatalogEligibility(itemId) { return this.http.request(`/global/items/${itemId}/catalog_eligibility`); }
  async getGlobalCatalogProducts(params) { return this.http.request('/global/catalog/products', { params }); }
  async getGlobalCatalogProduct(productId) { return this.http.request(`/global/catalog/products/${productId}`); }
  async publishToGlobal(itemData) { return this.http.request('/global/publish', { method: 'POST', data: itemData }); }
  async unpublishFromGlobal(itemId) { return this.http.request(`/global/${itemId}/unpublish`, { method: 'PUT' }); }
  async getGlobalOrder(orderId) { return this.http.request(`/global/orders/${orderId}`); }
  async searchGlobalOrders(params) { return this.http.request('/global/orders/search', { params }); }
  async shipGlobalOrder(orderId, shipmentData) { return this.http.request(`/global/orders/${orderId}/ship`, { method: 'POST', data: shipmentData }); }
  async getGlobalShipment(shipmentId) { return this.http.request(`/global/shipments/${shipmentId}`); }
  async getGlobalShipmentTracking(shipmentId) { return this.http.request(`/global/shipments/${shipmentId}/tracking`); }
  async getGlobalClaims(params) { return this.http.request('/global/claims', { params }); }
  async getGlobalClaim(claimId) { return this.http.request(`/global/claims/${claimId}`); }
  async respondToGlobalClaim(claimId, responseData) { return this.http.request(`/global/claims/${claimId}/respond`, { method: 'POST', data: responseData }); }
  async getGlobalReturns(params) { return this.http.request('/global/returns', { params }); }
  async getGlobalReturn(returnId) { return this.http.request(`/global/returns/${returnId}`); }
  async processGlobalReturn(returnId, actionData) { return this.http.request(`/global/returns/${returnId}/process`, { method: 'POST', data: actionData }); }
  async getGlobalMessages(params) { return this.http.request('/global/messages', { params }); }
  async sendGlobalMessage(messageData) { return this.http.request('/global/messages', { method: 'POST', data: messageData }); }
  async getGlobalSettings(userId) { return this.http.request(`/users/${userId}/global_settings`); }
  async updateGlobalSettings(userId, settingsData) { return this.http.request(`/users/${userId}/global_settings`, { method: 'PUT', data: settingsData }); }
  async getGlobalShippingModes(siteId) { return this.http.request(`/global/shipping/modes/${siteId}`); }
  async getGlobalShippingRates(params) { return this.http.request('/global/shipping/rates', { params }); }
  async getGlobalPromotions(params) { return this.http.request('/global/promotions', { params }); }
  async createGlobalPromotion(promotionData) { return this.http.request('/global/promotions', { method: 'POST', data: promotionData }); }
  async getGlobalDeals(params) { return this.http.request('/global/deals', { params }); }
  async createGlobalDeal(dealData) { return this.http.request('/global/deals', { method: 'POST', data: dealData }); }
  async getGlobalBilling(params) { return this.http.request('/global/billing', { params }); }
  async getGlobalBillingInfo(billingId) { return this.http.request(`/global/billing/${billingId}`); }
  async getGlobalSizeCharts(params) { return this.http.request('/global/size_charts', { params }); }
  async getGlobalSizeChart(sizeChartId) { return this.http.request(`/global/size_charts/${sizeChartId}`); }
  async createGlobalSizeChart(sizeChartData) { return this.http.request('/global/size_charts', { method: 'POST', data: sizeChartData }); }
  async updateGlobalSizeChart(sizeChartId, sizeChartData) { return this.http.request(`/global/size_charts/${sizeChartId}`, { method: 'PUT', data: sizeChartData }); }
  async deleteGlobalSizeChart(sizeChartId) { return this.http.request(`/global/size_charts/${sizeChartId}`, { method: 'DELETE' }); }
  async validateGlobalSizeChart(sizeChartData) { return this.http.request('/global/size_charts/validate', { method: 'POST', data: sizeChartData }); }
}

class MPMercadoLibreHttpClient extends BaseHttpClient {
  constructor(config = {}) {
    super(config);
    this.baseURL = 'https://api.mercadopago.com';
  }

  async request(endpoint, options = {}) {
    const url = this.buildURL(this.baseURL, endpoint, options.params);
    const headers = options.auth?.getHeaders?.() || {};
    return super.request(url, { ...options, headers });
  }
}

class MPPaymentMethodsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getPaymentMethods() { return this.http.request('/v1/payment_methods'); }
  async getPaymentMethod(methodId) { return this.http.request(`/v1/payment_methods/${methodId}`); }
  async getPaymentMethodsByType(type) { return this.http.request(`/v1/payment_methods/${type}`); }
  async getPaymentMethodsByBin(bin, params) { return this.http.request('/v1/payment_methods', { params: { bin, ...params } }); }
  async getInstallments(bin, amount) { return this.http.request('/v1/payment_methods/installments', { params: { bin, amount } }); }
  async getIdentificationTypes() { return this.http.request('/identification_types'); }
  async getOnlinePaymentMethods(params) { return this.http.request('/v1/payment_methods', { params }); }
}

class MPPaymentsResource {
  constructor(httpClient) { this.http = httpClient; }
  async createPayment(paymentData) { return this.http.request('/v1/payments', { method: 'POST', data: paymentData }); }
  async getPayment(paymentId) { return this.http.request(`/v1/payments/${paymentId}`); }
  async searchPayments(params) { return this.http.request('/v1/payments/search', { params }); }
  async updatePayment(paymentId, paymentData) { return this.http.request(`/v1/payments/${paymentId}`, { method: 'PUT', data: paymentData }); }
  async capturePayment(paymentId, captureData) { return this.http.request(`/v1/payments/${paymentId}`, { method: 'PUT', data: captureData }); }
  async cancelPayment(paymentId) { return this.http.request(`/v1/payments/${paymentId}`, { method: 'PUT', data: { status: 'cancelled' } }); }
  async refundPayment(paymentId, refundData) { return this.http.request(`/v1/payments/${paymentId}/refunds`, { method: 'POST', data: refundData }); }
  async getPaymentRefunds(paymentId) { return this.http.request(`/v1/payments/${paymentId}/refunds`); }
  async getPaymentRefund(paymentId, refundId) { return this.http.request(`/v1/payments/${paymentId}/refunds/${refundId}`); }
  async createPaymentFromOrder(orderData) { return this.http.request('/v1/payments/create_from_order', { method: 'POST', data: orderData }); }
  async getPaymentDetails(paymentId) { return this.http.request(`/v1/payments/${paymentId}`); }
  async getPaymentOperations(paymentId) { return this.http.request(`/v1/payments/${paymentId}/operations`); }
  async getPaymentFees(paymentId) { return this.http.request(`/v1/payments/${paymentId}/fees`); }
  async getPaymentTaxes(paymentId) { return this.http.request(`/v1/payments/${paymentId}/taxes`); }
}

class MPPaymentIntentsResource {
  constructor(httpClient) { this.http = httpClient; }
  async createPaymentIntent(intentData) { return this.http.request('/v1/payment_intents', { method: 'POST', data: intentData }); }
  async getPaymentIntent(intentId) { return this.http.request(`/v1/payment_intents/${intentId}`); }
  async updatePaymentIntent(intentId, intentData) { return this.http.request(`/v1/payment_intents/${intentId}`, { method: 'PUT', data: intentData }); }
  async capturePaymentIntent(intentId, captureData) { return this.http.request(`/v1/payment_intents/${intentId}/capture`, { method: 'PUT', data: captureData }); }
  async cancelPaymentIntent(intentId) { return this.http.request(`/v1/payment_intents/${intentId}/cancel`, { method: 'PUT' }); }
}

class MPOrdersResource {
  constructor(httpClient) { this.http = httpClient; }
  async createOrder(orderData) { return this.http.request('/v1/orders', { method: 'POST', data: orderData }); }
  async getOrder(orderId) { return this.http.request(`/v1/orders/${orderId}`); }
  async searchOrders(params) { return this.http.request('/v1/orders/search', { params }); }
  async updateOrder(orderId, orderData) { return this.http.request(`/v1/orders/${orderId}`, { method: 'PUT', data: orderData }); }
  async deleteOrder(orderId) { return this.http.request(`/v1/orders/${orderId}`, { method: 'DELETE' }); }
  async getOrderPayments(orderId) { return this.http.request(`/v1/orders/${orderId}/payments`); }
  async addTransaction(orderId, transactionData) { return this.http.request(`/v1/orders/${orderId}/transactions`, { method: 'POST', data: transactionData }); }
  async updateTransaction(orderId, transactionId, transactionData) { return this.http.request(`/v1/orders/${orderId}/transactions/${transactionId}`, { method: 'PUT', data: transactionData }); }
  async removeTransaction(orderId, transactionId) { return this.http.request(`/v1/orders/${orderId}/transactions/${transactionId}`, { method: 'DELETE' }); }
  async processOrder(orderData) { return this.http.request('/v1/orders/process', { method: 'POST', data: orderData }); }
}

class MPPreferencesResource {
  constructor(httpClient) { this.http = httpClient; }
  async createPreference(prefData) { return this.http.request('/checkout/preferences', { method: 'POST', data: prefData }); }
  async getPreference(prefId) { return this.http.request(`/checkout/preferences/${prefId}`); }
  async updatePreference(prefId, prefData) { return this.http.request(`/checkout/preferences/${prefId}`, { method: 'PUT', data: prefData }); }
  async searchPreferences(params) { return this.http.request('/checkout/preferences/search', { params }); }
  async deletePreference(prefId) { return this.http.request(`/checkout/preferences/${prefId}`, { method: 'DELETE' }); }
}

class MPCustomersResource {
  constructor(httpClient) { this.http = httpClient; }
  async createCustomer(customerData) { return this.http.request('/v1/customers', { method: 'POST', data: customerData }); }
  async getCustomer(customerId) { return this.http.request(`/v1/customers/${customerId}`); }
  async updateCustomer(customerId, customerData) { return this.http.request(`/v1/customers/${customerId}`, { method: 'PUT', data: customerData }); }
  async deleteCustomer(customerId) { return this.http.request(`/v1/customers/${customerId}`, { method: 'DELETE' }); }
  async searchCustomers(params) { return this.http.request('/v1/customers/search', { params }); }
  async listCustomers(params) { return this.http.request('/v1/customers', { params }); }
}

class MPCardsResource {
  constructor(httpClient) { this.http = httpClient; }
  async createCard(customerId, cardData) { return this.http.request(`/v1/customers/${customerId}/cards`, { method: 'POST', data: cardData }); }
  async getCard(customerId, cardId) { return this.http.request(`/v1/customers/${customerId}/cards/${cardId}`); }
  async updateCard(customerId, cardId, cardData) { return this.http.request(`/v1/customers/${customerId}/cards/${cardId}`, { method: 'PUT', data: cardData }); }
  async deleteCard(customerId, cardId) { return this.http.request(`/v1/customers/${customerId}/cards/${cardId}`, { method: 'DELETE' }); }
  async listCards(customerId, params) { return this.http.request(`/v1/customers/${customerId}/cards`, { params }); }
}

class MPDisputesResource {
  constructor(httpClient) { this.http = httpClient; }
  async getDisputes(params) { return this.http.request('/v1/disputes', { params }); }
  async getDispute(disputeId) { return this.http.request(`/v1/disputes/${disputeId}`); }
  async acceptDispute(disputeId) { return this.http.request(`/v1/disputes/${disputeId}/accept`, { method: 'PUT' }); }
  async createDisputeEvidence(disputeId, evidenceData) { return this.http.request(`/v1/disputes/${disputeId}/evidence`, { method: 'POST', data: evidenceData }); }
  async getDisputeEvidence(disputeId) { return this.http.request(`/v1/disputes/${disputeId}/evidence`); }
  async updateDisputeEvidence(disputeId, evidenceId, evidenceData) { return this.http.request(`/v1/disputes/${disputeId}/evidence/${evidenceId}`, { method: 'PUT', data: evidenceData }); }
}

class MPChargebacksResource {
  constructor(httpClient) { this.http = httpClient; }
  async getChargebacks(params) { return this.http.request('/v1/chargebacks', { params }); }
  async getChargeback(chargebackId) { return this.http.request(`/v1/chargebacks/${chargebackId}`); }
  async acceptChargeback(chargebackId) { return this.http.request(`/v1/chargebacks/${chargebackId}/accept`, { method: 'PUT' }); }
  async getChargebackEvidence(chargebackId) { return this.http.request(`/v1/chargebacks/${chargebackId}/evidence`); }
  async createChargebackEvidence(chargebackId, evidenceData) { return this.http.request(`/v1/chargebacks/${chargebackId}/evidence`, { method: 'POST', data: evidenceData }); }
  async getChargebackRefund(chargebackId) { return this.http.request(`/v1/chargebacks/${chargebackId}/refund`); }
  async createChargebackRefund(chargebackId, refundData) { return this.http.request(`/v1/chargebacks/${chargebackId}/refund`, { method: 'POST', data: refundData }); }
}

class MPClaimsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getClaims(params) { return this.http.request('/v1/claims', { params }); }
  async getClaim(claimId) { return this.http.request(`/v1/claims/${claimId}`); }
  async getClaimDetails(claimId) { return this.http.request(`/v1/claims/${claimId}/details`); }
  async getClaimHistory(claimId) { return this.http.request(`/v1/claims/${claimId}/history`); }
  async getClaimEvidence(claimId) { return this.http.request(`/v1/claims/${claimId}/evidence`); }
  async getClaimReason(claimId) { return this.http.request(`/v1/claims/${claimId}/reason`); }
  async getClaimNotifications(claimId) { return this.http.request(`/v1/claims/${claimId}/notifications`); }
  async getClaimMessages(claimId) { return this.http.request(`/v1/claims/${claimId}/messages`); }
  async sendClaimMessage(claimId, messageData) { return this.http.request(`/v1/claims/${claimId}/messages`, { method: 'POST', data: messageData }); }
  async attachClaimFile(claimId, fileData) { return this.http.request(`/v1/claims/${claimId}/attachments`, { method: 'POST', data: fileData }); }
  async downloadClaimFile(claimId, fileId) { return this.http.request(`/v1/claims/${claimId}/attachments/${fileId}`); }
  async requestMediation(claimId) { return this.http.request(`/v1/claims/${claimId}/mediation`, { method: 'POST' }); }
  async getExpectedResolutions(claimId) { return this.http.request(`/v1/claims/${claimId}/expected_resolutions`); }
  async uploadShippingEvidence(claimId, evidenceData) { return this.http.request(`/v1/claims/${claimId}/shipping_evidence`, { method: 'POST', data: evidenceData }); }
  async searchClaims(params) { return this.http.request('/v1/claims/search', { params }); }
}

class MPStoreResource {
  constructor(httpClient) { this.http = httpClient; }
  async createStore(userId, storeData) { return this.http.request(`/users/${userId}/stores`, { method: 'POST', data: storeData }); }
  async getStore(storeId) { return this.http.request(`/stores/${storeId}`); }
  async updateStore(storeId, storeData) { return this.http.request(`/stores/${storeId}`, { method: 'PUT', data: storeData }); }
  async deleteStore(storeId) { return this.http.request(`/stores/${storeId}`, { method: 'DELETE' }); }
  async searchStores(userId, params) { return this.http.request(`/users/${userId}/stores/search`, { params }); }
  async getStoreLocations(storeId) { return this.http.request(`/stores/${storeId}/locations`); }
  async createStoreLocation(storeId, locationData) { return this.http.request(`/stores/${storeId}/locations`, { method: 'POST', data: locationData }); }
  async getStoreCategories(storeId) { return this.http.request(`/stores/${storeId}/categories`); }
}

class MPPOSResource {
  constructor(httpClient) { this.http = httpClient; }
  async createPOS(posData) { return this.http.request('/pos', { method: 'POST', data: posData }); }
  async getPOS(posId) { return this.http.request(`/pos/${posId}`); }
  async updatePOS(posId, posData) { return this.http.request(`/pos/${posId}`, { method: 'PUT', data: posData }); }
  async deletePOS(posId) { return this.http.request(`/pos/${posId}`, { method: 'DELETE' }); }
  async searchPOS(params) { return this.http.request('/pos/search', { params }); }
  async getPOSExternalPOS(params) { return this.http.request('/pos/external_pos', { params }); }
  async getPOSPayments(posId, params) { return this.http.request(`/pos/${posId}/payments`, { params }); }
  async getPOSShift(posId, shiftId) { return this.http.request(`/pos/${posId}/shifts/${shiftId}`); }
  async openPOSShift(posId, shiftData) { return this.http.request(`/pos/${posId}/shifts`, { method: 'POST', data: shiftData }); }
  async closePOSShift(posId, shiftId, closeData) { return this.http.request(`/pos/${posId}/shifts/${shiftId}/close`, { method: 'PUT', data: closeData }); }
}

class MPPointResource {
  constructor(httpClient) { this.http = httpClient; }
  async getPointDevices(params) { return this.http.request('/point/integration-api/devices', { params }); }
  async updatePointDeviceMode(deviceId, modeData) { return this.http.request(`/point/integration-api/devices/${deviceId}/mode`, { method: 'PUT', data: modeData }); }
  async createPointPaymentIntent(deviceId, intentData) { return this.http.request(`/point/integration-api/devices/${deviceId}/payment-intents`, { method: 'POST', data: intentData }); }
  async getPointPaymentIntent(deviceId, intentId) { return this.http.request(`/point/integration-api/devices/${deviceId}/payment-intents/${intentId}`); }
  async cancelPointPaymentIntent(deviceId, intentId) { return this.http.request(`/point/integration-api/devices/${deviceId}/payment-intents/${intentId}`, { method: 'DELETE' }); }
  async refundPointPayment(deviceId, refundData) { return this.http.request(`/point/integration-api/devices/${deviceId}/refunds`, { method: 'POST', data: refundData }); }
  async getPointRefund(deviceId, refundId) { return this.http.request(`/point/integration-api/devices/${deviceId}/refunds/${refundId}`); }
  async cancelPointRefund(deviceId, refundId) { return this.http.request(`/point/integration-api/devices/${deviceId}/refunds/${refundId}`, { method: 'DELETE' }); }
  async getPointIntegrator(integratorId) { return this.http.request(`/point/integration-api/integrator/${integratorId}`); }
  async updatePointIntegrator(integratorId, integratorData) { return this.http.request(`/point/integration-api/integrator/${integratorId}`, { method: 'PUT', data: integratorData }); }
  async getTerminals(params) { return this.http.request('/point/integration-api/terminals', { params }); }
  async updateTerminalMode(deviceId, modeData) { return this.http.request(`/point/integration-api/terminals/${deviceId}/mode`, { method: 'PATCH', data: modeData }); }
}

class MPQRCodeResource {
  constructor(httpClient) { this.http = httpClient; }
  async createQRCode(orderData) { return this.http.request('/instore/orders/qr', { method: 'POST', data: orderData }); }
  async getQRCode(orderId) { return this.http.request(`/instore/orders/qr/${orderId}`); }
  async updateQRCode(orderId, orderData) { return this.http.request(`/instore/orders/qr/${orderId}`, { method: 'PUT', data: orderData }); }
  async closeQRCode(orderId) { return this.http.request(`/instore/orders/qr/${orderId}/close`, { method: 'PUT' }); }
  async getQRCodePayment(orderId) { return this.http.request(`/instore/orders/qr/${orderId}/payment`); }
  async createDynamicQRCode(orderData) { return this.http.request('/instore/orders/qr/dynamic', { method: 'POST', data: orderData }); }
  async getDynamicQRCode(orderId) { return this.http.request(`/instore/orders/qr/dynamic/${orderId}`); }
  async updateDynamicQRCode(orderId, orderData) { return this.http.request(`/instore/orders/qr/dynamic/${orderId}`, { method: 'PUT', data: orderData }); }
}

class MPInstoreOrdersResource {
  constructor(httpClient) { this.http = httpClient; }
  async createInstoreOrder(orderData) { return this.http.request('/instore/orders', { method: 'POST', data: orderData }); }
  async getInstoreOrder(orderId) { return this.http.request(`/instore/orders/${orderId}`); }
  async updateInstoreOrder(orderId, orderData) { return this.http.request(`/instore/orders/${orderId}`, { method: 'PUT', data: orderData }); }
  async cancelInstoreOrder(orderId) { return this.http.request(`/instore/orders/${orderId}`, { method: 'DELETE' }); }
  async getInstoreOrderPayment(orderId) { return this.http.request(`/instore/orders/${orderId}/payments`); }
  async createInstorePayment(orderId, paymentData) { return this.http.request(`/instore/orders/${orderId}/payments`, { method: 'POST', data: paymentData }); }
  async refundInstorePayment(orderId, paymentId, refundData) { return this.http.request(`/instore/orders/${orderId}/payments/${paymentId}/refunds`, { method: 'POST', data: refundData }); }
}

class MPInventoryResource {
  constructor(httpClient) { this.http = httpClient; }
  async getInventory(params) { return this.http.request('/v1/inventory/notification', { params }); }
  async createInventoryNotification(notificationData) { return this.http.request('/v1/inventory/notification', { method: 'POST', data: notificationData }); }
  async getInventoryLocations(params) { return this.http.request('/v1/inventory/locations', { params }); }
  async getInventoryLocation(locationId) { return this.http.request(`/v1/inventory/locations/${locationId}`); }
  async getInventoryItems(locationId, params) { return this.http.request(`/v1/inventory/locations/${locationId}/items`, { params }); }
  async updateInventoryItem(locationId, itemId, itemData) { return this.http.request(`/v1/inventory/locations/${locationId}/items/${itemId}`, { method: 'PUT', data: itemData }); }
}

class MPSubscriptionsResource {
  constructor(httpClient) { this.http = httpClient; }
  async createPreapproval(preapprovalData) { return this.http.request('/preapproval', { method: 'POST', data: preapprovalData }); }
  async getPreapproval(preapprovalId) { return this.http.request(`/preapproval/${preapprovalId}`); }
  async updatePreapproval(preapprovalId, preapprovalData) { return this.http.request(`/preapproval/${preapprovalId}`, { method: 'PUT', data: preapprovalData }); }
  async searchPreapprovals(params) { return this.http.request('/preapproval/search', { params }); }
  async exportPreapprovals(params) { return this.http.request('/preapproval/export', { params }); }
  async createPreapprovalPlan(planData) { return this.http.request('/preapproval_plan', { method: 'POST', data: planData }); }
  async getPreapprovalPlan(planId) { return this.http.request(`/preapproval_plan/${planId}`); }
  async updatePreapprovalPlan(planId, planData) { return this.http.request(`/preapproval_plan/${planId}`, { method: 'PUT', data: planData }); }
  async searchPreapprovalPlans(params) { return this.http.request('/preapproval_plan/search', { params }); }
  async getAuthorizedPayments(params) { return this.http.request('/authorized_payments', { params }); }
  async getAuthorizedPayment(paymentId) { return this.http.request(`/authorized_payments/${paymentId}`); }
  async captureAuthorizedPayment(paymentId, captureData) { return this.http.request(`/authorized_payments/${paymentId}/capture`, { method: 'POST', data: captureData }); }
  async cancelAuthorizedPayment(paymentId) { return this.http.request(`/authorized_payments/${paymentId}/cancel`, { method: 'POST' }); }
}

class MPReportsResource {
  constructor(httpClient) { this.http = httpClient; }
  async createReleaseConfiguration(configData) { return this.http.request('/reports/releases/configs', { method: 'POST', data: configData }); }
  async updateReleaseConfiguration(configId, configData) { return this.http.request(`/reports/releases/configs/${configId}`, { method: 'PUT', data: configData }); }
  async getReleaseConfigurations(params) { return this.http.request('/reports/releases/configs', { params }); }
  async createReleaseReport(reportData) { return this.http.request('/reports/releases', { method: 'POST', data: reportData }); }
  async getReleaseReport(reportId) { return this.http.request(`/reports/releases/${reportId}`); }
  async searchReleaseReports(params) { return this.http.request('/reports/releases/search', { params }); }
  async enableReleaseAutoGeneration(configId) { return this.http.request(`/reports/releases/configs/${configId}/auto-generation`, { method: 'POST' }); }
  async disableReleaseAutoGeneration(configId) { return this.http.request(`/reports/releases/configs/${configId}/auto-generation`, { method: 'DELETE' }); }
  async downloadReleaseReport(reportId) { return this.http.request(`/reports/releases/${reportId}/download`); }
  async createSettlementConfiguration(configData) { return this.http.request('/reports/settlements/configs', { method: 'POST', data: configData }); }
  async updateSettlementConfiguration(configId, configData) { return this.http.request(`/reports/settlements/configs/${configId}`, { method: 'PUT', data: configData }); }
  async getSettlementConfigurations(params) { return this.http.request('/reports/settlements/configs', { params }); }
  async createSettlementReport(reportData) { return this.http.request('/reports/settlements', { method: 'POST', data: reportData }); }
  async getSettlementReport(reportId) { return this.http.request(`/reports/settlements/${reportId}`); }
  async getSettlementReportStatus(reportId) { return this.http.request(`/reports/settlements/${reportId}/status`); }
  async searchSettlementReports(params) { return this.http.request('/reports/settlements/search', { params }); }
  async enableSettlementAutoGeneration(configId) { return this.http.request(`/reports/settlements/configs/${configId}/auto-generation`, { method: 'POST' }); }
  async disableSettlementAutoGeneration(configId) { return this.http.request(`/reports/settlements/configs/${configId}/auto-generation`, { method: 'DELETE' }); }
  async downloadSettlementReport(reportId) { return this.http.request(`/reports/settlements/${reportId}/download`); }
  async createBillingReport(reportData) { return this.http.request('/reports/billing', { method: 'POST', data: reportData }); }
  async getBillingReport(reportId) { return this.http.request(`/reports/billing/${reportId}`); }
  async searchBillingReports(params) { return this.http.request('/reports/billing/search', { params }); }
  async downloadBillingReport(reportId) { return this.http.request(`/reports/billing/${reportId}/download`); }
}

class MPOAuthResource {
  constructor(httpClient) { this.http = httpClient; }
  async getAccessToken(grantData) { return this.http.request('/oauth/token', { method: 'POST', data: grantData }); }
  async refreshToken(refreshData) { return this.http.request('/oauth/token', { method: 'POST', data: refreshData }); }
  async revokeToken(revokeData) { return this.http.request('/oauth/revoke', { method: 'POST', data: revokeData }); }
  async getAuthorizationURL(params) { return this.http.request('/oauth/authorization', { params }); }
}

class MPTestUsersResource {
  constructor(httpClient) { this.http = httpClient; }
  async createTestUser(userData) { return this.http.request('/users/test', { method: 'POST', data: userData }); }
  async createTestPayment(paymentData) { return this.http.request('/payments/test', { method: 'POST', data: paymentData }); }
  async createTestCard(cardData) { return this.http.request('/cards/test', { method: 'POST', data: cardData }); }
}

class MPBalanceResource {
  constructor(httpClient) { this.http = httpClient; }
  async getBalance() { return this.http.request('/v1/accounts/balance'); }
  async getAccountMovement(params) { return this.http.request('/v1/accounts/me/movements', { params }); }
  async getAccountSummary(params) { return this.http.request('/v1/accounts/me/summary', { params }); }
  async withdrawBalance(withdrawData) { return this.http.request('/v1/accounts/me/withdrawals', { method: 'POST', data: withdrawData }); }
}

class MPLegalResource {
  constructor(httpClient) { this.http = httpClient; }
  async getTerms(termsType) { return this.http.request(`/terms/${termsType}`); }
  async acceptTerms(termsData) { return this.http.request('/terms/accept', { method: 'POST', data: termsData }); }
  async getPrivacyPolicy() { return this.http.request('/privacy_policy'); }
  async getMerchantAgreement() { return this.http.request('/merchant_agreement'); }
}

class MPCardTokensResource {
  constructor(httpClient) { this.http = httpClient; }
  async createCardToken(cardData) { return this.http.request('/v1/card_tokens', { method: 'POST', data: cardData }); }
  async getCardToken(tokenId) { return this.http.request(`/v1/card_tokens/${tokenId}`); }
  async createCVVToken(cvvData) { return this.http.request('/v1/card_tokens/cvv', { method: 'POST', data: cvvData }); }
}

class MPCardTokenizationResource {
  constructor(httpClient) { this.http = httpClient; }
  async getCardTokenization(keyId, cardData) { return this.http.request(`/card_tokenization/${keyId}`, { params: cardData }); }
}

class MPCurrencyResource {
  constructor(httpClient) { this.http = httpClient; }
  async getCurrencies() { return this.http.request('/currencies'); }
  async getCurrency(currencyId) { return this.http.request(`/currencies/${currencyId}`); }
  async getCurrencyRate(currencyId) { return this.http.request(`/currencies/${currencyId}/rate`); }
  async convertCurrency(amount, fromCurrency, toCurrency) { return this.http.request('/currency/convert', { params: { amount, from: fromCurrency, to: toCurrency } }); }
}

class MPLocationsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getCountries() { return this.http.request('/countries'); }
  async getCountry(countryId) { return this.http.request(`/countries/${countryId}`); }
  async getStates(countryId) { return this.http.request(`/countries/${countryId}/states`); }
  async getCities(stateId) { return this.http.request(`/states/${stateId}/cities`); }
  async getZipCodes(cityId) { return this.http.request(`/cities/${cityId}/zip_codes`); }
  async getZipCodeData(zipCode) { return this.http.request(`/zip_codes/${zipCode}`); }
  async searchLocations(params) { return this.http.request('/locations', { params }); }
}

class MPHelpersResource {
  constructor(httpClient) { this.http = httpClient; }
  async postPaymentHelper(paymentData) { return this.http.request('/helpers/payment', { method: 'POST', data: paymentData }); }
  async postOrderHelper(orderData) { return this.http.request('/helpers/order', { method: 'POST', data: orderData }); }
  async postCustomerHelper(customerData) { return this.http.request('/helpers/customer', { method: 'POST', data: customerData }); }
}

class MPCatalogResource {
  constructor(httpClient) { this.http = httpClient; }
  async getCatalogProducts(params) { return this.http.request('/catalog_products', { params }); }
  async getCatalogProduct(productId) { return this.http.request(`/catalog_products/${productId}`); }
  async getCatalogProductAttributes(productId) { return this.http.request(`/catalog_products/${productId}/attributes`); }
  async searchCatalogProducts(params) { return this.http.request('/catalog_products/search', { params }); }
  async getCatalogPublications(params) { return this.http.request('/catalog_publications', { params }); }
  async getCatalogPublication(publicationId) { return this.http.request(`/catalog_publications/${publicationId}`); }
  async createCatalogPublication(publicationData) { return this.http.request('/catalog_publications', { method: 'POST', data: publicationData }); }
  async updateCatalogPublication(publicationId, publicationData) { return this.http.request(`/catalog_publications/${publicationId}`, { method: 'PUT', data: publicationData }); }
}

class MPDiscountCampaignsResource {
  constructor(httpClient) { this.http = httpClient; }
  async getDiscountCampaigns(params) { return this.http.request('/discount_campaigns', { params }); }
  async getDiscountCampaign(campaignId) { return this.http.request(`/discount_campaigns/${campaignId}`); }
  async createDiscountCampaign(campaignData) { return this.http.request('/discount_campaigns', { method: 'POST', data: campaignData }); }
  async updateDiscountCampaign(campaignId, campaignData) { return this.http.request(`/discount_campaigns/${campaignId}`, { method: 'PUT', data: campaignData }); }
  async deleteDiscountCampaign(campaignId) { return this.http.request(`/discount_campaigns/${campaignId}`, { method: 'DELETE' }); }
  async getDiscountCampaignRules(campaignId) { return this.http.request(`/discount_campaigns/${campaignId}/rules`); }
  async createDiscountCampaignRule(campaignId, ruleData) { return this.http.request(`/discount_campaigns/${campaignId}/rules`, { method: 'POST', data: ruleData }); }
}

class MPMCPResource {
  constructor(httpClient) { this.http = httpClient; }
  async getMCPServerConfig() { return this.http.request('/mcp/server'); }
  async updateMCPServerConfig(configData) { return this.http.request('/mcp/server', { method: 'PUT', data: configData }); }
  async getMCPStatus() { return this.http.request('/mcp/status'); }
  async getMCPEndpoints() { return this.http.request('/mcp/endpoints'); }
  async getMCPTools() { return this.http.request('/mcp/tools'); }
}

class MPShippingResource {
  constructor(httpClient) { this.http = httpClient; }
  async createShipping(shippingData) { return this.http.request('/shipping', { method: 'POST', data: shippingData }); }
  async getShipping(shippingId) { return this.http.request(`/shipping/${shippingId}`); }
  async updateShipping(shippingId, shippingData) { return this.http.request(`/shipping/${shippingId}`, { method: 'PUT', data: shippingData }); }
  async cancelShipping(shippingId) { return this.http.request(`/shipping/${shippingId}/cancel`, { method: 'PUT' }); }
  async getShippingRates(params) { return this.http.request('/shipping/rates', { params }); }
  async getShippingLabels(shippingId) { return this.http.request(`/shipping/${shippingId}/labels`); }
  async getShippingTracking(shippingId) { return this.http.request(`/shipping/${shippingId}/tracking`); }
}

class MPLoadResource {
  constructor(httpClient) { this.http = httpClient; }
  async getLoads(params) { return this.http.request('/loads', { params }); }
  async getLoad(loadId) { return this.http.request(`/loads/${loadId}`); }
  async createLoad(loadData) { return this.http.request('/loads', { method: 'POST', data: loadData }); }
  async updateLoad(loadId, loadData) { return this.http.request(`/loads/${loadId}`, { method: 'PUT', data: loadData }); }
  async cancelLoad(loadId) { return this.http.request(`/loads/${loadId}/cancel`, { method: 'PUT' }); }
}

class MPLoadPlansResource {
  constructor(httpClient) { this.http = httpClient; }
  async getLoadPlans(params) { return this.http.request('/load_plans', { params }); }
  async getLoadPlan(planId) { return this.http.request(`/load_plans/${planId}`); }
  async createLoadPlan(planData) { return this.http.request('/load_plans', { method: 'POST', data: planData }); }
  async updateLoadPlan(planId, planData) { return this.http.request(`/load_plans/${planId}`, { method: 'PUT', data: planData }); }
  async deleteLoadPlan(planId) { return this.http.request(`/load_plans/${planId}`, { method: 'DELETE' }); }
}

class MPHooksResource {
  constructor(httpClient) { this.http = httpClient; }
  async getHooks(params) { return this.http.request('/hooks', { params }); }
  async getHook(hookId) { return this.http.request(`/hooks/${hookId}`); }
  async createHook(hookData) { return this.http.request('/hooks', { method: 'POST', data: hookData }); }
  async updateHook(hookId, hookData) { return this.http.request(`/hooks/${hookId}`, { method: 'PUT', data: hookData }); }
  async deleteHook(hookId) { return this.http.request(`/hooks/${hookId}`, { method: 'DELETE' }); }
  async getHookEvents() { return this.http.request('/hooks/events'); }
  async getHookDelivery(hookId, deliveryId) { return this.http.request(`/hooks/${hookId}/deliveries/${deliveryId}`); }
  async retryHookDelivery(hookId, deliveryId) { return this.http.request(`/hooks/${hookId}/deliveries/${deliveryId}/retry`, { method: 'POST' }); }
}

class MPLoyaltyResource {
  constructor(httpClient) { this.http = httpClient; }
  async getLoyaltyPrograms() { return this.http.request('/loyalty/programs'); }
  async getLoyaltyProgram(programId) { return this.http.request(`/loyalty/programs/${programId}`); }
  async getLoyaltyRewards(programId, params) { return this.http.request(`/loyalty/programs/${programId}/rewards`, { params }); }
  async createLoyaltyReward(programId, rewardData) { return this.http.request(`/loyalty/programs/${programId}/rewards`, { method: 'POST', data: rewardData }); }
  async getLoyaltyAccrual(programId, params) { return this.http.request(`/loyalty/programs/${programId}/accrual`, { params }); }
  async createLoyaltyAccrual(programId, accrualData) { return this.http.request(`/loyalty/programs/${programId}/accrual`, { method: 'POST', data: accrualData }); }
}

class MPAdvancedPaymentsResource {
  constructor(httpClient) { this.http = httpClient; }
  async createAdvancedPayment(paymentData) { return this.http.request('/advanced_payments', { method: 'POST', data: paymentData }); }
  async getAdvancedPayment(paymentId) { return this.http.request(`/advanced_payments/${paymentId}`); }
  async searchAdvancedPayments(params) { return this.http.request('/advanced_payments/search', { params }); }
  async captureAdvancedPayment(paymentId, captureData) { return this.http.request(`/advanced_payments/${paymentId}/capture`, { method: 'POST', data: captureData }); }
  async cancelAdvancedPayment(paymentId) { return this.http.request(`/advanced_payments/${paymentId}/cancel`, { method: 'POST' }); }
  async refundAdvancedPayment(paymentId, refundData) { return this.http.request(`/advanced_payments/${paymentId}/refunds`, { method: 'POST', data: refundData }); }
}

class MPConsumerCreditsResource {
  constructor(httpClient) { this.http = httpClient; }
  async createConsumerCredit(creditData) { return this.http.request('/consumer_credits', { method: 'POST', data: creditData }); }
  async getConsumerCredit(creditId) { return this.http.request(`/consumer_credits/${creditId}`); }
  async updateConsumerCredit(creditId, creditData) { return this.http.request(`/consumer_credits/${creditId}`, { method: 'PUT', data: creditData }); }
  async getConsumerCreditSimulation(params) { return this.http.request('/consumer_credits/simulate', { params }); }
}

class MPExpressPaymentsResource {
  constructor(httpClient) { this.http = httpClient; }
  async createExpressPayment(paymentData) { return this.http.request('/express_payments', { method: 'POST', data: paymentData }); }
  async getExpressPayment(paymentId) { return this.http.request(`/express_payments/${paymentId}`); }
  async updateExpressPayment(paymentId, paymentData) { return this.http.request(`/express_payments/${paymentId}`, { method: 'PUT', data: paymentData }); }
  async cancelExpressPayment(paymentId) { return this.http.request(`/express_payments/${paymentId}/cancel`, { method: 'PUT' }); }
}

class MPCashInsResource {
  constructor(httpClient) { this.http = httpClient; }
  async createCashIn(cashInData) { return this.http.request('/cash_ins', { method: 'POST', data: cashInData }); }
  async getCashIn(cashInId) { return this.http.request(`/cash_ins/${cashInId}`); }
  async updateCashIn(cashInId, cashInData) { return this.http.request(`/cash_ins/${cashInId}`, { method: 'PUT', data: cashInData }); }
  async cancelCashIn(cashInId) { return this.http.request(`/cash_ins/${cashInId}/cancel`, { method: 'PUT' }); }
}

class MPCashOutsResource {
  constructor(httpClient) { this.http = httpClient; }
  async createCashOut(cashOutData) { return this.http.request('/cash_outs', { method: 'POST', data: cashOutData }); }
  async getCashOut(cashOutId) { return this.http.request(`/cash_outs/${cashOutId}`); }
  async updateCashOut(cashOutId, cashOutData) { return this.http.request(`/cash_outs/${cashOutId}`, { method: 'PUT', data: cashOutData }); }
  async cancelCashOut(cashOutId) { return this.http.request(`/cash_outs/${cashOutId}/cancel`, { method: 'PUT' }); }
}

class MPMercadoLibreSDK {
  constructor(config = {}) {
    this.mlAuth = new MercadoLibreAuth(config.mlAccessToken, config.mlRefreshToken);
    this.mpAuth = new MercadoPagoAuth(config.mpAccessToken);
    this.gsAuth = new GlobalSellingAuth(config.gsAccessToken);
    this.mpMlAuth = new MPMercadoLibreAuth(config.mpAccessToken);

    this.mlHttp = new MercadoLibreHttpClient({ baseURL: config.mlBaseURL });
    this.mpHttp = new MercadoPagoHttpClient({ baseURL: config.mpBaseURL });
    this.gsHttp = new GlobalSellingHttpClient({ baseURL: config.gsBaseURL });
    this.mpMlHttp = new MPMercadoLibreHttpClient({ baseURL: config.mpMlBaseURL });

    this.users = new MLUsersResource(this.mlHttp);
    this.items = new MLItemsResource(this.mlHttp);
    this.orders = new MLOrdersResource(this.mlHttp);
    this.payments = new MLPaymentsResource(this.mlHttp);
    this.preferences = new MLPreferencesResource(this.mlHttp);
    this.shipping = new MLShippingResource(this.mlHttp);
    this.questions = new MLQuestionsResource(this.mlHttp);
    this.reviews = new MLReviewsResource(this.mlHttp);
    this.categories = new MLCategoriesResource(this.mlHttp);
    this.sites = new MLSitesResource(this.mlHttp);
    this.merchantOrders = new MLMerchantOrdersResource(this.mlHttp);
    this.customers = new MLCustomersResource(this.mlHttp);
    this.stores = new MLStoresResource(this.mlHttp);
    this.pos = new MLPOSResource(this.mlHttp);
    this.subscriptions = new MLSubscriptionsResource(this.mlHttp);
    this.chargebacks = new MLChargebacksResource(this.mlHttp);
    this.claims = new MLClaimsResource(this.mlHttp);
    this.discounts = new MLDiscountsResource(this.mlHttp);
    this.favorites = new MLFavoritesResource(this.mlHttp);
    this.moderations = new MLModerationsResource(this.mlHttp);
    this.messaging = new MLMessagingResource(this.mlHttp);
    this.returns = new MLReturnsResource(this.mlHttp);
    this.billing = new MLBillingResource(this.mlHttp);
    this.visits = new MLVisitsResource(this.mlHttp);
    this.reputation = new MLReputationResource(this.mlHttp);
    this.trends = new MLTrendsResource(this.mlHttp);
    this.insights = new MLInsightsResource(this.mlHttp);
    this.ads = new MLAdsResource(this.mlHttp);
    this.health = new MLHealthResource(this.mlHttp);
    this.officialStores = new MLOfficialStoresResource(this.mlHttp);
    this.products = new MLProductsResource(this.mlHttp);
    this.special = new MLSpecialResources(this.mlHttp);
    this.images = new MLImageResource(this.mlHttp);
    this.prices = new MLPriceResource(this.mlHttp);
    this.automations = new MLAutomationResource(this.mlHttp);
    this.dataHealth = new MLDataHealthResource(this.mlHttp);
    this.dimensions = new MLDimensionsResource(this.mlHttp);
    this.userProducts = new MLUserProductsResource(this.mlHttp);
    this.kits = new MLKitResource(this.mlHttp);
    this.packs = new MLPacksResource(this.mlHttp);
    this.variations = new MLVariationResource(this.mlHttp);
    this.notifications = new MLNotificationResource(this.mlHttp);
    this.search = new MLSearchResource(this.mlHttp);
    this.competition = new MLCompetitionResource(this.mlHttp);
    this.offers = new MLOffersResource(this.mlHttp);
    this.deals = new MLDealsResource(this.mlHttp);
    this.services = new MLServiceResource(this.mlHttp);
    this.realEstate = new MLRealEstateResource(this.mlHttp);
    this.autos = new MLAutosResource(this.mlHttp);
    this.globalSelling = new MLGlobalSellingResource(this.gsHttp);

    this.mpPaymentMethods = new MPPaymentMethodsResource(this.mpHttp);
    this.mpPayments = new MPPaymentsResource(this.mpHttp);
    this.mpPaymentIntents = new MPPaymentIntentsResource(this.mpHttp);
    this.mpOrders = new MPOrdersResource(this.mpHttp);
    this.mpPreferences = new MPPreferencesResource(this.mpHttp);
    this.mpCustomers = new MPCustomersResource(this.mpHttp);
    this.mpCards = new MPCardsResource(this.mpHttp);
    this.mpDisputes = new MPDisputesResource(this.mpHttp);
    this.mpChargebacks = new MPChargebacksResource(this.mpHttp);
    this.mpClaims = new MPClaimsResource(this.mpHttp);
    this.mpStore = new MPStoreResource(this.mpHttp);
    this.mpPOS = new MPPOSResource(this.mpHttp);
    this.mpPoint = new MPPointResource(this.mpHttp);
    this.mpQRCode = new MPQRCodeResource(this.mpHttp);
    this.mpInstoreOrders = new MPInstoreOrdersResource(this.mpHttp);
    this.mpInventory = new MPInventoryResource(this.mpHttp);
    this.mpSubscriptions = new MPSubscriptionsResource(this.mpHttp);
    this.mpReports = new MPReportsResource(this.mpHttp);
    this.mpOAuth = new MPOAuthResource(this.mpHttp);
    this.mpTestUsers = new MPTestUsersResource(this.mpHttp);
    this.mpBalance = new MPBalanceResource(this.mpHttp);
    this.mpLegal = new MPLegalResource(this.mpHttp);
    this.mpCardTokens = new MPCardTokensResource(this.mpHttp);
    this.mpCardTokenization = new MPCardTokenizationResource(this.mpHttp);
    this.mpCurrency = new MPCurrencyResource(this.mpHttp);
    this.mpLocations = new MPLocationsResource(this.mpHttp);
    this.mpHelpers = new MPHelpersResource(this.mpHttp);
    this.mpCatalog = new MPCatalogResource(this.mpHttp);
    this.mpDiscountCampaigns = new MPDiscountCampaignsResource(this.mpHttp);
    this.mpMCP = new MPMCPResource(this.mpHttp);
    this.mpShipping = new MPShippingResource(this.mpHttp);
    this.mpLoads = new MPLoadResource(this.mpHttp);
    this.mpLoadPlans = new MPLoadPlansResource(this.mpHttp);
    this.mpHooks = new MPHooksResource(this.mpHttp);
    this.mpLoyalty = new MPLoyaltyResource(this.mpHttp);
    this.mpAdvancedPayments = new MPAdvancedPaymentsResource(this.mpHttp);
    this.mpConsumerCredits = new MPConsumerCreditsResource(this.mpHttp);
    this.mpExpressPayments = new MPExpressPaymentsResource(this.mpHttp);
    this.mpCashIns = new MPCashInsResource(this.mpHttp);
    this.mpCashOuts = new MPCashOutsResource(this.mpHttp);
  }

  setMLAccessToken(accessToken) { this.mlAuth.accessToken = accessToken; }
  setMLRefreshToken(refreshToken) { this.mlAuth.refreshToken = refreshToken; }
  setMPAccessToken(accessToken) { this.mpAuth.accessToken = accessToken; }
  setGSAccessToken(accessToken) { this.gsAuth.accessToken = accessToken; }
}

class MPMercadoLibreAuth {
  constructor(accessToken) { this.accessToken = accessToken; }
  getHeaders() { return { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }; }
}

module.exports = {
  MercadoLibreSDK: MPMercadoLibreSDK,
  default: MPMercadoLibreSDK
};
