import axios from "axios";
import { cacheService } from "./cache";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 10000,
  withCredentials: true, // Enable CORS with credentials
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only logout for 401 errors from JWT authentication
    // ML token errors now use 400 status code to avoid triggering logout
    if (error.response?.status === 401) {
      // Check if it's a JWT auth error (not ML token error)
      const errorCode = error.response?.data?.code || "";
      const isMLTokenError = errorCode.startsWith("ML_");

      if (
        !isMLTokenError &&
        error.response?.data?.message !== "User not found or inactive"
      ) {
        // JWT token expired or invalid - logout
        console.warn("JWT auth error, logging out:", error.response?.data);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Only redirect if not already on login page
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
    }

    // Log ML token errors for debugging
    if (error.response?.data?.code?.startsWith("ML_")) {
      console.warn("ML Token Error:", error.response.data);
    }

    return Promise.reject(error);
  },
);

/**
 * Helper function to make cached GET requests
 * @param {string} endpoint - API endpoint
 * @param {object} config - Axios config (params, headers, etc)
 * @param {number} cacheTTL - Cache time-to-live in milliseconds (default 5 minutes)
 */
export const apiGet = async (
  endpoint,
  config = {},
  cacheTTL = 5 * 60 * 1000,
) => {
  const { params = {} } = config;

  // Check cache for GET requests
  const cached = cacheService.get(endpoint, params, cacheTTL);
  if (cached) {
    return { ...cached, _cached: true };
  }

  // If not cached, fetch from API
  const response = await api.get(endpoint, config);

  // Cache the response
  if (response.status === 200) {
    cacheService.set(endpoint, params, response, cacheTTL);
  }

  return response;
};

/**
 * Helper function for POST/PUT/DELETE (invalidates cache)
 */
export const apiPost = async (endpoint, data, config = {}) => {
  const response = await api.post(endpoint, data, config);
  // Invalidate related caches
  cacheService.invalidate(endpoint.split("/")[0]);
  return response;
};

export const apiPut = async (endpoint, data, config = {}) => {
  const response = await api.put(endpoint, data, config);
  // Invalidate related caches
  const basePath = endpoint.split("/").slice(0, 2).join("/");
  cacheService.invalidate(basePath);
  return response;
};

export const apiDelete = async (endpoint, config = {}) => {
  const response = await api.delete(endpoint, config);
  // Invalidate related caches
  const basePath = endpoint.split("/").slice(0, 2).join("/");
  cacheService.invalidate(basePath);
  return response;
};

// ============================================
// USERS ENDPOINTS
// ============================================
export const usersAPI = {
  getMe: () => api.get("/users/me"),
  getUserById: (id) => api.get(`/users/${id}`),
  getAddresses: (userId) => api.get(`/users/${userId}/addresses`),
  addAddress: (userId, data) => api.post(`/users/${userId}/addresses`, data),
  updateProfile: (userId, data) => api.put(`/users/${userId}`, data),
};

// ============================================
// ITEMS & PUBLICATIONS ENDPOINTS
// ============================================
export const itemsAPI = {
  getItems: (accountId, params) => api.get(`/items/${accountId}`, { params }),
  getItem: (accountId, itemId) => api.get(`/items/${accountId}/${itemId}`),
  createItem: (accountId, data) => api.post(`/items/${accountId}`, data),
  updateItem: (accountId, itemId, data) =>
    api.put(`/items/${accountId}/${itemId}`, data),
  deleteItem: (accountId, itemId) =>
    api.delete(`/items/${accountId}/${itemId}`),
  updateItemStatus: (accountId, itemId, status) =>
    api.put(`/items/${accountId}/${itemId}/status`, { status }),
  getItemDescription: (accountId, itemId) =>
    api.get(`/items/${accountId}/${itemId}/description`),
  updateItemDescription: (accountId, itemId, data) =>
    api.put(`/items/${accountId}/${itemId}/description`, data),
  syncItems: (accountId) => api.post(`/items/${accountId}/sync`),
};

