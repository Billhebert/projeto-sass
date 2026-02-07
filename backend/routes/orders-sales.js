const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { handleError, sendSuccess } = require('../middleware/response-helpers');

const router = express.Router();

const API_BASE_URL = process.env.ML_API_URL || 'https://api.mercadolibre.com';

// Order status constants
const VALID_ORDER_STATUSES = ['paid', 'pending', 'cancelled', 'shipped', 'delivered'];

// Validation helpers
const validateOrderId = (orderId) => {
  if (!orderId || isNaN(parseInt(orderId))) {
    return 'Order ID must be a valid integer';
  }
  return null;
};

const validateOrderFilters = (query) => {
  const errors = [];
  
  if (query.status) {
    if (!VALID_ORDER_STATUSES.includes(query.status.toLowerCase())) {
      errors.push(`status must be one of: ${VALID_ORDER_STATUSES.join(', ')}`);
    }
  }
  
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
  
  if (query.seller_id !== undefined) {
    if (isNaN(parseInt(query.seller_id))) {
      errors.push('seller_id must be a valid integer');
    }
  }
  
  return errors;
};

const validatePackCreation = (body) => {
  const errors = [];
  
  if (!body || Object.keys(body).length === 0) {
    errors.push('Request body is required');
  }
  
  return errors;
};

/**
 * GET /
 * Listar pedidos do vendedor (alias para /orders/search)
 * Query params: limit, offset, status, seller_id
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Validate filters
    const filterErrors = validateOrderFilters(req.query);
    if (filterErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: filterErrors
      });
    }
    
    // Get seller ID from user token or query
    const sellerId = req.query.seller_id || req.user?.userId || req.user?.id;
    
    // Set default pagination values
    const params = {
      seller: sellerId,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0
    };
    
    if (req.query.status) {
      params['order.status'] = req.query.status;
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.user?.token || ''}`
      }
    };
    
    logger.info(`ORDERS_SALES - list_orders: Fetching orders for seller ${sellerId}`, {
      limit: params.limit,
      offset: params.offset
    });
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/orders/search`,
      ...config,
      params,
      timeout: 15000
    });
    
    // Transform response data
    const orders = response.data.results || [];
    
    logger.info(`ORDERS_SALES - list_orders: Success - Found ${orders.length} orders`);
    
    res.json({ 
      success: true, 
      data: orders,
      pagination: {
        limit: parseInt(params.limit),
        offset: parseInt(params.offset),
        total: response.data.paging?.total || 0
      }
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`ORDERS_SALES - list_orders: ${error.message}`, {
      status: statusCode,
      errorDetails: errorData
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to list orders',
      details: errorData
    });
  }
});

/**
 * GET /orders/search
 * Buscar orders com filtros avançados (status, seller_id, etc)
 */
router.get('/orders/search', authenticateToken, async (req, res) => {
  try {
    // Validate filters
    const filterErrors = validateOrderFilters(req.query);
    if (filterErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: filterErrors
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
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.user?.token || ''}`
      }
    };
    
    logger.info(`ORDERS_SALES - search_orders: Searching orders`, {
      seller_id: params.seller_id,
      status: params.status,
      limit: params.limit,
      offset: params.offset
    });
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/orders/search`,
      ...config,
      params,
      timeout: 10000
    });
    
    logger.info(`ORDERS_SALES - search_orders: Success - Found ${response.data.results?.length || 0} orders`);
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
    
    logger.error(`ORDERS_SALES - search_orders: ${error.message}`, {
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to search orders',
      details: errorData
    });
  }
});

/**
 * GET /orders/{order_id}
 * Obter detalhes completos de uma order
 */
router.get('/orders/:order_id', authenticateToken, async (req, res) => {
  try {
    const { order_id } = req.params;
    
    // Validate order ID
    const idError = validateOrderId(order_id);
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
    
    logger.info(`ORDERS_SALES - get_order: Fetching order ${order_id}`);
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/orders/${order_id}`,
      ...config,
      params: req.query,
      timeout: 10000
    });
    
    logger.info(`ORDERS_SALES - get_order: Success - Retrieved order ${order_id}`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`ORDERS_SALES - get_order: ${error.message}`, {
      order_id: req.params.order_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch order',
      details: errorData
    });
  }
});

/**
 * PUT /orders/{order_id}
 * Atualizar status ou dados da order
 */
router.put('/orders/:order_id', authenticateToken, async (req, res) => {
  try {
    const { order_id } = req.params;
    
    // Validate order ID
    const idError = validateOrderId(order_id);
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [idError]
      });
    }
    
    // Validate request body
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
    
    logger.info(`ORDERS_SALES - update_order: Updating order ${order_id}`);
    
    const response = await axios({
      method: 'PUT',
      url: `${API_BASE_URL}/orders/${order_id}`,
      ...config,
      data: req.body,
      timeout: 10000
    });
    
    logger.info(`ORDERS_SALES - update_order: Success - Order ${order_id} updated`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`ORDERS_SALES - update_order: ${error.message}`, {
      order_id: req.params.order_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to update order',
      details: errorData
    });
  }
});

/**
 * GET /packs/{pack_id}
 * Obter dados do pack
 */
router.get('/packs/:pack_id', authenticateToken, async (req, res) => {
  try {
    const { pack_id } = req.params;
    
    // Validate pack ID
    if (!pack_id || isNaN(parseInt(pack_id))) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: ['Pack ID must be a valid integer']
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.user?.token || ''}`
      }
    };
    
    logger.info(`ORDERS_SALES - get_pack: Fetching pack ${pack_id}`);
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/packs/${pack_id}`,
      ...config,
      params: req.query,
      timeout: 10000
    });
    
    logger.info(`ORDERS_SALES - get_pack: Success - Retrieved pack ${pack_id}`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`ORDERS_SALES - get_pack: ${error.message}`, {
      pack_id: req.params.pack_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch pack',
      details: errorData
    });
  }
});

/**
 * POST /packs
 * Criar novo pack de envio
 */
router.post('/packs', authenticateToken, async (req, res) => {
  try {
    // Validate request body
    const validationErrors = validatePackCreation(req.body);
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
    
    logger.info(`ORDERS_SALES - create_pack: Creating new pack`);
    
    const response = await axios({
      method: 'POST',
      url: `${API_BASE_URL}/packs`,
      ...config,
      data: req.body,
      timeout: 10000
    });
    
    logger.info(`ORDERS_SALES - create_pack: Success - Pack created with ID ${response.data.id}`);
    res.status(201).json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`ORDERS_SALES - create_pack: ${error.message}`, {
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to create pack',
      details: errorData
    });
  }
});


module.exports = router;
