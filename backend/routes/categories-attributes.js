const express = require('express');
const axios = require('axios');
const logger = require('../logger');

const router = express.Router();
const API_BASE_URL = process.env.ML_API_URL || 'https://api.mercadolibre.com';

// In-memory cache with TTL (Time To Live)
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Cache helper functions
 */
const getCachedData = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

const clearCacheByPrefix = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

// Validation helpers
const validateCategoryId = (categoryId) => {
  if (!categoryId || typeof categoryId !== 'string' || categoryId.trim().length === 0) {
    return 'Category ID must be a non-empty string';
  }
  return null;
};

const validateDomainId = (domainId) => {
  if (!domainId || typeof domainId !== 'string' || domainId.trim().length === 0) {
    return 'Domain ID must be a non-empty string';
  }
  return null;
};

const validateSiteId = (siteId) => {
  if (!siteId || typeof siteId !== 'string' || siteId.trim().length === 0) {
    return 'Site ID must be a non-empty string (e.g., MLB)';
  }
  return null;
};

/**
 * GET /
 * Listar categorias principais do site (MLB por padrão)
 * Query params: site_id (default: MLB)
 */
router.get('/', async (req, res) => {
  try {
    const { site_id = 'MLB' } = req.query;
    
    // Check cache first
    const cacheKey = `categories_${site_id}`;
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      logger.info(`CATEGORIES_ATTRIBUTES - list_categories: Cache hit for site ${site_id}`);
      return res.json({ 
        success: true, 
        data: cachedData,
        cached: true,
        cached_at: new Date(cache.get(cacheKey).timestamp).toISOString()
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    logger.info(`CATEGORIES_ATTRIBUTES - list_categories: Fetching categories for site ${site_id}`);
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/sites/${site_id}/categories`,
      ...config,
      timeout: 10000
    });
    
    // Cache the response
    setCachedData(cacheKey, response.data);
    
    logger.info(`CATEGORIES_ATTRIBUTES - list_categories: Success - ${response.data.length || 0} categories found`);
    
    res.json({ 
      success: true, 
      data: response.data,
      pagination: {
        total: response.data.length || 0,
        limit: response.data.length || 0,
        offset: 0
      },
      cached: false
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`CATEGORIES_ATTRIBUTES - list_categories: ${error.message}`, {
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch categories',
      details: errorData
    });
  }
});

/**
 * GET /:category_id/attributes
 * Alias route - Listar atributos de uma categoria (frontend compatibility)
 */
router.get('/:category_id/attributes', async (req, res) => {
  try {
    const { category_id } = req.params;
    
    // Validate category ID
    const idError = validateCategoryId(category_id);
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [idError]
      });
    }
    
    // Check cache first
    const cacheKey = `category_attrs_${category_id}`;
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      logger.info(`CATEGORIES_ATTRIBUTES - get_category_attributes: Cache hit for ${category_id}`);
      return res.json({ 
        success: true, 
        data: cachedData,
        cached: true,
        cached_at: new Date(cache.get(cacheKey).timestamp).toISOString()
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    logger.info(`CATEGORIES_ATTRIBUTES - get_category_attributes: Fetching attributes for category ${category_id}`);
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/categories/${category_id}/attributes`,
      ...config,
      params: req.query,
      timeout: 10000
    });
    
    // Cache the response
    setCachedData(cacheKey, response.data);
    
    // Separate attributes into required and optional
    const attributeStats = {
      total: response.data.length || 0,
      required: response.data.filter(a => a.required).length || 0,
      optional: response.data.filter(a => !a.required).length || 0
    };
    
    logger.info(`CATEGORIES_ATTRIBUTES - get_category_attributes: Success - ${attributeStats.total} attributes found`);
    
    res.json({ 
      success: true, 
      data: response.data,
      stats: attributeStats,
      cached: false
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`CATEGORIES_ATTRIBUTES - get_category_attributes: ${error.message}`, {
      category_id: req.params.category_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch category attributes',
      details: errorData
    });
  }
});

/**
 * GET /categories/{category_id}/attributes
 * Listar atributos obrigatórios/opcionais de uma categoria (com caching)
 */
router.get('/categories/:category_id/attributes', async (req, res) => {
  try {
    const { category_id } = req.params;
    
    // Validate category ID
    const idError = validateCategoryId(category_id);
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [idError]
      });
    }
    
    // Check cache first
    const cacheKey = `category_attrs_${category_id}`;
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      logger.info(`CATEGORIES_ATTRIBUTES - get_category_attributes: Cache hit for ${category_id}`);
      return res.json({ 
        success: true, 
        data: cachedData,
        cached: true,
        cached_at: new Date(cache.get(cacheKey).timestamp).toISOString()
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    logger.info(`CATEGORIES_ATTRIBUTES - get_category_attributes: Fetching attributes for category ${category_id}`);
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/categories/${category_id}/attributes`,
      ...config,
      params: req.query,
      timeout: 10000
    });
    
    // Cache the response
    setCachedData(cacheKey, response.data);
    
    // Separate attributes into required and optional
    const attributeStats = {
      total: response.data.length || 0,
      required: response.data.filter(a => a.required).length || 0,
      optional: response.data.filter(a => !a.required).length || 0
    };
    
    logger.info(`CATEGORIES_ATTRIBUTES - get_category_attributes: Success - ${attributeStats.total} attributes found`, {
      category_id,
      required: attributeStats.required,
      optional: attributeStats.optional
    });
    
    res.json({ 
      success: true, 
      data: response.data,
      stats: attributeStats,
      cached: false
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`CATEGORIES_ATTRIBUTES - get_category_attributes: ${error.message}`, {
      category_id: req.params.category_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch category attributes',
      details: errorData
    });
  }
});

/**
 * GET /domains/{domain_id}
 * Obter domínio/valores possíveis para um atributo (com caching)
 */
router.get('/domains/:domain_id', async (req, res) => {
  try {
    const { domain_id } = req.params;
    
    // Validate domain ID
    const idError = validateDomainId(domain_id);
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [idError]
      });
    }
    
    // Check cache first
    const cacheKey = `domain_${domain_id}`;
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      logger.info(`CATEGORIES_ATTRIBUTES - get_domain: Cache hit for ${domain_id}`);
      return res.json({ 
        success: true, 
        data: cachedData,
        cached: true,
        cached_at: new Date(cache.get(cacheKey).timestamp).toISOString()
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    logger.info(`CATEGORIES_ATTRIBUTES - get_domain: Fetching domain ${domain_id}`);
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/domains/${domain_id}`,
      ...config,
      params: req.query,
      timeout: 10000
    });
    
    // Cache the response
    setCachedData(cacheKey, response.data);
    
    logger.info(`CATEGORIES_ATTRIBUTES - get_domain: Success - ${response.data.values?.length || 0} values found`);
    
    res.json({ 
      success: true, 
      data: response.data,
      cached: false,
      values_count: response.data.values?.length || 0
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`CATEGORIES_ATTRIBUTES - get_domain: ${error.message}`, {
      domain_id: req.params.domain_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch domain',
      details: errorData
    });
  }
});

