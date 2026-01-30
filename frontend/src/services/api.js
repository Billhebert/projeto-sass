import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3011/api',
  timeout: 10000,
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only logout for 401 errors that are NOT related to ML token refresh
    // ML token refresh failures should show an error, not logout the user
    const isMLTokenRefresh = error.config?.url?.includes('/refresh-token')
    
    if (error.response?.status === 401 && !isMLTokenRefresh) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ============================================
// USERS ENDPOINTS
// ============================================
export const usersAPI = {
  getMe: () => api.get('/users/me'),
  getUserById: (id) => api.get(`/users/${id}`),
  getAddresses: (userId) => api.get(`/users/${userId}/addresses`),
  addAddress: (userId, data) => api.post(`/users/${userId}/addresses`, data),
  updateProfile: (userId, data) => api.put(`/users/${userId}`, data),
}

// ============================================
// ITEMS & PUBLICATIONS ENDPOINTS
// ============================================
export const itemsAPI = {
  createItem: (data) => api.post('/items-publications', data),
  getItem: (itemId) => api.get(`/items-publications/${itemId}`),
  getItems: (params) => api.get('/items-publications', { params }),
  updateItem: (itemId, data) => api.put(`/items-publications/${itemId}`, data),
  deleteItem: (itemId) => api.delete(`/items-publications/${itemId}`),
  getItemDescription: (itemId) => api.get(`/items-publications/${itemId}/description`),
  updateItemDescription: (itemId, data) => api.post(`/items-publications/${itemId}/description`, data),
  publishItem: (itemId) => api.post(`/items-publications/${itemId}/publish`, {}),
  unpublishItem: (itemId) => api.post(`/items-publications/${itemId}/unpublish`, {}),
}

// ============================================
// SEARCH & BROWSE ENDPOINTS
// ============================================
export const searchAPI = {
  search: (siteId, params) => api.get(`/search-browse/sites/${siteId}/search`, { params }),
  getCategory: (categoryId) => api.get(`/search-browse/categories/${categoryId}`),
  getCategories: (siteId, params) => api.get(`/search-browse/sites/${siteId}/categories`, { params }),
  searchAdvanced: (params) => api.get('/search-browse/advanced', { params }),
}

// ============================================
// ORDERS & SALES ENDPOINTS
// ============================================
export const ordersAPI = {
  searchOrders: (params) => api.get('/orders-sales', { params }),
  listOrders: (params) => api.get('/orders-sales', { params }),
  getOrder: (orderId) => api.get(`/orders-sales/orders/${orderId}`),
  updateOrder: (orderId, data) => api.put(`/orders-sales/orders/${orderId}`, data),
  getPack: (packId) => api.get(`/orders-sales/packs/${packId}`),
  createPack: (data) => api.post('/orders-sales/packs', data),
  getOrderTimeline: (orderId) => api.get(`/orders-sales/orders/${orderId}/timeline`),
}

// ============================================
// SHIPPING ENDPOINTS
// ============================================
export const shippingAPI = {
  listShipments: (params) => api.get('/shipping-ml', { params }),
  getShipment: (shipmentId) => api.get(`/shipping-ml/${shipmentId}`),
  updateShipment: (shipmentId, data) => api.put(`/shipping-ml/${shipmentId}`, data),
  createShipment: (data) => api.post('/shipping-ml', data),
  generateLabel: (shipmentId) => api.get(`/shipping-ml/${shipmentId}/label`),
  getShippingOptions: (params) => api.get('/shipping-ml/options', { params }),
}

// ============================================
// QUESTIONS & ANSWERS ENDPOINTS
// ============================================
export const questionsAPI = {
  listQuestions: (params) => api.get('/questions-answers', { params }),
  getItemQuestions: (itemId, params) => api.get(`/questions-answers/items/${itemId}/questions`, { params }),
  createQuestion: (data) => api.post('/questions-answers/questions', data),
  answerQuestion: (questionId, data) => api.put(`/questions-answers/questions/${questionId}`, data),
  deleteQuestion: (questionId) => api.delete(`/questions-answers/questions/${questionId}`),
  listMyQuestions: (params) => api.get('/questions-answers/my-questions', { params }),
}

