const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const API_BASE_URL = process.env.ML_API_URL || 'https://api.mercadolibre.com';

// Validation helpers
const validateShipmentId = (shipmentId) => {
  if (!shipmentId || isNaN(parseInt(shipmentId))) {
    return 'Shipment ID must be a valid integer';
  }
  return null;
};

const validateShipmentCreation = (body) => {
  const errors = [];
  
  if (!body || Object.keys(body).length === 0) {
    errors.push('Request body is required');
  }
  
  // Validate required fields for shipment creation
  if (body.order_id !== undefined && isNaN(parseInt(body.order_id))) {
    errors.push('order_id must be a valid integer');
  }
  
  return errors;
};

/**
 * GET /shipments/{shipment_id}
 * Obter detalhes completos do shipment (com suporte a labels)
 */
router.get('/shipments/:shipment_id', authenticateToken, async (req, res) => {
  try {
    const { shipment_id } = req.params;
    
    // Validate shipment ID
    const idError = validateShipmentId(shipment_id);
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
    
    logger.info(`SHIPPING - get_shipment: Fetching shipment ${shipment_id}`);
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/shipments/${shipment_id}`,
      ...config,
      params: req.query,
      timeout: 10000
    });
    
    // Enhance response with label URL if available
    const enhancedData = {
      ...response.data,
      label_url: response.data.label_url || `${API_BASE_URL}/shipments/${shipment_id}/label`
    };
    
    logger.info(`SHIPPING - get_shipment: Success - Retrieved shipment ${shipment_id}`);
    res.json({ success: true, data: enhancedData });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`SHIPPING - get_shipment: ${error.message}`, {
      shipment_id: req.params.shipment_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch shipment',
      details: errorData
    });
  }
});

/**
 * PUT /shipments/{shipment_id}
 * Atualizar dados do shipment (tracking, status, etc)
 */
router.put('/shipments/:shipment_id', authenticateToken, async (req, res) => {
  try {
    const { shipment_id } = req.params;
    
    // Validate shipment ID
    const idError = validateShipmentId(shipment_id);
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
    
    logger.info(`SHIPPING - update_shipment: Updating shipment ${shipment_id}`, {
      updates: Object.keys(req.body).join(', ')
    });
    
    const response = await axios({
      method: 'PUT',
      url: `${API_BASE_URL}/shipments/${shipment_id}`,
      ...config,
      data: req.body,
      timeout: 10000
    });
    
    logger.info(`SHIPPING - update_shipment: Success - Shipment ${shipment_id} updated`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`SHIPPING - update_shipment: ${error.message}`, {
      shipment_id: req.params.shipment_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to update shipment',
      details: errorData
    });
  }
});

/**
 * POST /shipments
 * Criar novo shipment para order (com geração automática de label)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Validate request body
    const validationErrors = validateShipmentCreation(req.body);
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
    
    logger.info(`SHIPPING - create_shipment: Creating new shipment`, {
      order_id: req.body.order_id,
      carrier: req.body.carrier_id
    });
    
    const response = await axios({
      method: 'POST',
      url: `${API_BASE_URL}/shipments`,
      ...config,
      data: req.body,
      timeout: 10000
    });
    
    // Enhance response with label URL
    const enhancedData = {
      ...response.data,
      label_url: response.data.label_url || `${API_BASE_URL}/shipments/${response.data.id}/label`,
      label_generated_at: new Date().toISOString()
    };
    
    logger.info(`SHIPPING - create_shipment: Success - Shipment created with ID ${response.data.id}`, {
      order_id: req.body.order_id,
      label_available: !!enhancedData.label_url
    });
    
    res.status(201).json({ 
      success: true, 
      data: enhancedData,
      label_info: {
        label_url: enhancedData.label_url,
        tracking_number: response.data.tracking_number,
        carrier: req.body.carrier_id
      }
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`SHIPPING - create_shipment: ${error.message}`, {
      status: statusCode,
      order_id: req.body?.order_id
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to create shipment',
      details: errorData
    });
  }
});

/**
 * GET /shipments/{shipment_id}/label
 * Gerar/obter rótulo de envio (shipping label)
 */
router.get('/shipments/:shipment_id/label', authenticateToken, async (req, res) => {
  try {
    const { shipment_id } = req.params;
    
    // Validate shipment ID
    const idError = validateShipmentId(shipment_id);
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [idError]
      });
    }
    
    const config = {
      headers: {
        'Authorization': `Bearer ${req.user?.token || ''}`
      }
    };
    
    logger.info(`SHIPPING - get_label: Generating label for shipment ${shipment_id}`);
    
    // Support both PDF and URL format
    const format = req.query.format || 'url'; // 'url', 'pdf', 'base64'
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/shipments/${shipment_id}/label`,
      ...config,
      params: { format },
      timeout: 10000
    });
    
    logger.info(`SHIPPING - get_label: Success - Label generated for shipment ${shipment_id}`);
    
    if (format === 'pdf') {
      // Return PDF file
      res.contentType('application/pdf');
      res.send(response.data);
    } else {
      // Return URL or base64
      res.json({ 
        success: true, 
        data: response.data,
        label_format: format
      });
    }
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`SHIPPING - get_label: ${error.message}`, {
      shipment_id: req.params.shipment_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to generate shipping label',
      details: errorData
    });
  }
});

module.exports = router;
