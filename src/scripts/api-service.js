/**
 * Advanced API Service Module
 * Handles all API communication with fallback to localStorage
 * Supports both local development and production APIs
 */

const apiServiceModule = (() => {
  const API_CONFIG = {
    baseURL: process.env.API_URL || 'http://localhost:3000/api',
    timeout: 15000,
    retryAttempts: 3,
    retryDelay: 1000,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  // Cache for reducing API calls
  const cache = {
    products: null,
    sales: null,
    categories: null,
    stock: null,
    analytics: null,
    timestamps: {}
  };

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get auth token
  function getAuthToken() {
    return localStorage.getItem('authToken') || null;
  }

  // Get headers with auth token
  function getHeaders() {
    const headers = { ...API_CONFIG.headers };
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Check if cache is still valid
  function isCacheValid(key) {
    if (!cache[key] || !cache.timestamps[key]) return false;
    const age = Date.now() - cache.timestamps[key];
    return age < CACHE_DURATION;
  }

  // Fetch with timeout and retry logic
  async function fetchWithRetry(url, options = {}, attempt = 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: getHeaders()
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw {
          status: response.status,
          message: error.message || response.statusText,
          details: error
        };
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (attempt < API_CONFIG.retryAttempts && error.status !== 401 && error.status !== 403) {
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay * attempt));
        return fetchWithRetry(url, options, attempt + 1);
      }

      throw error;
    }
  }

  // Products API
  async function getProducts() {
    if (isCacheValid('products')) {
      return cache.products;
    }

    try {
      const data = await fetchWithRetry(`${API_CONFIG.baseURL}/products`);
      cache.products = data;
      cache.timestamps.products = Date.now();
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      return fallbackToLocalStorage('products');
    }
  }

  async function createProduct(product) {
    try {
      const data = await fetchWithRetry(
        `${API_CONFIG.baseURL}/products`,
        {
          method: 'POST',
          body: JSON.stringify(product)
        }
      );
      cache.products = null; // Invalidate cache
      return data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async function updateProduct(id, product) {
    try {
      const data = await fetchWithRetry(
        `${API_CONFIG.baseURL}/products/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(product)
        }
      );
      cache.products = null;
      return data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async function deleteProduct(id) {
    try {
      const data = await fetchWithRetry(
        `${API_CONFIG.baseURL}/products/${id}`,
        { method: 'DELETE' }
      );
      cache.products = null;
      return data;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Sales API
  async function getSales(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    const url = `${API_CONFIG.baseURL}/sales${queryString ? '?' + queryString : ''}`;

    try {
      const data = await fetchWithRetry(url);
      cache.sales = data;
      cache.timestamps.sales = Date.now();
      return data;
    } catch (error) {
      console.error('Error fetching sales:', error);
      return fallbackToLocalStorage('sales');
    }
  }

  async function createSale(sale) {
    try {
      const data = await fetchWithRetry(
        `${API_CONFIG.baseURL}/sales`,
        {
          method: 'POST',
          body: JSON.stringify(sale)
        }
      );
      cache.sales = null;
      return data;
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  }

  async function updateSale(id, sale) {
    try {
      const data = await fetchWithRetry(
        `${API_CONFIG.baseURL}/sales/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(sale)
        }
      );
      cache.sales = null;
      return data;
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  }

  // Categories API
  async function getCategories() {
    if (isCacheValid('categories')) {
      return cache.categories;
    }

    try {
      const data = await fetchWithRetry(`${API_CONFIG.baseURL}/categories`);
      cache.categories = data;
      cache.timestamps.categories = Date.now();
      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return fallbackToLocalStorage('categories');
    }
  }

  async function createCategory(category) {
    try {
      const data = await fetchWithRetry(
        `${API_CONFIG.baseURL}/categories`,
        {
          method: 'POST',
          body: JSON.stringify(category)
        }
      );
      cache.categories = null;
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Stock API
  async function getStock() {
    if (isCacheValid('stock')) {
      return cache.stock;
    }

    try {
      const data = await fetchWithRetry(`${API_CONFIG.baseURL}/stock`);
      cache.stock = data;
      cache.timestamps.stock = Date.now();
      return data;
    } catch (error) {
      console.error('Error fetching stock:', error);
      return fallbackToLocalStorage('product_stock');
    }
  }

  async function updateStock(sku, quantity) {
    try {
      const data = await fetchWithRetry(
        `${API_CONFIG.baseURL}/stock/${sku}`,
        {
          method: 'PUT',
          body: JSON.stringify({ quantity })
        }
      );
      cache.stock = null;
      return data;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  // Analytics API
  async function getAnalytics(startDate = null, endDate = null) {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const queryString = new URLSearchParams(params).toString();
    const url = `${API_CONFIG.baseURL}/analytics${queryString ? '?' + queryString : ''}`;

    try {
      const data = await fetchWithRetry(url);
      cache.analytics = data;
      cache.timestamps.analytics = Date.now();
      return data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Calculate from local data if API fails
      return calculateLocalAnalytics(startDate, endDate);
    }
  }

  // Dashboard API
  async function getDashboardSummary() {
    try {
      const data = await fetchWithRetry(`${API_CONFIG.baseURL}/dashboard/summary`);
      return data;
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      return calculateLocalDashboardSummary();
    }
  }

  async function getDashboardMetrics() {
    try {
      const [summary, analytics] = await Promise.all([
        getDashboardSummary(),
        getAnalytics()
      ]);
      return { summary, analytics };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  }

  // Batch operations
  async function importBatch(type, data) {
    try {
      const response = await fetchWithRetry(
        `${API_CONFIG.baseURL}/import/${type}`,
        {
          method: 'POST',
          body: JSON.stringify({ data })
        }
      );
      cache.products = null;
      cache.sales = null;
      cache.categories = null;
      return response;
    } catch (error) {
      console.error('Error importing batch:', error);
      throw error;
    }
  }

  async function exportData(type) {
    try {
      const response = await fetch(
        `${API_CONFIG.baseURL}/export/${type}`,
        {
          headers: getHeaders()
        }
      );

      if (!response.ok) throw new Error('Export failed');
      return await response.blob();
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // Reports API
  async function generateReport(type, filters = {}) {
    try {
      const data = await fetchWithRetry(
        `${API_CONFIG.baseURL}/reports/${type}`,
        {
          method: 'POST',
          body: JSON.stringify(filters)
        }
      );
      return data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  // Fallback to localStorage
  function fallbackToLocalStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Calculate analytics from local data
  function calculateLocalAnalytics(startDate, endDate) {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const categories = JSON.parse(localStorage.getItem('categories') || '[]');
    const stock = JSON.parse(localStorage.getItem('product_stock') || '{}');

    // Filter by date range if provided
    let filteredSales = sales;
    if (startDate || endDate) {
      filteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        return saleDate >= start && saleDate <= end;
      });
    }

    return {
      sales: filteredSales.length,
      revenue: filteredSales.reduce((sum, s) => sum + (s.total || 0), 0),
      products: products.length,
      categories: categories.length,
      growth: analyticsModule.calculateMoMGrowth(filteredSales),
      velocity: analyticsModule.getSalesVelocity(filteredSales),
      conversion: analyticsModule.getConversionRate(filteredSales),
      inventory: analyticsModule.getInventoryHealth(stock, filteredSales, products)
    };
  }

  // Calculate dashboard summary from local data
  function calculateLocalDashboardSummary() {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const categories = JSON.parse(localStorage.getItem('categories') || '[]');
    const stock = JSON.parse(localStorage.getItem('product_stock') || '{}');

    const approvedSales = sales.filter(s => s.status === 'aprovado');
    const totalRevenue = approvedSales.reduce((sum, s) => sum + (s.faturamento || 0), 0);
    const totalCost = approvedSales.reduce((sum, s) => sum + (s.custo || 0), 0);

    return {
      approved_sales: approvedSales.length,
      approved_revenue: totalRevenue,
      total_cost: totalCost,
      margin: totalRevenue - totalCost,
      total_products: products.length,
      total_categories: categories.length,
      stock_items: Object.keys(stock).length,
      low_stock_items: Object.values(stock).filter(v => v <= 10).length
    };
  }

  // Health check
  async function healthCheck() {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/health`, { timeout: 5000 });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Public API
  return {
    // Products
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,

    // Sales
    getSales,
    createSale,
    updateSale,

    // Categories
    getCategories,
    createCategory,

    // Stock
    getStock,
    updateStock,

    // Analytics
    getAnalytics,
    getDashboardSummary,
    getDashboardMetrics,

    // Batch operations
    importBatch,
    exportData,

    // Reports
    generateReport,

    // Utilities
    healthCheck,
    clearCache: () => {
      cache.products = null;
      cache.sales = null;
      cache.categories = null;
      cache.stock = null;
      cache.analytics = null;
      cache.timestamps = {};
    }
  };
})();