// ============================================
// FEEDBACK & REVIEWS ENDPOINTS
// ============================================
export const feedbackAPI = {
  listFeedback: (params) => api.get('/feedback-reviews', { params }),
  getItemReviews: (itemId, params) => api.get(`/feedback-reviews/items/${itemId}/reviews`, { params }),
  createFeedback: (data) => api.post('/feedback-reviews/feedback', data),
  getUserReviews: (userId) => api.get(`/feedback-reviews/users/${userId}/reviews`),
  getUserReputation: (userId) => api.get(`/feedback-reviews/users/${userId}/reputation`),
  listMyFeedback: (params) => api.get('/feedback-reviews/my-feedback', { params }),
}

// ============================================
// CATEGORIES & ATTRIBUTES ENDPOINTS
// ============================================
export const categoriesAPI = {
  listCategories: (params) => api.get('/categories-attributes', { params }),
  getCategoryAttributes: (categoryId) => api.get(`/categories-attributes/${categoryId}/attributes`),
  getDomain: (domainId) => api.get(`/categories-attributes/domains/${domainId}`),
  getListingTypes: (siteId) => api.get(`/categories-attributes/sites/${siteId}/listing_types`),
  clearCache: () => api.post('/categories-attributes/cache/clear', {}),
  getCacheStats: () => api.get('/categories-attributes/cache/stats'),
}

// ============================================
// PAYMENTS ENDPOINTS
// ============================================
export const paymentsAPI = {
  getPaymentMethods: () => api.get('/payments/methods'),
  getPaymentDetails: (paymentId) => api.get(`/payments/${paymentId}`),
  processPayment: (data) => api.post('/payments/process', data),
  getPaymentHistory: (params) => api.get('/payments/history', { params }),
  getPaymentStats: (params) => api.get('/payments/stats', { params }),
}

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================
export const notificationsAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`, {}),
  markAllAsRead: () => api.put('/notifications/mark-all-read', {}),
  deleteNotification: (notificationId) => api.delete(`/notifications/${notificationId}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
}

// ============================================
// PROMOTIONS ENDPOINTS
// ============================================
export const promotionsAPI = {
  getPromotions: (params) => api.get('/promotions', { params }),
  getPromotion: (promoId) => api.get(`/promotions/${promoId}`),
  createPromotion: (data) => api.post('/promotions', data),
  updatePromotion: (promoId, data) => api.put(`/promotions/${promoId}`, data),
  deletePromotion: (promoId) => api.delete(`/promotions/${promoId}`),
  activatePromotion: (promoId) => api.post(`/promotions/${promoId}/activate`, {}),
  deactivatePromotion: (promoId) => api.post(`/promotions/${promoId}/deactivate`, {}),
}

// ============================================
// ANALYTICS ENDPOINTS
// ============================================
export const analyticsAPI = {
  getSalesSummary: (params) => api.get('/analytics/sales-summary', { params }),
  getTopProducts: (params) => api.get('/analytics/top-products', { params }),
  getVisitorStats: (params) => api.get('/analytics/visitors', { params }),
  getSalesChart: (params) => api.get('/analytics/sales-chart', { params }),
  getRevenueChart: (params) => api.get('/analytics/revenue-chart', { params }),
}

// ============================================
// CATALOG ENDPOINTS
// ============================================
export const catalogAPI = {
  getCatalogItems: (params) => api.get('/catalog', { params }),
  getCatalogItem: (catalogId) => api.get(`/catalog/${catalogId}`),
  createCatalogItem: (data) => api.post('/catalog', data),
  updateCatalogItem: (catalogId, data) => api.put(`/catalog/${catalogId}`, data),
  deleteCatalogItem: (catalogId) => api.delete(`/catalog/${catalogId}`),
  searchCatalog: (params) => api.get('/catalog/search', { params }),
}

// ============================================
// MARKETING ENDPOINTS
// ============================================
export const marketingAPI = {
  getCampaigns: (params) => api.get('/marketing/campaigns', { params }),
  createCampaign: (data) => api.post('/marketing/campaigns', data),
  updateCampaign: (campaignId, data) => api.put(`/marketing/campaigns/${campaignId}`, data),
  deleteCampaign: (campaignId) => api.delete(`/marketing/campaigns/${campaignId}`),
  getCampaignMetrics: (campaignId) => api.get(`/marketing/campaigns/${campaignId}/metrics`),
}

// ============================================
// INVENTORY ENDPOINTS
// ============================================
export const inventoryAPI = {
  getInventory: (params) => api.get('/inventory', { params }),
  updateStock: (itemId, quantity) => api.put(`/inventory/${itemId}`, { quantity }),
  getStockLevels: () => api.get('/inventory/levels'),
  getLowStockAlerts: () => api.get('/inventory/alerts'),
  bulkUpdateStock: (data) => api.post('/inventory/bulk-update', data),
}

