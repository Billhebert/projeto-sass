/**
 * Mercado Pago API Client Service
 * Handles all communication with Mercado Pago API
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../logger');

// Mercado Pago API Base URL
const MP_API_BASE_URL = 'https://api.mercadopago.com';

/**
 * Create configured axios instance for MP API
 */
const createMPClient = (accessToken) => {
  const client = axios.create({
    baseURL: MP_API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  // Request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      logger.debug('MP API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
      });
      return config;
    },
    (error) => {
      logger.error('MP API Request Error:', { error: error.message });
      return Promise.reject(error);
    }
  );

  // Response interceptor for logging and error handling
  client.interceptors.response.use(
    (response) => {
      logger.debug('MP API Response:', {
        status: response.status,
        url: response.config.url,
      });
      return response;
    },
    (error) => {
      const errorData = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      };
      logger.error('MP API Response Error:', errorData);
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Generate idempotency key for POST requests
 */
const generateIdempotencyKey = () => {
  return `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
};

/**
 * MercadoPago API Service
 */
class MercadoPagoService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.client = createMPClient(accessToken);
  }

  /**
   * Set access token dynamically
   */
  setAccessToken(accessToken) {
    this.accessToken = accessToken;
    this.client = createMPClient(accessToken);
  }

  // ============================================
  // ORDERS API (v1) - New Orders API
  // ============================================

  /**
   * Create a new order
   * POST /v1/orders
   */
  async createOrder(orderData) {
    const response = await this.client.post('/v1/orders', orderData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Get order by ID
   * GET /v1/orders/{id}
   */
  async getOrder(orderId) {
    const response = await this.client.get(`/v1/orders/${orderId}`);
    return response.data;
  }

  /**
   * Search orders
   * GET /v1/orders
   */
  async searchOrders(params = {}) {
    const response = await this.client.get('/v1/orders', { params });
    return response.data;
  }

  /**
   * Capture order payment
   * POST /v1/orders/{id}/capture
   */
  async captureOrder(orderId) {
    const response = await this.client.post(`/v1/orders/${orderId}/capture`, {}, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Cancel order
   * POST /v1/orders/{id}/cancel
   */
  async cancelOrder(orderId) {
    const response = await this.client.post(`/v1/orders/${orderId}/cancel`, {}, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Refund order
   * POST /v1/orders/{id}/refund
   */
  async refundOrder(orderId, refundData = {}) {
    const response = await this.client.post(`/v1/orders/${orderId}/refund`, refundData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Process order
   * POST /v1/orders/{id}/process
   */
  async processOrder(orderId) {
    const response = await this.client.post(`/v1/orders/${orderId}/process`, {}, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Add transaction to order
   * POST /v1/orders/{id}/transactions
   */
  async addTransaction(orderId, transactionData) {
    const response = await this.client.post(`/v1/orders/${orderId}/transactions`, transactionData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Update transaction
   * PUT /v1/orders/{id}/transactions/{transaction_id}
   */
  async updateTransaction(orderId, transactionId, transactionData) {
    const response = await this.client.put(
      `/v1/orders/${orderId}/transactions/${transactionId}`,
      transactionData
    );
    return response.data;
  }

  /**
   * Delete transaction
   * DELETE /v1/orders/{id}/transactions/{transaction_id}
   */
  async deleteTransaction(orderId, transactionId) {
    const response = await this.client.delete(
      `/v1/orders/${orderId}/transactions/${transactionId}`
    );
    return response.data;
  }

  // ============================================
  // PAYMENTS API (v1) - Legacy but widely used
  // ============================================

  /**
   * Create payment
   * POST /v1/payments
   */
  async createPayment(paymentData) {
    const response = await this.client.post('/v1/payments', paymentData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Get payment by ID
   * GET /v1/payments/{id}
   */
  async getPayment(paymentId) {
    const response = await this.client.get(`/v1/payments/${paymentId}`);
    return response.data;
  }

  /**
   * Search payments
   * GET /v1/payments/search
   */
  async searchPayments(params = {}) {
    const defaultParams = {
      sort: 'date_created',
      criteria: 'desc',
    };
    const response = await this.client.get('/v1/payments/search', {
      params: { ...defaultParams, ...params },
    });
    return response.data;
  }

  /**
   * Update payment
   * PUT /v1/payments/{id}
   */
  async updatePayment(paymentId, updateData) {
    const response = await this.client.put(`/v1/payments/${paymentId}`, updateData);
    return response.data;
  }

  /**
   * Refund payment (full)
   * POST /v1/payments/{id}/refunds
   */
  async refundPayment(paymentId) {
    const response = await this.client.post(`/v1/payments/${paymentId}/refunds`, {}, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Partial refund payment
   * POST /v1/payments/{id}/refunds
   */
  async partialRefundPayment(paymentId, amount) {
    const response = await this.client.post(`/v1/payments/${paymentId}/refunds`, { amount }, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Get refunds for a payment
   * GET /v1/payments/{id}/refunds
   */
  async getPaymentRefunds(paymentId) {
    const response = await this.client.get(`/v1/payments/${paymentId}/refunds`);
    return response.data;
  }

  // ============================================
  // PREFERENCES API - Checkout Pro
  // ============================================

  /**
   * Create checkout preference
   * POST /checkout/preferences
   */
  async createPreference(preferenceData) {
    const response = await this.client.post('/checkout/preferences', preferenceData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Get preference by ID
   * GET /checkout/preferences/{id}
   */
  async getPreference(preferenceId) {
    const response = await this.client.get(`/checkout/preferences/${preferenceId}`);
    return response.data;
  }

  /**
   * Search preferences
   * GET /checkout/preferences/search
   */
  async searchPreferences(params = {}) {
    const response = await this.client.get('/checkout/preferences/search', { params });
    return response.data;
  }

  /**
   * Update preference
   * PUT /checkout/preferences/{id}
   */
  async updatePreference(preferenceId, updateData) {
    const response = await this.client.put(`/checkout/preferences/${preferenceId}`, updateData);
    return response.data;
  }

  // ============================================
  // CUSTOMERS API
  // ============================================

  /**
   * Create customer
   * POST /v1/customers
   */
  async createCustomer(customerData) {
    const response = await this.client.post('/v1/customers', customerData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Get customer by ID
   * GET /v1/customers/{id}
   */
  async getCustomer(customerId) {
    const response = await this.client.get(`/v1/customers/${customerId}`);
    return response.data;
  }

  /**
   * Search customers
   * GET /v1/customers/search
   */
  async searchCustomers(params = {}) {
    const response = await this.client.get('/v1/customers/search', { params });
    return response.data;
  }

  /**
   * Update customer
   * PUT /v1/customers/{id}
   */
  async updateCustomer(customerId, updateData) {
    const response = await this.client.put(`/v1/customers/${customerId}`, updateData);
    return response.data;
  }

  /**
   * Delete customer
   * DELETE /v1/customers/{id}
   */
  async deleteCustomer(customerId) {
    const response = await this.client.delete(`/v1/customers/${customerId}`);
    return response.data;
  }

  // ============================================
  // CARDS API (Customer Cards)
  // ============================================

  /**
   * Create card for customer
   * POST /v1/customers/{customer_id}/cards
   */
  async createCard(customerId, cardData) {
    const response = await this.client.post(`/v1/customers/${customerId}/cards`, cardData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Get customer cards
   * GET /v1/customers/{customer_id}/cards
   */
  async getCustomerCards(customerId) {
    const response = await this.client.get(`/v1/customers/${customerId}/cards`);
    return response.data;
  }

  /**
   * Get specific card
   * GET /v1/customers/{customer_id}/cards/{card_id}
   */
  async getCard(customerId, cardId) {
    const response = await this.client.get(`/v1/customers/${customerId}/cards/${cardId}`);
    return response.data;
  }

  /**
   * Update card
   * PUT /v1/customers/{customer_id}/cards/{card_id}
   */
  async updateCard(customerId, cardId, updateData) {
    const response = await this.client.put(
      `/v1/customers/${customerId}/cards/${cardId}`,
      updateData
    );
    return response.data;
  }

  /**
   * Delete card
   * DELETE /v1/customers/{customer_id}/cards/{card_id}
   */
  async deleteCard(customerId, cardId) {
    const response = await this.client.delete(`/v1/customers/${customerId}/cards/${cardId}`);
    return response.data;
  }

  // ============================================
  // SUBSCRIPTIONS API (Preapproval)
  // ============================================

  /**
   * Create subscription plan
   * POST /preapproval_plan
   */
  async createSubscriptionPlan(planData) {
    const response = await this.client.post('/preapproval_plan', planData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Get subscription plan
   * GET /preapproval_plan/{id}
   */
  async getSubscriptionPlan(planId) {
    const response = await this.client.get(`/preapproval_plan/${planId}`);
    return response.data;
  }

  /**
   * Search subscription plans
   * GET /preapproval_plan/search
   */
  async searchSubscriptionPlans(params = {}) {
    const response = await this.client.get('/preapproval_plan/search', { params });
    return response.data;
  }

  /**
   * Update subscription plan
   * PUT /preapproval_plan/{id}
   */
  async updateSubscriptionPlan(planId, updateData) {
    const response = await this.client.put(`/preapproval_plan/${planId}`, updateData);
    return response.data;
  }

  /**
   * Create subscription (preapproval)
   * POST /preapproval
   */
  async createSubscription(subscriptionData) {
    const response = await this.client.post('/preapproval', subscriptionData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Get subscription
   * GET /preapproval/{id}
   */
  async getSubscription(subscriptionId) {
    const response = await this.client.get(`/preapproval/${subscriptionId}`);
    return response.data;
  }

  /**
   * Search subscriptions
   * GET /preapproval/search
   */
  async searchSubscriptions(params = {}) {
    const response = await this.client.get('/preapproval/search', { params });
    return response.data;
  }

  /**
   * Update subscription
   * PUT /preapproval/{id}
   */
  async updateSubscription(subscriptionId, updateData) {
    const response = await this.client.put(`/preapproval/${subscriptionId}`, updateData);
    return response.data;
  }

  /**
   * Cancel subscription
   * PUT /preapproval/{id} with status: cancelled
   */
  async cancelSubscription(subscriptionId) {
    const response = await this.client.put(`/preapproval/${subscriptionId}`, {
      status: 'cancelled',
    });
    return response.data;
  }

  /**
   * Pause subscription
   * PUT /preapproval/{id} with status: paused
   */
  async pauseSubscription(subscriptionId) {
    const response = await this.client.put(`/preapproval/${subscriptionId}`, {
      status: 'paused',
    });
    return response.data;
  }

  // ============================================
  // PAYMENT METHODS API
  // ============================================

  /**
   * Get payment methods
   * GET /v1/payment_methods
   */
  async getPaymentMethods() {
    const response = await this.client.get('/v1/payment_methods');
    return response.data;
  }

  /**
   * Get installments
   * GET /v1/payment_methods/installments
   */
  async getInstallments(params) {
    const response = await this.client.get('/v1/payment_methods/installments', { params });
    return response.data;
  }

  /**
   * Get card issuers
   * GET /v1/payment_methods/card_issuers
   */
  async getCardIssuers(params) {
    const response = await this.client.get('/v1/payment_methods/card_issuers', { params });
    return response.data;
  }

  // ============================================
  // IDENTIFICATION TYPES API
  // ============================================

  /**
   * Get identification types
   * GET /v1/identification_types
   */
  async getIdentificationTypes() {
    const response = await this.client.get('/v1/identification_types');
    return response.data;
  }

  // ============================================
  // MERCHANT ORDERS API
  // ============================================

  /**
   * Create merchant order
   * POST /merchant_orders
   */
  async createMerchantOrder(orderData) {
    const response = await this.client.post('/merchant_orders', orderData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Get merchant order
   * GET /merchant_orders/{id}
   */
  async getMerchantOrder(orderId) {
    const response = await this.client.get(`/merchant_orders/${orderId}`);
    return response.data;
  }

  /**
   * Search merchant orders
   * GET /merchant_orders/search
   */
  async searchMerchantOrders(params = {}) {
    const response = await this.client.get('/merchant_orders/search', { params });
    return response.data;
  }

  /**
   * Update merchant order
   * PUT /merchant_orders/{id}
   */
  async updateMerchantOrder(orderId, updateData) {
    const response = await this.client.put(`/merchant_orders/${orderId}`, updateData);
    return response.data;
  }

  // ============================================
  // POINT OF SALE (POS) API
  // ============================================

  /**
   * Create POS
   * POST /pos
   */
  async createPOS(posData) {
    const response = await this.client.post('/pos', posData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Get POS list
   * GET /pos
   */
  async getPOSList(params = {}) {
    const response = await this.client.get('/pos', { params });
    return response.data;
  }

  /**
   * Get POS
   * GET /pos/{id}
   */
  async getPOS(posId) {
    const response = await this.client.get(`/pos/${posId}`);
    return response.data;
  }

  /**
   * Update POS
   * PUT /pos/{id}
   */
  async updatePOS(posId, updateData) {
    const response = await this.client.put(`/pos/${posId}`, updateData);
    return response.data;
  }

  /**
   * Delete POS
   * DELETE /pos/{id}
   */
  async deletePOS(posId) {
    const response = await this.client.delete(`/pos/${posId}`);
    return response.data;
  }

  // ============================================
  // QR CODE API
  // ============================================

  /**
   * Create QR Code
   * POST /instore/orders/qr/seller/collectors/{user_id}/pos/{external_pos_id}/qrs
   */
  async createQRCode(userId, externalPosId, qrData) {
    const response = await this.client.post(
      `/instore/orders/qr/seller/collectors/${userId}/pos/${externalPosId}/qrs`,
      qrData,
      {
        headers: {
          'X-Idempotency-Key': generateIdempotencyKey(),
        },
      }
    );
    return response.data;
  }

  /**
   * Get QR Code order
   * GET /instore/qr/seller/collectors/{user_id}/pos/{external_pos_id}/orders
   */
  async getQRCodeOrder(userId, externalPosId) {
    const response = await this.client.get(
      `/instore/qr/seller/collectors/${userId}/pos/${externalPosId}/orders`
    );
    return response.data;
  }

  /**
   * Delete QR Code order
   * DELETE /instore/qr/seller/collectors/{user_id}/pos/{external_pos_id}/orders
   */
  async deleteQRCodeOrder(userId, externalPosId) {
    const response = await this.client.delete(
      `/instore/qr/seller/collectors/${userId}/pos/${externalPosId}/orders`
    );
    return response.data;
  }

  // ============================================
  // MONEY TRANSFER (PIX) API
  // ============================================

  /**
   * Create Pix payment
   * POST /v1/payments
   */
  async createPixPayment(paymentData) {
    const pixData = {
      ...paymentData,
      payment_method_id: 'pix',
    };
    const response = await this.client.post('/v1/payments', pixData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  // ============================================
  // DISBURSEMENTS API
  // ============================================

  /**
   * Create disbursement
   * POST /v1/disbursements
   */
  async createDisbursement(disbursementData) {
    const response = await this.client.post('/v1/disbursements', disbursementData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Get disbursement
   * GET /v1/disbursements/{id}
   */
  async getDisbursement(disbursementId) {
    const response = await this.client.get(`/v1/disbursements/${disbursementId}`);
    return response.data;
  }

  // ============================================
  // USER INFO API
  // ============================================

  /**
   * Get user info (myself)
   * GET /users/me
   */
  async getUserInfo() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  /**
   * Get user by ID
   * GET /users/{id}
   */
  async getUser(userId) {
    const response = await this.client.get(`/users/${userId}`);
    return response.data;
  }

  // ============================================
  // ACCOUNT BALANCE API
  // ============================================

  /**
   * Get account balance
   * GET /users/{user_id}/mercadopago_account/balance
   */
  async getAccountBalance(userId) {
    const response = await this.client.get(`/users/${userId}/mercadopago_account/balance`);
    return response.data;
  }

  // ============================================
  // CHARGEBACKS API
  // ============================================

  /**
   * Get chargebacks
   * GET /v1/chargebacks
   */
  async getChargebacks(params = {}) {
    const response = await this.client.get('/v1/chargebacks', { params });
    return response.data;
  }

  /**
   * Get chargeback by ID
   * GET /v1/chargebacks/{id}
   */
  async getChargeback(chargebackId) {
    const response = await this.client.get(`/v1/chargebacks/${chargebackId}`);
    return response.data;
  }

  // ============================================
  // REPORTS API
  // ============================================

  /**
   * Create report
   * POST /v1/account/settlement_report
   */
  async createSettlementReport(reportData) {
    const response = await this.client.post('/v1/account/settlement_report', reportData, {
      headers: {
        'X-Idempotency-Key': generateIdempotencyKey(),
      },
    });
    return response.data;
  }

  /**
   * Get report list
   * GET /v1/account/settlement_report/list
   */
  async getSettlementReports() {
    const response = await this.client.get('/v1/account/settlement_report/list');
    return response.data;
  }

  /**
   * Download report
   * GET /v1/account/settlement_report/{file_name}
   */
  async downloadSettlementReport(fileName) {
    const response = await this.client.get(`/v1/account/settlement_report/${fileName}`, {
      responseType: 'stream',
    });
    return response.data;
  }
}

// Factory function to create service with access token
const createMercadoPagoService = (accessToken) => {
  return new MercadoPagoService(accessToken);
};

// Default export
module.exports = {
  MercadoPagoService,
  createMercadoPagoService,
  generateIdempotencyKey,
};
