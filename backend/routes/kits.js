/**
 * Kits Routes (Kits Virtuais)
 * Manage virtual kits - bundled products sold together
 * 
 * API Mercado Livre:
 * - Items with variations of type "kit"
 * - ITEM_VARIATION attribute type "PARENT" for kit parent
 * - Products bundled together under single listing
 * 
 * Routes:
 * GET    /api/kits/:accountId                      - List all kits
 * GET    /api/kits/:accountId/:itemId              - Get kit details
 * POST   /api/kits/:accountId                      - Create new kit
 * PUT    /api/kits/:accountId/:itemId              - Update kit
 * PUT    /api/kits/:accountId/:itemId/components   - Update kit components
 * DELETE /api/kits/:accountId/:itemId              - Delete/close kit
 */

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * GET /api/kits/:accountId
 * List all kit items for seller
 */
router.get('/:accountId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Search for items - filter for kits
    const searchResponse = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}/items/search`,
      {
        headers,
        params: {
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      }
    );

    const itemIds = searchResponse.data.results || [];

    // Fetch details for items and identify kits
    const items = await Promise.all(
      itemIds.map(async (itemId) => {
        try {
          const itemRes = await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers });
          return itemRes.data;
        } catch (err) {
          return null;
        }
      })
    );

    // Filter for kit items (items with multiple variations that are "components")
    const kits = items.filter(item => {
      if (!item) return false;
      // Identify kits by attributes or structure
      const isKit = item.attributes?.some(attr => 
        attr.id === 'ITEM_CONDITION' && attr.value_name === 'Kit'
      ) || 
      item.sale_terms?.some(term => term.id === 'SALE_TYPE' && term.value_name === 'Kit') ||
      (item.variations?.length > 0 && item.attributes?.some(attr => attr.id === 'KIT_COMPONENTS'));
      return isKit;
    });

    logger.info({
      action: 'LIST_KITS',
      accountId,
      userId: req.user.userId,
      kitsFound: kits.length,
    });

    res.json({
      success: true,
      data: {
        kits,
        paging: searchResponse.data.paging,
        total_kits: kits.length,
      },
    });
  } catch (error) {
    logger.error({
      action: 'LIST_KITS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to list kits',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/kits/:accountId/:itemId
 * Get kit details with components
 */
router.get('/:accountId/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get item details
    const [itemRes, descRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/items/${itemId}`, { headers }),
      axios.get(`${ML_API_BASE}/items/${itemId}/description`, { headers }).catch(() => ({ data: null })),
    ]);

    const item = itemRes.data;

    // Extract kit components from attributes
    const kitComponents = item.attributes?.filter(attr => 
      attr.id.includes('KIT') || attr.id.includes('COMPONENT')
    ) || [];

    // If item has variations, they might represent kit components
    const variations = item.variations || [];

    logger.info({
      action: 'GET_KIT_DETAILS',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: {
        kit: item,
        description: descRes.data,
        components: kitComponents,
        variations,
        pictures: item.pictures || [],
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_KIT_DETAILS_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get kit details',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/kits/:accountId
 * Create a new kit
 */
router.post('/:accountId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { title, category_id, price, currency_id, available_quantity, components, pictures, description } = req.body;
    const account = req.mlAccount;

    // Validate required fields
    if (!title || !category_id || !price || !available_quantity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, category_id, price, available_quantity',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Build kit attributes
    const attributes = [
      { id: 'ITEM_CONDITION', value_name: 'Novo' },
    ];

    // Add kit components as attributes if provided
    if (components && Array.isArray(components)) {
      components.forEach((component, index) => {
        attributes.push({
          id: `KIT_COMPONENT_${index + 1}`,
          value_name: component.name,
        });
      });
    }

    const kitData = {
      title: `Kit ${title}`,
      category_id,
      price,
      currency_id: currency_id || 'BRL',
      available_quantity,
      buying_mode: 'buy_it_now',
      condition: 'new',
      listing_type_id: 'gold_special',
      attributes,
      pictures: pictures || [],
    };

    // Create item on ML
    const response = await axios.post(
      `${ML_API_BASE}/items`,
      kitData,
      { headers }
    );

    // Add description if provided
    if (description) {
      try {
        await axios.put(
          `${ML_API_BASE}/items/${response.data.id}/description`,
          { plain_text: description },
          { headers }
        );
      } catch (descErr) {
        logger.warn({
          action: 'ADD_KIT_DESCRIPTION_WARNING',
          itemId: response.data.id,
          error: descErr.message,
        });
      }
    }

    logger.info({
      action: 'CREATE_KIT',
      accountId,
      itemId: response.data.id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Kit created successfully',
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'CREATE_KIT_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to create kit',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * PUT /api/kits/:accountId/:itemId
 * Update kit details
 */
router.put('/:accountId/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const updateData = req.body;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      updateData,
      { headers }
    );

    logger.info({
      action: 'UPDATE_KIT',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Kit updated successfully',
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_KIT_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update kit',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * PUT /api/kits/:accountId/:itemId/components
 * Update kit components
 */
router.put('/:accountId/:itemId/components', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { components } = req.body;
    const account = req.mlAccount;

    if (!components || !Array.isArray(components)) {
      return res.status(400).json({
        success: false,
        message: 'Components array is required',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get current item to merge attributes
    const currentItem = await axios.get(`${ML_API_BASE}/items/${itemId}`, { headers });
    
    // Filter out old kit component attributes
    const existingAttributes = (currentItem.data.attributes || [])
      .filter(attr => !attr.id.includes('KIT_COMPONENT'));

    // Add new component attributes
    const newAttributes = [...existingAttributes];
    components.forEach((component, index) => {
      newAttributes.push({
        id: `KIT_COMPONENT_${index + 1}`,
        value_name: component.name || component,
      });
    });

    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      { attributes: newAttributes },
      { headers }
    );

    logger.info({
      action: 'UPDATE_KIT_COMPONENTS',
      accountId,
      itemId,
      userId: req.user.userId,
      componentsCount: components.length,
    });

    res.json({
      success: true,
      message: 'Kit components updated successfully',
      data: {
        item_id: itemId,
        components,
        item: response.data,
      },
    });
  } catch (error) {
    logger.error({
      action: 'UPDATE_KIT_COMPONENTS_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update kit components',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * DELETE /api/kits/:accountId/:itemId
 * Close/delete kit
 */
router.delete('/:accountId/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      { status: 'closed' },
      { headers }
    );

    logger.info({
      action: 'DELETE_KIT',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Kit closed successfully',
      data: {
        item_id: itemId,
        status: 'closed',
      },
    });
  } catch (error) {
    logger.error({
      action: 'DELETE_KIT_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to close kit',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/kits/:accountId/:itemId/relist
 * Relist a closed kit
 */
router.post('/:accountId/:itemId/relist', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { price, quantity } = req.body;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const relistData = {};
    if (price) relistData.price = price;
    if (quantity) relistData.quantity = quantity;

    const response = await axios.post(
      `${ML_API_BASE}/items/${itemId}/relist`,
      relistData,
      { headers }
    );

    logger.info({
      action: 'RELIST_KIT',
      accountId,
      oldItemId: itemId,
      newItemId: response.data.id,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Kit relisted successfully',
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'RELIST_KIT_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to relist kit',
      error: error.response?.data?.message || error.message,
    });
  }
});

module.exports = router;
