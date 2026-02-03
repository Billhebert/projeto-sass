const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const API_BASE_URL = process.env.ML_API_URL || 'https://api.mercadolibre.com';

// Validation helpers
const validateItemCreation = (body) => {
  const errors = [];
  
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push('title is required and must be a non-empty string');
  }
  if (!body.category_id || typeof body.category_id !== 'string') {
    errors.push('category_id is required and must be a string');
  }
  if (body.price === undefined || body.price === null || isNaN(body.price) || body.price < 0) {
    errors.push('price is required and must be a positive number');
  }
  
  return errors;
};

const validateItemId = (id) => {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return 'Item ID must be a non-empty string';
  }
  return null;
};

/**
 * GET /
 * Listar items/publicações do usuário
 * Query params: limit, offset, status, sort
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status, sort = 'created_desc' } = req.query;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.user?.token || ''}`
      }
    };
    
    // Get user ID from token
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found in token'
      });
    }
    
    logger.info(`ITEMS_PUBLICATIONS - list_items: Fetching items for user ${userId}`);
    
    // Build query params for ML API
    const params = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    if (status) {
      params.status = status;
    }
    
    // Sort mapping
    const sortMapping = {
      'created_desc': 'date_created:desc',
      'created_asc': 'date_created:asc',
      'price_desc': 'price:desc',
      'price_asc': 'price:asc'
    };
    
    if (sort && sortMapping[sort]) {
      params.sort = sortMapping[sort];
    }
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/users/${userId}/items/search`,
      ...config,
      params,
      timeout: 15000
    });
    
    // Get full item details if we have results
    let items = [];
    const results = response.data.results || [];
    
    if (results.length > 0) {
      // Fetch item details in batches
      const itemIds = results.slice(0, parseInt(limit));
      const itemPromises = itemIds.map(id => 
        axios.get(`${API_BASE_URL}/items/${id}`, { 
          headers: config.headers,
          timeout: 10000 
        }).catch(err => {
          logger.warn(`Failed to fetch item ${id}: ${err.message}`);
          return null;
        })
      );
      
      const itemResponses = await Promise.all(itemPromises);
      items = itemResponses
        .filter(r => r !== null)
        .map(r => r.data);
    }
    
    logger.info(`ITEMS_PUBLICATIONS - list_items: Success - ${items.length} items retrieved`);
    
    res.json({ 
      success: true, 
      data: items,
      pagination: {
        total: response.data.paging?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`ITEMS_PUBLICATIONS - list_items: ${error.message}`, {
      status: statusCode,
      errorDetails: errorData
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to list items',
      details: errorData
    });
  }
});

/**
 * POST /
 * Criar novo item/publicação
 * Required: title, category_id, price
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Validate request body
    const validationErrors = validateItemCreation(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.user?.token || ''}`
      }
    };
    
    // Log sanitized request
    logger.info(`ITEMS_PUBLICATIONS - create_item: Creating item with title "${req.body.title}"`);
    
    const response = await axios({
      method: 'POST',
      url: `${API_BASE_URL}/items`,
      ...config,
      data: req.body,
      timeout: 10000
    });
    
    logger.info(`ITEMS_PUBLICATIONS - create_item: Success - Item ID: ${response.data.id}`);
    res.status(201).json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`ITEMS_PUBLICATIONS - create_item: ${error.message}`, {
      status: statusCode,
      errorDetails: errorData
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to create item',
      details: errorData
    });
  }
});


/**
 * GET /:id
 * Obter dados completos do item
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate item ID
    const idError = validateItemId(id);
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
    
    logger.info(`ITEMS_PUBLICATIONS - get_item: Fetching item ${id}`);
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/items/${id}`,
      ...config,
      params: req.query,
      timeout: 10000
    });
    
    logger.info(`ITEMS_PUBLICATIONS - get_item: Success - Retrieved item ${id}`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`ITEMS_PUBLICATIONS - get_item: ${error.message}`, {
      itemId: req.params.id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch item',
      details: errorData
    });
  }
});


/**
 * PUT /items/{id}
 * Atualizar item
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate item ID
    const idError = validateItemId(id);
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [idError]
      });
    }
    
    // Basic validation - at least one field to update
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: ['Request body must contain at least one field to update']
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.user?.token || ''}`
      }
    };
    
    logger.info(`ITEMS_PUBLICATIONS - update_item: Updating item ${id}`);
    
    const response = await axios({
      method: 'PUT',
      url: `${API_BASE_URL}/items/${id}`,
      ...config,
      data: req.body,
      timeout: 10000
    });
    
    logger.info(`ITEMS_PUBLICATIONS - update_item: Success - Item ${id} updated`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`ITEMS_PUBLICATIONS - update_item: ${error.message}`, {
      itemId: req.params.id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to update item',
      details: errorData
    });
  }
});


/**
 * DELETE /items/{id}
 * Deletar/Desativar item
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate item ID
    const idError = validateItemId(id);
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [idError]
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.user?.token || ''}`
      }
    };
    
    logger.info(`ITEMS_PUBLICATIONS - delete_item: Deleting item ${id}`);
    
    const response = await axios({
      method: 'DELETE',
      url: `${API_BASE_URL}/items/${id}`,
      ...config,
      timeout: 10000
    });
    
    logger.info(`ITEMS_PUBLICATIONS - delete_item: Success - Item ${id} deleted`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`ITEMS_PUBLICATIONS - delete_item: ${error.message}`, {
      itemId: req.params.id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to delete item',
      details: errorData
    });
  }
});


/**
 * GET /items/{id}/description
 * Obter descrição HTML do item
 */
router.get('/:id/description', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate item ID
    const idError = validateItemId(id);
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
    
    logger.info(`ITEMS_PUBLICATIONS - get_item_description: Fetching description for item ${id}`);
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/items/${id}/description`,
      ...config,
      params: req.query,
      timeout: 10000
    });
    
    logger.info(`ITEMS_PUBLICATIONS - get_item_description: Success`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`ITEMS_PUBLICATIONS - get_item_description: ${error.message}`, {
      itemId: req.params.id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch item description',
      details: errorData
    });
  }
});

/**
 * POST /items/{id}/description
 * Criar/atualizar descrição HTML do item
 */
router.post('/:id/description', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate item ID
    const idError = validateItemId(id);
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [idError]
      });
    }
    
    // Validate request body
    if (!req.body || !req.body.text) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: ['Description text is required in request body']
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.user?.token || ''}`
      }
    };
    
    logger.info(`ITEMS_PUBLICATIONS - update_item_description: Updating description for item ${id}`);
    
    const response = await axios({
      method: 'POST',
      url: `${API_BASE_URL}/items/${id}/description`,
      ...config,
      data: req.body,
      timeout: 10000
    });
    
    logger.info(`ITEMS_PUBLICATIONS - update_item_description: Success`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`ITEMS_PUBLICATIONS - update_item_description: ${error.message}`, {
      itemId: req.params.id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to update item description',
      details: errorData
    });
  }
});

module.exports = router;