/**
 * GET /sites/{site_id}/listing_types
 * Obter tipos de publicação disponíveis por site (com caching)
 */
router.get('/sites/:site_id/listing_types', async (req, res) => {
  try {
    const { site_id } = req.params;
    
    // Validate site ID
    const siteError = validateSiteId(site_id);
    if (siteError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [siteError]
      });
    }
    
    // Check cache first
    const cacheKey = `listing_types_${site_id}`;
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      logger.info(`CATEGORIES_ATTRIBUTES - get_site_listing_types: Cache hit for ${site_id}`);
      return res.json({ 
        success: true, 
        data: cachedData,
        cached: true,
        cached_at: new Date(cache.get(cacheKey).timestamp).toISOString()
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    logger.info(`CATEGORIES_ATTRIBUTES - get_site_listing_types: Fetching listing types for site ${site_id}`);
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/sites/${site_id}/listing_types`,
      ...config,
      params: req.query,
      timeout: 10000
    });
    
    // Cache the response
    setCachedData(cacheKey, response.data);
    
    logger.info(`CATEGORIES_ATTRIBUTES - get_site_listing_types: Success - ${response.data.length || 0} listing types found`);
    
    res.json({ 
      success: true, 
      data: response.data,
      cached: false,
      types_count: response.data.length || 0
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`CATEGORIES_ATTRIBUTES - get_site_listing_types: ${error.message}`, {
      site_id: req.params.site_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch listing types',
      details: errorData
    });
  }
});

/**
 * POST /cache/clear
 * Admin endpoint to clear cache
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const { prefix } = req.body;
    
    if (prefix) {
      clearCacheByPrefix(prefix);
      logger.info(`CATEGORIES_ATTRIBUTES - cache cleared for prefix: ${prefix}`);
      res.json({ 
        success: true, 
        message: `Cache cleared for prefix: ${prefix}` 
      });
    } else {
      cache.clear();
      logger.info(`CATEGORIES_ATTRIBUTES - entire cache cleared`);
      res.json({ 
        success: true, 
        message: 'Entire cache cleared' 
      });
    }
  } catch (error) {
    logger.error(`CATEGORIES_ATTRIBUTES - cache clear error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      details: error.message
    });
  }
});

/**
 * GET /cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = {
      entries: cache.size,
      memory_estimate: `${(JSON.stringify([...cache.entries()]).length / 1024).toFixed(2)} KB`,
      ttl_seconds: CACHE_TTL / 1000
    };
    
    res.json({ 
      success: true, 
      data: stats
    });
  } catch (error) {
    logger.error(`CATEGORIES_ATTRIBUTES - cache stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache stats',
      details: error.message
    });
  }
});

module.exports = router;
