/**
 * Global Selling Routes
 * Mercado Libre Cross-Border Trade (CBT) API Integration
 * 
 * Endpoints:
 * - GET /api/global-selling/:accountId/status - Get CBT eligibility status
 * - GET /api/global-selling/:accountId/items - List globally published items
 * - POST /api/global-selling/:accountId/items - Publish item globally
 * - GET /api/global-selling/:accountId/countries - Get available countries
 * - GET /api/global-selling/:accountId/shipments - Get international shipments
 * - GET /api/global-selling/:accountId/orders - Get international orders
 */

const express = require('express');
const router = express.Router();
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const MLAccount = require('../db/models/MLAccount');
const { authenticateToken } = require('../middleware/auth');
const { handleError, sendSuccess } = require('../middleware/response-helpers');

// Available CBT countries
const CBT_COUNTRIES = [
  { code: 'MLA', name: 'Argentina', currency: 'ARS', site: 'mercadolibre.com.ar' },
  { code: 'MLM', name: 'Mexico', currency: 'MXN', site: 'mercadolibre.com.mx' },
  { code: 'MLC', name: 'Chile', currency: 'CLP', site: 'mercadolibre.cl' },
  { code: 'MCO', name: 'Colombia', currency: 'COP', site: 'mercadolibre.com.co' },
  { code: 'MLU', name: 'Uruguay', currency: 'UYU', site: 'mercadolibre.com.uy' },
  { code: 'MPE', name: 'Peru', currency: 'PEN', site: 'mercadolibre.com.pe' },
  { code: 'MEC', name: 'Ecuador', currency: 'USD', site: 'mercadolibre.com.ec' },
];

// Middleware to get ML account
async function getMLAccount(req, res, next) {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;

    const account = await MLAccount.findOne({ id: accountId, userId });
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'ML account not found',
      });
    }

    if (account.isTokenExpired()) {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please refresh.',
      });
    }

    req.mlAccount = account;
    next();
  } catch (error) {
    logger.error('Error getting ML account:', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * GET /api/global-selling/:accountId/status
 * Get CBT eligibility and status
 */
router.get('/:accountId/status', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const mlUserId = req.mlAccount.mlUserId;

    // Get user data using SDK
    const userData = await sdkManager.getUser(accountId, mlUserId);

    // Check marketplace availability
    let marketplaceStatus = [];
    try {
      marketplaceStatus = await sdkManager.execute(accountId, async (sdk) => {
        const response = await sdk.axiosInstance.get(
          `/marketplace/users/${mlUserId}`
        );
        return response.data || [];
      });
    } catch (e) {
      logger.info('Marketplace endpoint not available:', { userId: mlUserId });
    }

    sendSuccess(res, {
      user: {
        id: userData.id,
        nickname: userData.nickname,
        siteId: userData.site_id,
        sellerReputation: userData.seller_reputation,
      },
      globalSellingEnabled: marketplaceStatus.length > 0,
      availableCountries: CBT_COUNTRIES.filter(c => c.code !== userData.site_id),
      activeMarketplaces: marketplaceStatus,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch global selling status', error, {
      action: 'FETCH_GLOBAL_SELLING_STATUS_ERROR',
      accountId: req.params.accountId
    });
  }
});

/**
 * GET /api/global-selling/:accountId/countries
 * Get available countries for CBT
 */