// ============================================
// SEARCH & BROWSE ENDPOINTS
// ============================================
export const searchAPI = {
  search: (siteId, params) =>
    api.get(`/search-browse/sites/${siteId}/search`, { params }),
  getCategory: (categoryId) =>
    api.get(`/search-browse/categories/${categoryId}`),
  getCategories: (siteId, params) =>
    api.get(`/search-browse/sites/${siteId}/categories`, { params }),
  searchAdvanced: (params) => api.get("/search-browse/advanced", { params }),
};

// ============================================
// ORDERS & SALES ENDPOINTS
// ============================================
export const ordersAPI = {
  getOrders: (accountId, params) => api.get(`/orders/${accountId}`, { params }),
  getOrder: (accountId, orderId) => api.get(`/orders/${accountId}/${orderId}`),
  getOrderStats: (accountId) => api.get(`/orders/${accountId}/stats`),
  syncOrders: (accountId) => api.post(`/orders/${accountId}/sync`),
};

// ============================================
// SHIPPING ENDPOINTS
// ============================================
export const shippingAPI = {
  getShipments: (accountId, params) =>
    api.get(`/shipping/${accountId}`, { params }),
  getShipment: (accountId, shipmentId) =>
    api.get(`/shipping/${accountId}/${shipmentId}`),
  getShipmentStats: (accountId) => api.get(`/shipping/${accountId}/stats`),
  syncShipments: (accountId) => api.post(`/shipping/${accountId}/sync`),
  generateLabel: (accountId, shipmentId) =>
    api.get(`/shipping/${accountId}/${shipmentId}/label`),
};

// ============================================
// QUESTIONS & ANSWERS ENDPOINTS
// ============================================
export const questionsAPI = {
  getQuestions: (accountId, params) =>
    api.get(`/questions/${accountId}`, { params }),
  getQuestion: (accountId, questionId) =>
    api.get(`/questions/${accountId}/${questionId}`),
  answerQuestion: (accountId, questionId, data) =>
    api.post(`/questions/${accountId}/${questionId}/answer`, data),
  getQuestionStats: (accountId) => api.get(`/questions/${accountId}/stats`),
  syncQuestions: (accountId) => api.post(`/questions/${accountId}/sync`),
};

// ============================================
// FEEDBACK & REVIEWS ENDPOINTS
// ============================================
export const feedbackAPI = {
  getFeedback: (accountId, params) =>
    api.get(`/feedback/${accountId}`, { params }),
  getFeedbackStats: (accountId) => api.get(`/feedback/${accountId}/stats`),
  syncFeedback: (accountId) => api.post(`/feedback/${accountId}/sync`),
  replyFeedback: (accountId, feedbackId, data) =>
    api.post(`/feedback/${accountId}/${feedbackId}/reply`, data),
};

// ============================================
// CATEGORIES & ATTRIBUTES ENDPOINTS
// ============================================
export const categoriesAPI = {
  getCategories: (siteId = "MLB") => api.get(`/categories/sites/${siteId}`),
  getCategory: (categoryId) => api.get(`/categories/${categoryId}`),
  getCategoryAttributes: (categoryId) =>
    api.get(`/categories/${categoryId}/attributes`),
  predictCategory: (accountId, title) =>
    api.get(`/categories/${accountId}/predict`, { params: { title } }),
};

// ============================================
// PAYMENTS ENDPOINTS
// ============================================
export const paymentsAPI = {
  getPaymentMethods: () => api.get("/payments/methods"),
  getPaymentDetails: (paymentId) => api.get(`/payments/${paymentId}`),
  processPayment: (data) => api.post("/payments/process", data),
  getPaymentHistory: (params) => api.get("/payments/history", { params }),
  getPaymentStats: (params) => api.get("/payments/stats", { params }),
};

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================
export const notificationsAPI = {
  getNotifications: (params) => api.get("/notifications", { params }),
  markAsRead: (notificationId) =>
    api.put(`/notifications/${notificationId}/read`, {}),
  markAllAsRead: () => api.put("/notifications/mark-all-read", {}),
  deleteNotification: (notificationId) =>
    api.delete(`/notifications/${notificationId}`),
  getUnreadCount: () => api.get("/notifications/unread-count"),
};

