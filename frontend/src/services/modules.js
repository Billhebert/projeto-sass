/**
 * API Services for new modules
 * Billing, Reviews, Moderations, Inventory, Packs
 */

import api from './api'

// ===========================
// BILLING SERVICE
// ===========================
export const billingService = {
  // Get billing periods
  getPeriods: (accountId, limit = 12) => 
    api.get(`/billing/${accountId}/periods`, { params: { limit } }),
  
  // Get period details
  getPeriod: (accountId, periodId) => 
    api.get(`/billing/${accountId}/period/${periodId}`),
  
  // Get current balance
  getBalance: (accountId) => 
    api.get(`/billing/${accountId}/balance`),
  
  // Get settlements
  getSettlements: (accountId, params = {}) => 
    api.get(`/billing/${accountId}/settlements`, { params }),
  
  // Get settlement details
  getSettlementDetails: (accountId, orderId) => 
    api.get(`/billing/${accountId}/settlement/${orderId}`),
  
  // Get fee summary
  getFees: (accountId, params = {}) => 
    api.get(`/billing/${accountId}/fees`, { params }),
  
  // Generate report
  getReport: (accountId, type, params = {}) => 
    api.get(`/billing/${accountId}/report/${type}`, { params }),
  
  // Get daily summary
  getDailySummary: (accountId, days = 30) => 
    api.get(`/billing/${accountId}/daily-summary`, { params: { days } }),
}

// ===========================
// REVIEWS SERVICE
// ===========================
export const reviewsService = {
  // Get item reviews
  getItemReviews: (accountId, itemId, params = {}) => 
    api.get(`/reviews/${accountId}/item/${itemId}`, { params }),
  
  // Get item ratings summary
  getItemSummary: (accountId, itemId) => 
    api.get(`/reviews/${accountId}/item/${itemId}/summary`),
  
  // Get all reviews
  getAllReviews: (accountId, limit = 50) => 
    api.get(`/reviews/${accountId}/all`, { params: { limit } }),
  
  // Reply to review
  replyToReview: (accountId, reviewId, text) => 
    api.post(`/reviews/${accountId}/reply/${reviewId}`, { text }),
  
  // Get pending reviews
  getPendingReviews: (accountId) => 
    api.get(`/reviews/${accountId}/pending`),
  
  // Get review statistics
  getStats: (accountId) => 
    api.get(`/reviews/${accountId}/stats`),
  
  // Get negative reviews
  getNegativeReviews: (accountId) => 
    api.get(`/reviews/${accountId}/negative`),
}

// ===========================
// MODERATIONS SERVICE
// ===========================
export const moderationsService = {
  // List items under moderation
  getAll: (accountId, params = {}) => 
    api.get(`/moderations/${accountId}`, { params }),
  
  // Get item health
  getHealth: (accountId, itemId) => 
    api.get(`/moderations/${accountId}/health/${itemId}`),
  
  // Get item issues
  getIssues: (accountId, itemId) => 
    api.get(`/moderations/${accountId}/issues/${itemId}`),
  
  // Get required actions
  getActions: (accountId, itemId) => 
    api.get(`/moderations/${accountId}/actions/${itemId}`),
  
  // Fix item issues
  fixIssues: (accountId, itemId, fixes) => 
    api.post(`/moderations/${accountId}/fix/${itemId}`, { fixes }),
  
  // Get seller reputation
  getSellerReputation: (accountId) => 
    api.get(`/moderations/${accountId}/seller-reputation`),
}

// ===========================
// INVENTORY SERVICE
// ===========================
export const inventoryService = {
  // List products
  getAll: (accountId, params = {}) => 
    api.get(`/user-products/${accountId}`, { params }),
  
  // Get product details
  getProduct: (accountId, productId) => 
    api.get(`/user-products/${accountId}/product/${productId}`),
  
  // Get inventory details
  getInventory: (accountId, itemId) => 
    api.get(`/user-products/${accountId}/inventory/${itemId}`),
  
  // Update inventory
  updateInventory: (accountId, itemId, data) => 
    api.put(`/user-products/${accountId}/inventory/${itemId}`, data),
  
  // Get warehouses
  getWarehouses: (accountId) => 
    api.get(`/user-products/${accountId}/warehouses`),
  
  // Get fulfillment info
  getFulfillment: (accountId, itemId) => 
    api.get(`/user-products/${accountId}/fulfillment/${itemId}`),
  
  // Opt-in to fulfillment
  optInFulfillment: (accountId, itemId) => 
    api.post(`/user-products/${accountId}/fulfillment/${itemId}`),
  
  // Opt-out from fulfillment
  optOutFulfillment: (accountId, itemId) => 
    api.delete(`/user-products/${accountId}/fulfillment/${itemId}`),
  
  // Get stock locations
  getStockLocations: (accountId, itemId) => 
    api.get(`/user-products/${accountId}/stock-locations/${itemId}`),
  
  // Get low stock items
  getLowStock: (accountId, threshold = 5) => 
    api.get(`/user-products/${accountId}/low-stock`, { params: { threshold } }),
}

// ===========================
// PACKS SERVICE
// ===========================
export const packsService = {
  // List packs
  getAll: (accountId, params = {}) => 
    api.get(`/packs/${accountId}`, { params }),
  
  // Get pack details
  getPack: (accountId, packId) => 
    api.get(`/packs/${accountId}/${packId}`),
  
  // Get pack orders
  getPackOrders: (accountId, packId) => 
    api.get(`/packs/${accountId}/${packId}/orders`),
  
  // Get pack shipment
  getPackShipment: (accountId, packId) => 
    api.get(`/packs/${accountId}/${packId}/shipment`),
}

export default {
  billing: billingService,
  reviews: reviewsService,
  moderations: moderationsService,
  inventory: inventoryService,
  packs: packsService,
}