router.get('/:accountId/countries', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { mlAccount } = req;
    const userSiteId = mlAccount.siteId || 'MLB';

    // Filter out user's own country
    const availableCountries = CBT_COUNTRIES.filter(c => c.code !== userSiteId);

    res.json({
      success: true,
      data: {
        countries: availableCountries,
        userSiteId,
      },
    });
  } catch (error) {
    logger.error('Error fetching countries:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/global-selling/:accountId/items
 * List items published globally
 */
router.get('/:accountId/items', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { offset = 0, limit = 50, country } = req.query;
    const mlUserId = req.mlAccount.mlUserId;

    // Get user's items using SDK
    const searchData = await sdkManager.getAllUserItems(accountId, mlUserId, {
      offset,
      limit,
      status: 'active'
    });

    const itemIds = searchData.results || [];

    // Get details for each item using SDK
    const itemDetails = await Promise.all(
      itemIds.map(async (itemId) => {
        try {
          const item = await sdkManager.getItem(accountId, itemId);

          // Check for global variations/publications
          let globalPublications = [];
          try {
            const variations = await sdkManager.execute(accountId, async (sdk) => {
              const response = await sdk.axiosInstance.get(
                `/items/${itemId}/variations`
              );
              return response.data;
            });
            if (variations?.global_item_id) {
              globalPublications.push({
                globalItemId: variations.global_item_id,
              });
            }
          } catch (e) {
            // Global variations not available
          }

          return {
            id: item.id,
            title: item.title,
            price: item.price,
            currency: item.currency_id,
            thumbnail: item.thumbnail,
            status: item.status,
            availableQuantity: item.available_quantity,
            soldQuantity: item.sold_quantity,
            permalink: item.permalink,
            globalPublications,
          };
        } catch (e) {
          return null;
        }
      })
    );

    sendSuccess(res, {
      items: itemDetails.filter(i => i !== null),
      paging: searchData.paging,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch global items', error, {
      action: 'FETCH_GLOBAL_ITEMS_ERROR',
      accountId: req.params.accountId
    });
  }
});

/**
 * POST /api/global-selling/:accountId/items
 * Publish item globally using /global/items endpoint
 */
router.post('/:accountId/items', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const {
      item_id,
      target_sites,
      pricing_strategy = 'net_proceeds',
      net_price,
      markup_percentage,
    } = req.body;

    if (!item_id || !target_sites || target_sites.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'item_id and target_sites are required',
      });
    }

    // Build publication payload for each target site
    const publications = target_sites.map(siteId => {
      const publication = {
        site_id: siteId,
      };

      if (pricing_strategy === 'net_proceeds' && net_price) {
        publication.net_price = parseFloat(net_price);
      } else if (markup_percentage) {
        publication.markup_percentage = parseFloat(markup_percentage);
      }

      return publication;
    });

    // POST to global items endpoint using SDK execute
    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.post(
        `/global/items`,
        {
          item_id,
          publications,
        }
      );
    });

    logger.info('Item published globally:', {
      itemId: item_id,
      targetSites: target_sites,
    });

    sendSuccess(res, {
      data: response.data,
      message: `Item published to ${target_sites.length} country(ies)`,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to publish item globally', error, {
      action: 'PUBLISH_GLOBAL_ITEM_ERROR',
      accountId: req.params.accountId
    });
  }
});

/**
 * DELETE /api/global-selling/:accountId/items/:itemId/:siteId
 * Remove item from a specific country
 */
router.delete('/:accountId/items/:itemId/:siteId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId, itemId, siteId } = req.params;

    // Close the item in the target marketplace using SDK
    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.put(
        `/items/${itemId}`,
        { status: 'closed' },
        {
          headers: { 'X-Site-Id': siteId }
        }
      );
    });

    logger.info('Item removed from marketplace:', {
      itemId,
      siteId,
    });

    sendSuccess(res, {
      message: `Item removed from ${siteId}`,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to remove item from marketplace', error, {
      action: 'REMOVE_GLOBAL_ITEM_ERROR',
      accountId: req.params.accountId
    });
  }
});

/**
 * GET /api/global-selling/:accountId/shipments
 * Get international shipments (CBT)
 */