// ============================================
// PROMOTIONS ENDPOINTS
// ============================================
export const promotionsAPI = {
  getPromotions: (params) => api.get("/promotions", { params }),
  getPromotion: (promoId) => api.get(`/promotions/${promoId}`),
  createPromotion: (data) => api.post("/promotions", data),
  updatePromotion: (promoId, data) => api.put(`/promotions/${promoId}`, data),
  deletePromotion: (promoId) => api.delete(`/promotions/${promoId}`),
  activatePromotion: (promoId) =>
    api.post(`/promotions/${promoId}/activate`, {}),
  deactivatePromotion: (promoId) =>
    api.post(`/promotions/${promoId}/deactivate`, {}),
};

// ============================================
// ANALYTICS ENDPOINTS
// ============================================
export const analyticsAPI = {
  getSalesSummary: (params) => api.get("/analytics/sales-summary", { params }),
  getTopProducts: (params) => api.get("/analytics/top-products", { params }),
  getVisitorStats: (params) => api.get("/analytics/visitors", { params }),
  getSalesChart: (params) => api.get("/analytics/sales-chart", { params }),
  getRevenueChart: (params) => api.get("/analytics/revenue-chart", { params }),
};

// ============================================
// CATALOG ENDPOINTS
// ============================================
export const catalogAPI = {
  getItems: (accountId) => api.get(`/catalog/${accountId}/items`),
  getStats: (accountId) => api.get(`/catalog/${accountId}/stats`),
  getItemEligibility: (accountId, itemId) =>
    api.get(`/catalog/${accountId}/items/${itemId}/eligibility`),
  searchProducts: (accountId, params) =>
    api.get(`/catalog/${accountId}/products/search`, { params }),
  publishToCatalog: (accountId, itemId, data) =>
    api.post(`/catalog/${accountId}/items/${itemId}/catalog`, data),
};

// ============================================
// FULFILLMENT ENDPOINTS
// ============================================
export const fulfillmentAPI = {
  getInventory: (accountId) => api.get(`/fulfillment/${accountId}/inventory`),
  getShipments: (accountId) => api.get(`/fulfillment/${accountId}/shipments`),
  getStats: (accountId) => api.get(`/fulfillment/${accountId}/stats`),
  createInbound: (accountId, data) =>
    api.post(`/fulfillment/${accountId}/inbound`, data),
};

// ============================================
// MARKETING ENDPOINTS
// ============================================
export const marketingAPI = {
  getCampaigns: (params) => api.get("/marketing/campaigns", { params }),
  createCampaign: (data) => api.post("/marketing/campaigns", data),
  updateCampaign: (campaignId, data) =>
    api.put(`/marketing/campaigns/${campaignId}`, data),
  deleteCampaign: (campaignId) =>
    api.delete(`/marketing/campaigns/${campaignId}`),
  getCampaignMetrics: (campaignId) =>
    api.get(`/marketing/campaigns/${campaignId}/metrics`),
};

// ============================================
// INVENTORY ENDPOINTS
// ============================================
export const inventoryAPI = {
  getInventory: (params) => api.get("/inventory", { params }),
  updateStock: (itemId, quantity) =>
    api.put(`/inventory/${itemId}`, { quantity }),
  getStockLevels: () => api.get("/inventory/levels"),
  getLowStockAlerts: () => api.get("/inventory/alerts"),
  bulkUpdateStock: (data) => api.post("/inventory/bulk-update", data),
};

// ============================================
// RETURNS & REFUNDS ENDPOINTS
// ============================================
export const returnsAPI = {
  getReturns: (params) => api.get("/returns", { params }),
  createReturn: (data) => api.post("/returns", data),
  updateReturn: (returnId, data) => api.put(`/returns/${returnId}`, data),
  approveReturn: (returnId) => api.post(`/returns/${returnId}/approve`, {}),
  rejectReturn: (returnId) => api.post(`/returns/${returnId}/reject`, {}),
};

