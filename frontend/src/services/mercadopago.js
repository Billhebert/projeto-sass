/**
 * Mercado Pago API Service
 * Frontend service for MP API endpoints
 */

import api from './api'

// ============================================
// MP ORDERS API
// ============================================
export const mpOrdersAPI = {
  // List/search orders
  list: (params) => api.get('/mp/orders', { params }),
  
  // Create order
  create: (data) => api.post('/mp/orders', data),
  
  // Get order by ID
  get: (orderId) => api.get(`/mp/orders/${orderId}`),
  
  // Capture order
  capture: (orderId) => api.post(`/mp/orders/${orderId}/capture`),
  
  // Cancel order
  cancel: (orderId) => api.post(`/mp/orders/${orderId}/cancel`),
  
  // Refund order
  refund: (orderId, data) => api.post(`/mp/orders/${orderId}/refund`, data),
  
  // Process order
  process: (orderId) => api.post(`/mp/orders/${orderId}/process`),
  
  // Add transaction
  addTransaction: (orderId, data) => api.post(`/mp/orders/${orderId}/transactions`, data),
  
  // Update transaction
  updateTransaction: (orderId, transactionId, data) => 
    api.put(`/mp/orders/${orderId}/transactions/${transactionId}`, data),
  
  // Delete transaction
  deleteTransaction: (orderId, transactionId) => 
    api.delete(`/mp/orders/${orderId}/transactions/${transactionId}`),
}

// ============================================
// MP PAYMENTS API
// ============================================
export const mpPaymentsAPI = {
  // Search payments
  search: (params) => api.get('/mp/payments', { params }),
  
  // Create payment
  create: (data) => api.post('/mp/payments', data),
  
  // Create Pix payment
  createPix: (data) => api.post('/mp/payments/pix', data),
  
  // Get payment by ID
  get: (paymentId) => api.get(`/mp/payments/${paymentId}`),
  
  // Update payment
  update: (paymentId, data) => api.put(`/mp/payments/${paymentId}`, data),
  
  // Refund payment
  refund: (paymentId, amount) => api.post(`/mp/payments/${paymentId}/refund`, { amount }),
  
  // Get refunds
  getRefunds: (paymentId) => api.get(`/mp/payments/${paymentId}/refunds`),
  
  // Get payment methods
  getMethods: () => api.get('/mp/payments/methods/list'),
  
  // Get installments
  getInstallments: (params) => api.get('/mp/payments/installments/calculate', { params }),
  
  // Get card issuers
  getCardIssuers: (paymentMethodId) => 
    api.get('/mp/payments/card-issuers/list', { params: { payment_method_id: paymentMethodId } }),
  
  // Get identification types
  getIdentificationTypes: () => api.get('/mp/payments/identification-types/list'),
  
  // Get stats
  getStats: (params) => api.get('/mp/payments/stats/summary', { params }),
  
  // Search local payments
  searchLocal: (params) => api.get('/mp/payments/local/search', { params }),
}

// ============================================
// MP PREFERENCES API (Checkout Pro)
// ============================================
export const mpPreferencesAPI = {
  // Search preferences
  search: (params) => api.get('/mp/preferences', { params }),
  
  // Create preference
  create: (data) => api.post('/mp/preferences', data),
  
  // Create product preference (simplified)
  createProduct: (data) => api.post('/mp/preferences/product', data),
  
  // Create cart preference (multiple items)
  createCart: (data) => api.post('/mp/preferences/cart', data),
  
  // Get preference by ID
  get: (preferenceId) => api.get(`/mp/preferences/${preferenceId}`),
  
  // Update preference
  update: (preferenceId, data) => api.put(`/mp/preferences/${preferenceId}`, data),
  
  // Search local preferences
  searchLocal: (params) => api.get('/mp/preferences/local/search', { params }),
}

// ============================================
// MP CUSTOMERS API
// ============================================
export const mpCustomersAPI = {
  // Search customers
  search: (params) => api.get('/mp/customers', { params }),
  
  // Create customer
  create: (data) => api.post('/mp/customers', data),
  
  // Get customer by ID
  get: (customerId) => api.get(`/mp/customers/${customerId}`),
  
  // Update customer
  update: (customerId, data) => api.put(`/mp/customers/${customerId}`, data),
  
  // Delete customer
  delete: (customerId) => api.delete(`/mp/customers/${customerId}`),
  
  // Get customer cards
  getCards: (customerId) => api.get(`/mp/customers/${customerId}/cards`),
  
  // Add card
  addCard: (customerId, data) => api.post(`/mp/customers/${customerId}/cards`, data),
  
  // Get specific card
  getCard: (customerId, cardId) => api.get(`/mp/customers/${customerId}/cards/${cardId}`),
  
  // Update card
  updateCard: (customerId, cardId, data) => 
    api.put(`/mp/customers/${customerId}/cards/${cardId}`, data),
  
  // Delete card
  deleteCard: (customerId, cardId) => 
    api.delete(`/mp/customers/${customerId}/cards/${cardId}`),
  
  // Search local customers
  searchLocal: (params) => api.get('/mp/customers/local/search', { params }),
}

