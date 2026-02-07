const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { handleError, sendSuccess } = require('../middleware/response-helpers');

const router = express.Router();

const API_BASE_URL = process.env.ML_API_URL || 'https://api.mercadolibre.com';

// Validation helpers
const validateSiteId = (siteId) => {
  if (!siteId || typeof siteId !== 'string' || siteId.trim().length === 0) {
    return 'Site ID must be a non-empty string (e.g., MLB, MLA, MLM)';
  }
  // Basic validation for common site IDs
  const validSites = ['MLB', 'MLA', 'MLM', 'MLU', 'MLC', 'MLV'];
  if (!validSites.includes(siteId.toUpperCase())) {
    logger.warn(`Unusual site_id: ${siteId}`);
  }
  return null;
};

const validateCategoryId = (categoryId) => {
  if (!categoryId || typeof categoryId !== 'string' || categoryId.trim().length === 0) {
    return 'Category ID must be a non-empty string';
  }
  return null;
};

const validatePaginationParams = (query) => {
  const errors = [];
  
  if (query.limit !== undefined) {
    const limit = parseInt(query.limit);
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      errors.push('limit must be a number between 1 and 1000 (default: 50)');
    }
  }
  
  if (query.offset !== undefined) {
    const offset = parseInt(query.offset);
    if (isNaN(offset) || offset < 0) {
      errors.push('offset must be a non-negative number (default: 0)');
    }
  }
  
  if (query.sort) {
    const validSort = ['price_asc', 'price_desc', 'relevance'];
    if (!validSort.includes(query.sort)) {
      errors.push(`sort must be one of: ${validSort.join(', ')}`);
    }
  }
  
  return errors;
};

/**
 * GET /sites/{site_id}/search
 * Buscar itens com múltiplos filtros e paginação
 */
router.get('/sites/:site_id/search', async (req, res) => {
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
    
    // Validate pagination parameters
    const paginationErrors = validatePaginationParams(req.query);
    if (paginationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: paginationErrors
      });
    }
    
    // Set default pagination values
    const params = {
      ...req.query,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0
    };
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    logger.info(`SEARCH_BROWSE - search_items: Searching in ${site_id}`, {
      query: params.q,
      category: params.category,
      limit: params.limit,
      offset: params.offset,
      sort: params.sort
    });
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/sites/${site_id}/search`,
      ...config,
      params,
      timeout: 10000
    });
    
    logger.info(`SEARCH_BROWSE - search_items: Success - Found ${response.data.results?.length || 0} results`);
    res.json({ 
      success: true, 
      data: response.data,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: response.data.paging?.total || 0
      }
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`SEARCH_BROWSE - search_items: ${error.message}`, {
      site_id: req.params.site_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to search items',
      details: errorData
    });
  }
});

/**
 * GET /categories/{id}
 * Obter informações de uma categoria
 */
router.get('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate category ID
    const idError = validateCategoryId(id);
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [idError]
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    logger.info(`SEARCH_BROWSE - get_category: Fetching category ${id}`);
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/categories/${id}`,
      ...config,
      params: req.query,
      timeout: 10000
    });
    
    logger.info(`SEARCH_BROWSE - get_category: Success`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`SEARCH_BROWSE - get_category: ${error.message}`, {
      category_id: req.params.id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch category',
      details: errorData
    });
  }
});

/**
 * GET /sites/{site_id}/categories
 * Listar categorias de um site
 */
router.get('/sites/:site_id/categories', async (req, res) => {
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
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    logger.info(`SEARCH_BROWSE - get_site_categories: Fetching categories for site ${site_id}`);
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/sites/${site_id}/categories`,
      ...config,
      params: req.query,
      timeout: 10000
    });
    
    logger.info(`SEARCH_BROWSE - get_site_categories: Success - Found ${response.data?.length || 0} categories`);
    res.json({ 
      success: true, 
      data: response.data,
      metadata: {
        site_id: site_id,
        total_categories: response.data?.length || 0
      }
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`SEARCH_BROWSE - get_site_categories: ${error.message}`, {
      site_id: req.params.site_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch site categories',
      details: errorData
    });
  }
});


module.exports = router;