// ============================================
// RETURNS & REFUNDS ENDPOINTS
// ============================================
export const returnsAPI = {
  getReturns: (params) => api.get('/returns', { params }),
  createReturn: (data) => api.post('/returns', data),
  updateReturn: (returnId, data) => api.put(`/returns/${returnId}`, data),
  approveReturn: (returnId) => api.post(`/returns/${returnId}/approve`, {}),
  rejectReturn: (returnId) => api.post(`/returns/${returnId}/reject`, {}),
}

// ============================================
// SELLER SETTINGS ENDPOINTS
// ============================================
export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  getBusinessProfile: () => api.get('/settings/business-profile'),
  updateBusinessProfile: (data) => api.put('/settings/business-profile', data),
  getStoreLayout: () => api.get('/settings/store-layout'),
  updateStoreLayout: (data) => api.put('/settings/store-layout', data),
}

// ============================================
// MERCADO LIBRE ACCOUNT ENDPOINTS
// ============================================
export const mlAccountAPI = {
  linkAccount: (data) => api.post('/ml-account/link', data),
  unlinkAccount: () => api.post('/ml-account/unlink', {}),
  getAccountStatus: () => api.get('/ml-account/status'),
  refreshToken: () => api.post('/ml-account/refresh-token', {}),
  getAccountInfo: () => api.get('/ml-account/info'),
  getSites: () => api.get('/ml-account/sites'),
}

// ============================================
// DASHBOARD ENDPOINTS
// ============================================
export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
  getMetrics: (params) => api.get('/dashboard/metrics', { params }),
  getRecentOrders: (limit = 10) => api.get(`/dashboard/recent-orders?limit=${limit}`),
  getTopSellingProducts: (limit = 10) => api.get(`/dashboard/top-products?limit=${limit}`),
  getPerformanceMetrics: (params) => api.get('/dashboard/performance', { params }),
}

// ============================================
// BULK OPERATIONS ENDPOINTS
// ============================================
export const bulkAPI = {
  bulkPublish: (data) => api.post('/bulk/publish', data),
  bulkUnpublish: (data) => api.post('/bulk/unpublish', data),
  bulkUpdatePrice: (data) => api.post('/bulk/update-price', data),
  bulkUpdateStock: (data) => api.post('/bulk/update-stock', data),
  bulkDelete: (data) => api.post('/bulk/delete', data),
  getBulkJobStatus: (jobId) => api.get(`/bulk/status/${jobId}`),
}

// ============================================
// EXPORT/IMPORT ENDPOINTS
// ============================================
export const importExportAPI = {
  exportItems: (params) => api.get('/export/items', { params, responseType: 'blob' }),
  exportOrders: (params) => api.get('/export/orders', { params, responseType: 'blob' }),
  exportReports: (params) => api.get('/export/reports', { params, responseType: 'blob' }),
  importItems: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/import/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getImportStatus: (jobId) => api.get(`/import/status/${jobId}`),
}

// ============================================
// REPORTS ENDPOINTS
// ============================================
export const reportsAPI = {
  getSalesReport: (params) => api.get('/reports/sales', { params }),
  getFinancialReport: (params) => api.get('/reports/financial', { params }),
  getInventoryReport: (params) => api.get('/reports/inventory', { params }),
  getPerformanceReport: (params) => api.get('/reports/performance', { params }),
  generateReport: (type, params) => api.post(`/reports/${type}/generate`, params),
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generic GET request handler
 */
export const apiGet = (endpoint, params = {}) => {
  return api.get(endpoint, { params })
}

/**
 * Generic POST request handler
 */
export const apiPost = (endpoint, data = {}) => {
  return api.post(endpoint, data)
}

/**
 * Generic PUT request handler
 */
export const apiPut = (endpoint, data = {}) => {
  return api.put(endpoint, data)
}

/**
 * Generic DELETE request handler
 */
export const apiDelete = (endpoint) => {
  return api.delete(endpoint)
}

/**
 * Handle API errors with user-friendly messages
 */
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.message || error.response.statusText,
      status: error.response.status,
      data: error.response.data
    }
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: 'Erro de conexão. Por favor, verifique sua internet.',
      status: null,
      data: null
    }
  } else {
    // Error in request setup
    return {
      message: error.message || 'Erro desconhecido',
      status: null,
      data: null
    }
  }
}

/**
 * Format API response data
 */
export const formatResponse = (response) => {
  return response.data
}

export default api
