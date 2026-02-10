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
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const { handleError, sendSuccess } = require('../middleware/response-helpers');

const router = express.Router();

/**
 * GET /api/kits/:accountId
 * List all kit items for seller
 */
router.get('/:accountId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const mlUserId = req.mlAccount.mlUserId;

    // Get user's items using SDK
    const searchData = await sdkManager.getAllUserItems(accountId, mlUserId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const itemIds = searchData.results || [];

    // Fetch details for items and identify kits using SDK
    const items = await Promise.all(
      itemIds.map(async (itemId) => {
        try {
          return await sdkManager.getItem(accountId, itemId);
        } catch (err) {
          return null;
        }
      })
    );

    // Filter for kit items
    const kits = items.filter(item => {
      if (!item) return false;
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

    sendSuccess(res, {
      kits,
      paging: searchData.paging,
      total_kits: kits.length,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to list kits', error, {
      action: 'LIST_KITS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId
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

    // Get item details using SDK
    const [item, description] = await Promise.all([
      sdkManager.getItem(accountId, itemId),
      sdkManager.getItemDescription(accountId, itemId).catch(() => null)
    ]);

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

    sendSuccess(res, {
      kit: item,
      description,
      components: kitComponents,
      variations,
      pictures: item.pictures || [],
    });
  } catch (error) {
    handleError(res, 500, 'Failed to get kit details', error, {
      action: 'GET_KIT_DETAILS_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId
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

    // Validate required fields
    if (!title || !category_id || !price || !available_quantity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, category_id, price, available_quantity',
      });
    }

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

    // Create item on ML using SDK
    const response = await sdkManager.createItem(accountId, kitData);

    // Add description if provided
    if (description) {
      try {
        await sdkManager.execute(accountId, async (sdk) => {
          await sdk.axiosInstance.put(
            `/items/${response.id}/description`,
            { plain_text: description }
          );
        });
      } catch (descErr) {
        logger.warn({
          action: 'ADD_KIT_DESCRIPTION_WARNING',
          itemId: response.id,
          error: descErr.message,
        });
      }
    }

    logger.info({
      action: 'CREATE_KIT',
      accountId,
      itemId: response.id,
      userId: req.user.userId,
    });

    sendSuccess(res, {
      message: 'Kit created successfully',
      data: response,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to create kit', error, {
      action: 'CREATE_KIT_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId
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

    // Update item using SDK
    const response = await sdkManager.updateItem(accountId, itemId, updateData);

    logger.info({
      action: 'UPDATE_KIT',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    sendSuccess(res, {
      message: 'Kit updated successfully',
      data: response,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to update kit', error, {
      action: 'UPDATE_KIT_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId
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

    if (!components || !Array.isArray(components)) {
      return res.status(400).json({
        success: false,
        message: 'Components array is required',
      });
    }

    // Get current item to merge attributes using SDK
    const currentItem = await sdkManager.getItem(accountId, itemId);
    
    // Filter out old kit component attributes
    const existingAttributes = (currentItem.attributes || [])
      .filter(attr => !attr.id.includes('KIT_COMPONENT'));

    // Add new component attributes
    const newAttributes = [...existingAttributes];
    components.forEach((component, index) => {
      newAttributes.push({
        id: `KIT_COMPONENT_${index + 1}`,
        value_name: component.name || component,
      });
    });

    // Update item using SDK
    const response = await sdkManager.updateItem(accountId, itemId, {
      attributes: newAttributes
    });

    logger.info({
      action: 'UPDATE_KIT_COMPONENTS',
      accountId,
      itemId,
      userId: req.user.userId,
      componentsCount: components.length,
    });

    sendSuccess(res, {
      message: 'Kit components updated successfully',
      data: {
        item_id: itemId,
        components,
        item: response,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to update kit components', error, {
      action: 'UPDATE_KIT_COMPONENTS_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId
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

    // Close item using SDK
    const response = await sdkManager.updateItem(accountId, itemId, {
      status: 'closed'
    });

    logger.info({
      action: 'DELETE_KIT',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    sendSuccess(res, {
      message: 'Kit closed successfully',
      data: {
        item_id: itemId,
        status: 'closed',
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to close kit', error, {
      action: 'DELETE_KIT_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId
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

    const relistData = {};
    if (price) relistData.price = price;
    if (quantity) relistData.quantity = quantity;

    // Relist item using SDK execute
    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.post(
        `/items/${itemId}/relist`,
        relistData
      );
    });

    logger.info({
      action: 'RELIST_KIT',
      accountId,
      oldItemId: itemId,
      newItemId: response.data.id,
      userId: req.user.userId,
    });

    sendSuccess(res, {
      message: 'Kit relisted successfully',
      data: response.data,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to relist kit', error, {
      action: 'RELIST_KIT_ERROR',
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId
    });
  }
});


module.exports = router;