// ============================================
// SELLER SETTINGS ENDPOINTS
// ============================================
export const settingsAPI = {
  getSettings: () => api.get("/settings"),
  updateSettings: (data) => api.put("/settings", data),
  getBusinessProfile: () => api.get("/settings/business-profile"),
  updateBusinessProfile: (data) => api.put("/settings/business-profile", data),
  getStoreLayout: () => api.get("/settings/store-layout"),
  updateStoreLayout: (data) => api.put("/settings/store-layout", data),
};

// ============================================
// MERCADO LIBRE ACCOUNT ENDPOINTS
// ============================================
export const mlAccountAPI = {
  linkAccount: (data) => api.post("/ml-account/link", data),
  unlinkAccount: () => api.post("/ml-account/unlink", {}),
  getAccountStatus: () => api.get("/ml-account/status"),
  refreshToken: () => api.post("/ml-account/refresh-token", {}),
  getAccountInfo: () => api.get("/ml-account/info"),
  getSites: () => api.get("/ml-account/sites"),
};

// ============================================
// ML AUTH INVISIBLE ENDPOINTS
// ============================================
export const mlAuthAPI = {
  getAuthorizationUrl: () => api.get("/ml-auth/url"),
  getStatus: () => api.get("/ml-auth/status"),
  disconnect: (accountId) =>
    api.delete("/ml-auth/disconnect", { data: { accountId } }),
};

// ============================================
// DASHBOARD ENDPOINTS
// ============================================
export const dashboardAPI = {
  getSummary: () => api.get("/dashboard/summary"),
  getMetrics: (params) => api.get("/dashboard/metrics", { params }),
  getRecentOrders: (limit = 10) =>
    api.get(`/dashboard/recent-orders?limit=${limit}`),
  getTopSellingProducts: (limit = 10) =>
    api.get(`/dashboard/top-products?limit=${limit}`),
  getPerformanceMetrics: (params) =>
    api.get("/dashboard/performance", { params }),
};

// ============================================
// BULK OPERATIONS ENDPOINTS
// ============================================
export const bulkAPI = {
  bulkPublish: (data) => api.post("/bulk/publish", data),
  bulkUnpublish: (data) => api.post("/bulk/unpublish", data),
  bulkUpdatePrice: (data) => api.post("/bulk/update-price", data),
  bulkUpdateStock: (data) => api.post("/bulk/update-stock", data),
  bulkDelete: (data) => api.post("/bulk/delete", data),
  getBulkJobStatus: (jobId) => api.get(`/bulk/status/${jobId}`),
};

// ============================================
// EXPORT/IMPORT ENDPOINTS
// ============================================
export const importExportAPI = {
  exportItems: (params) =>
    api.get("/export/items", { params, responseType: "blob" }),
  exportOrders: (params) =>
    api.get("/export/orders", { params, responseType: "blob" }),
  exportReports: (params) =>
    api.get("/export/reports", { params, responseType: "blob" }),
  importItems: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/import/items", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getImportStatus: (jobId) => api.get(`/import/status/${jobId}`),
};

// ============================================
// REPORTS ENDPOINTS
// ============================================
export const reportsAPI = {
  getSalesReport: (params) => api.get("/reports/sales", { params }),
  getFinancialReport: (params) => api.get("/reports/financial", { params }),
  getInventoryReport: (params) => api.get("/reports/inventory", { params }),
  getPerformanceReport: (params) => api.get("/reports/performance", { params }),
  generateReport: (type, params) =>
    api.post(`/reports/${type}/generate`, params),
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Handle API errors with user-friendly messages
 */
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.message || error.response.statusText,
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: "Erro de conexão. Por favor, verifique sua internet.",
      status: null,
      data: null,
    };
  } else {
    // Error in request setup
    return {
      message: error.message || "Erro desconhecido",
      status: null,
      data: null,
    };
  }
};

/**
 * Format API response data
 */
export const formatResponse = (response) => {
  return response.data;
};

/**
 * Export cache service for cache management
 */
export { cacheService } from "./cache";

export default api;