// ============================================
// MP SUBSCRIPTIONS API
// ============================================
export const mpSubscriptionsAPI = {
  // Search subscription plans
  searchPlans: (params) => api.get('/mp/subscriptions/plans', { params }),
  
  // Create subscription plan
  createPlan: (data) => api.post('/mp/subscriptions/plans', data),
  
  // Get subscription plan
  getPlan: (planId) => api.get(`/mp/subscriptions/plans/${planId}`),
  
  // Update subscription plan
  updatePlan: (planId, data) => api.put(`/mp/subscriptions/plans/${planId}`, data),
  
  // Search subscriptions
  search: (params) => api.get('/mp/subscriptions', { params }),
  
  // Create subscription
  create: (data) => api.post('/mp/subscriptions', data),
  
  // Get subscription by ID
  get: (subscriptionId) => api.get(`/mp/subscriptions/${subscriptionId}`),
  
  // Update subscription
  update: (subscriptionId, data) => api.put(`/mp/subscriptions/${subscriptionId}`, data),
  
  // Pause subscription
  pause: (subscriptionId) => api.post(`/mp/subscriptions/${subscriptionId}/pause`),
  
  // Cancel subscription
  cancel: (subscriptionId) => api.post(`/mp/subscriptions/${subscriptionId}/cancel`),
  
  // Reactivate subscription
  reactivate: (subscriptionId) => api.post(`/mp/subscriptions/${subscriptionId}/reactivate`),
  
  // Get stats
  getStats: () => api.get('/mp/subscriptions/stats/summary'),
  
  // Get active subscriptions
  getActive: () => api.get('/mp/subscriptions/local/active'),
  
  // Get due subscriptions
  getDue: (daysAhead) => api.get('/mp/subscriptions/local/due', { params: { daysAhead } }),
  
  // Search local subscriptions
  searchLocal: (params) => api.get('/mp/subscriptions/local/search', { params }),
}

// ============================================
// MP ACCOUNT API
// ============================================
export const mpAccountAPI = {
  // Get user info
  getMe: () => api.get('/mp/account/me'),
  
  // Get account balance
  getBalance: () => api.get('/mp/account/balance'),
  
  // Get chargebacks
  getChargebacks: (params) => api.get('/mp/account/chargebacks', { params }),
  
  // Get chargeback by ID
  getChargeback: (chargebackId) => api.get(`/mp/account/chargebacks/${chargebackId}`),
  
  // Get settlement reports
  getReports: () => api.get('/mp/account/reports'),
  
  // Create settlement report
  createReport: (data) => api.post('/mp/account/reports', data),
  
  // Download report
  downloadReport: (fileName) => api.get(`/mp/account/reports/${fileName}`, { responseType: 'blob' }),
  
  // Search merchant orders
  searchMerchantOrders: (params) => api.get('/mp/account/merchant-orders', { params }),
  
  // Create merchant order
  createMerchantOrder: (data) => api.post('/mp/account/merchant-orders', data),
  
  // Get merchant order
  getMerchantOrder: (orderId) => api.get(`/mp/account/merchant-orders/${orderId}`),
  
  // Update merchant order
  updateMerchantOrder: (orderId, data) => api.put(`/mp/account/merchant-orders/${orderId}`, data),
  
  // Get POS list
  getPOSList: () => api.get('/mp/account/pos'),
  
  // Create POS
  createPOS: (data) => api.post('/mp/account/pos', data),
  
  // Get POS
  getPOS: (posId) => api.get(`/mp/account/pos/${posId}`),
  
  // Update POS
  updatePOS: (posId, data) => api.put(`/mp/account/pos/${posId}`, data),
  
  // Delete POS
  deletePOS: (posId) => api.delete(`/mp/account/pos/${posId}`),
  
  // Create QR Code
  createQR: (posId, data) => api.post(`/mp/account/qr/${posId}`, data),
  
  // Get QR order
  getQROrder: (posId) => api.get(`/mp/account/qr/${posId}/order`),
  
  // Delete QR order
  deleteQROrder: (posId) => api.delete(`/mp/account/qr/${posId}/order`),
}

// ============================================
// MP WEBHOOKS API
// ============================================
export const mpWebhooksAPI = {
  // Get webhook logs
  getLogs: (params) => api.get('/mp/webhooks/logs', { params }),
  
  // Test webhook
  test: (data) => api.post('/mp/webhooks/test', data),
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format currency for display
 */
export const formatMPCurrency = (amount, currency = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Get status color for MP payment status
 */
export const getMPStatusColor = (status) => {
  const colors = {
    pending: '#ffc107',
    approved: '#28a745',
    authorized: '#17a2b8',
    in_process: '#6c757d',
    in_mediation: '#fd7e14',
    rejected: '#dc3545',
    cancelled: '#6c757d',
    refunded: '#6f42c1',
    charged_back: '#dc3545',
  }
  return colors[status] || '#6c757d'
}

/**
 * Get status label for MP payment status
 */
export const getMPStatusLabel = (status) => {
  const labels = {
    pending: 'Pendente',
    approved: 'Aprovado',
    authorized: 'Autorizado',
    in_process: 'Em Processamento',
    in_mediation: 'Em Mediacao',
    rejected: 'Rejeitado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
    charged_back: 'Estornado',
  }
  return labels[status] || status
}

/**
 * Get payment type label
 */
export const getMPPaymentTypeLabel = (type) => {
  const labels = {
    credit_card: 'Cartao de Credito',
    debit_card: 'Cartao de Debito',
    ticket: 'Boleto',
    bank_transfer: 'Transferencia',
    atm: 'ATM',
    account_money: 'Saldo MP',
    pix: 'Pix',
  }
  return labels[type] || type
}

export default {
  orders: mpOrdersAPI,
  payments: mpPaymentsAPI,
  preferences: mpPreferencesAPI,
  customers: mpCustomersAPI,
  subscriptions: mpSubscriptionsAPI,
  account: mpAccountAPI,
  webhooks: mpWebhooksAPI,
  formatCurrency: formatMPCurrency,
  getStatusColor: getMPStatusColor,
  getStatusLabel: getMPStatusLabel,
  getPaymentTypeLabel: getMPPaymentTypeLabel,
}
