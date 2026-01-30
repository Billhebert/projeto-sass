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
 * Listar itens/publicações (with pagination)
 * Query params: limit, offset
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);

    // Mock data for testing
    const mockItems = [
      {
        id: 'MLB1',
        title: 'Produto Premium 1',
        category_id: 'MLB1000',
        price: 299.99,
        stock: 15,
        condition: 'new',
        currency_id: 'BRL',
        description: 'Descrição do produto 1',
        status: 'active',
        created_at: new Date(Date.now() - 7*24*60*60*1000)
      },
      {
        id: 'MLB2',
        title: 'Eletrônico Popular',
        category_id: 'MLB2000',
        price: 149.99,
        stock: 8,
        condition: 'new',
        currency_id: 'BRL',
        description: 'Descrição do produto 2',
        status: 'active',
        created_at: new Date(Date.now() - 5*24*60*60*1000)
      },
      {
        id: 'MLB3',
        title: 'Acessório Importado',
        category_id: 'MLB3000',
        price: 89.99,
        stock: 25,
        condition: 'new',
        currency_id: 'BRL',
        description: 'Descrição do produto 3',
        status: 'active',
        created_at: new Date(Date.now() - 3*24*60*60*1000)
      },
      {
        id: 'MLB4',
        title: 'Produto Reembalado',
        category_id: 'MLB1000',
        price: 199.99,
        stock: 3,
        condition: 'used',
        currency_id: 'BRL',
        description: 'Descrição do produto 4',
        status: 'active',
        created_at: new Date(Date.now() - 2*24*60*60*1000)
      },
      {
        id: 'MLB5',
        title: 'Produto em Destaque',
        category_id: 'MLB2000',
        price: 499.99,
        stock: 1,
        condition: 'new',
        currency_id: 'BRL',
        description: 'Descrição do produto 5',
        status: 'active',
        created_at: new Date(Date.now() - 1*24*60*60*1000)
      }
    ];

    const total = mockItems.length;
    const items = mockItems.slice(offsetNum, offsetNum + limitNum);

    logger.info(`ITEMS_PUBLICATIONS - list_items: Retrieved ${items.length} items (total: ${total})`);

    res.json({
      success: true,
      data: items,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: total,
        has_more: offsetNum + limitNum < total
      }
    });
  } catch (error) {
    logger.error(`ITEMS_PUBLICATIONS - list_items: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to list items',
      details: [error.message]
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