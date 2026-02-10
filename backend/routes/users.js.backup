const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const API_BASE_URL = process.env.ML_API_URL || 'https://api.mercadolibre.com';

/**
 * GET /:id
 * Obter dados públicos de um usuário
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/users/${id}`,
      ...config,
      params: req.query,
    });
    
    logger.info(`USERS - get_user: Success`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    logger.error(`USERS - get_user: ${error.message}`);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

/**
 * GET /me
 * Obter dados do usuário autenticado
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/users/me`,
      ...config,
      params: req.query,
    });
    
    logger.info(`USERS - get_me: Success`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    logger.error(`USERS - get_me: ${error.message}`);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

/**
 * GET /:id/addresses
 * Listar endereços do usuário
 */
router.get('/:id/addresses', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/users/${id}/addresses`,
      ...config,
      params: req.query,
    });
    
    logger.info(`USERS - get_user_addresses: Success`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    logger.error(`USERS - get_user_addresses: ${error.message}`);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

/**
 * POST /:id/addresses
 * Criar novo endereço para usuário
 */
router.post('/:id/addresses', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const response = await axios({
      method: 'POST',
      url: `${API_BASE_URL}/users/${id}/addresses`,
      ...config,
      data: req.body,
    });
    
    logger.info(`USERS - create_user_address: Success`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    logger.error(`USERS - create_user_address: ${error.message}`);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;