router.get('/:accountId/shipments', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { offset = 0, limit = 50, status } = req.query;
    const mlUserId = req.mlAccount.mlUserId;

    const params = {
      offset,
      limit,
      seller: mlUserId,
    };

    if (status) {
      params.status = status;
    }

    // Get marketplace shipments using SDK execute
    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(
        `/marketplace/shipments/search`,
        { params }
      );
    });

    sendSuccess(res, response.data);
  } catch (error) {
    logger.error('Error fetching international shipments:', {
      error: error.message,
    });

    if (error.response?.status === 404) {
      return sendSuccess(res, {
        results: [],
        paging: { total: 0 }
      });
    }

    handleError(res, 500, 'Failed to fetch international shipments', error, {
      action: 'FETCH_GLOBAL_SHIPMENTS_ERROR',
      accountId: req.params.accountId
    });
  }
});

/**
 * GET /api/global-selling/:accountId/shipments/:shipmentId
 * Get shipment details with tracking
 */
router.get('/:accountId/shipments/:shipmentId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId, shipmentId } = req.params;

    // Get shipment details using SDK execute
    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(
        `/marketplace/shipments/${shipmentId}`
      );
    });

    sendSuccess(res, response.data);
  } catch (error) {
    handleError(res, 500, 'Failed to fetch shipment details', error, {
      action: 'FETCH_SHIPMENT_DETAILS_ERROR',
      accountId: req.params.accountId,
      shipmentId: req.params.shipmentId
    });
  }
});

/**
 * POST /api/global-selling/:accountId/shipments/:shipmentId/tracking
 * Update shipment tracking
 */
router.post('/:accountId/shipments/:shipmentId/tracking', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { accessToken } = req.mlAccount;
    const { tracking_number, carrier } = req.body;

    if (!tracking_number) {
      return res.status(400).json({
        success: false,
        error: 'tracking_number is required',
      });
    }

    const response = await axios.post(
      `${ML_API_BASE}/marketplace/shipments/${shipmentId}/tracking`,
      {
        tracking_number,
        carrier,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Tracking updated:', {
      shipmentId,
      trackingNumber: tracking_number,
    });

    res.json({
      success: true,
      data: response.data,
      message: 'Tracking updated successfully',
    });
  } catch (error) {
    logger.error('Error updating tracking:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/global-selling/:accountId/shipments/:shipmentId/label
 * Get shipping label for international shipment
 */
router.get('/:accountId/shipments/:shipmentId/label', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/marketplace/shipments/${shipmentId}/label`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching shipping label:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/global-selling/:accountId/orders
 * Get international orders
 */
router.get('/:accountId/orders', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { offset = 0, limit = 50, status } = req.query;
    const mlUserId = req.mlAccount.mlUserId;

    const params = {
      seller: mlUserId,
      offset,
      limit,
    };

    if (status) {
      params['order.status'] = status;
    }

    // Get marketplace orders (international) using SDK execute
    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(
        `/marketplace/orders/search`,
        { params }
      );
    });

    sendSuccess(res, response.data);
  } catch (error) {
    logger.error('Error fetching international orders:', {
      error: error.message,
    });

    if (error.response?.status === 404) {
      return sendSuccess(res, {
        results: [],
        paging: { total: 0 }
      });
    }

    handleError(res, 500, 'Failed to fetch international orders', error, {
      action: 'FETCH_GLOBAL_ORDERS_ERROR',
      accountId: req.params.accountId
    });
  }
});

/**
 * GET /api/global-selling/:accountId/working-days
 * Get working days for a country (holiday calendar)
 */
router.get('/:accountId/working-days/:siteId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accountId, siteId } = req.params;
    const { date_from, date_to } = req.query;

    // Get working days using SDK execute
    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.axiosInstance.get(
        `/sites/${siteId}/working_days`,
        {
          params: { date_from, date_to }
        }
      );
    });

    sendSuccess(res, response.data);
  } catch (error) {
    handleError(res, 500, 'Failed to fetch working days', error, {
      action: 'FETCH_WORKING_DAYS_ERROR',
      accountId: req.params.accountId,
      siteId: req.params.siteId
    });
  }
});


module.exports = router;
