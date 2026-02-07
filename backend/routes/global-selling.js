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
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const MLAccount = require('../db/models/MLAccount');
const { authenticateToken } = require('../middleware/auth');
const { handleError, sendSuccess } = require('../middleware/response-helpers');

const ML_API_BASE = 'https://api.mercadolibre.com';

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
    const { accessToken, mlUserId } = req.mlAccount;

    // Check if user is enabled for global selling
    const userResponse = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // Check marketplace availability
    let marketplaceStatus = [];
    try {
      const marketplaceResponse = await axios.get(
        `${ML_API_BASE}/marketplace/users/${mlUserId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      marketplaceStatus = marketplaceResponse.data || [];
    } catch (e) {
      // Marketplace endpoint may not be available for all users
      logger.info('Marketplace endpoint not available:', { userId: mlUserId });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: userResponse.data.id,
          nickname: userResponse.data.nickname,
          siteId: userResponse.data.site_id,
          sellerReputation: userResponse.data.seller_reputation,
        },
        globalSellingEnabled: marketplaceStatus.length > 0,
        availableCountries: CBT_COUNTRIES.filter(c => c.code !== userResponse.data.site_id),
        activeMarketplaces: marketplaceStatus,
      },
    });
  } catch (error) {
    logger.error('Error fetching global selling status:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
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
    const { accessToken, mlUserId } = req.mlAccount;
    const { offset = 0, limit = 50, country } = req.query;

    // Get user's items
    const itemsResponse = await axios.get(
      `${ML_API_BASE}/users/${mlUserId}/items/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          offset,
          limit,
          status: 'active',
        },
      }
    );

    const itemIds = itemsResponse.data.results || [];

    // Get details for each item including global publishing info
    const itemDetails = await Promise.all(
      itemIds.map(async (itemId) => {
        try {
          const itemResponse = await axios.get(
            `${ML_API_BASE}/items/${itemId}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          // Check for global variations/publications
          let globalPublications = [];
          try {
            const globalResponse = await axios.get(
              `${ML_API_BASE}/items/${itemId}/variations`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );
            // Check if item has global selling variations
            if (globalResponse.data?.global_item_id) {
              globalPublications.push({
                globalItemId: globalResponse.data.global_item_id,
              });
            }
          } catch (e) {
            // Global variations not available
          }

          return {
            id: itemResponse.data.id,
            title: itemResponse.data.title,
            price: itemResponse.data.price,
            currency: itemResponse.data.currency_id,
            thumbnail: itemResponse.data.thumbnail,
            status: itemResponse.data.status,
            availableQuantity: itemResponse.data.available_quantity,
            soldQuantity: itemResponse.data.sold_quantity,
            permalink: itemResponse.data.permalink,
            globalPublications,
          };
        } catch (e) {
          return null;
        }
      })
    );

    res.json({
      success: true,
      data: {
        items: itemDetails.filter(i => i !== null),
        paging: itemsResponse.data.paging,
      },
    });
  } catch (error) {
    logger.error('Error fetching global items:', { error: error.message });
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/global-selling/:accountId/items
 * Publish item globally using /global/items endpoint
 */
router.post('/:accountId/items', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken } = req.mlAccount;
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

    // POST to global items endpoint
    const response = await axios.post(
      `${ML_API_BASE}/global/items`,
      {
        item_id,
        publications,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Item published globally:', {
      itemId: item_id,
      targetSites: target_sites,
    });

    res.json({
      success: true,
      data: response.data,
      message: `Item published to ${target_sites.length} country(ies)`,
    });
  } catch (error) {
    logger.error('Error publishing item globally:', {
      error: error.message,
      response: error.response?.data,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * DELETE /api/global-selling/:accountId/items/:itemId/:siteId
 * Remove item from a specific country
 */
router.delete('/:accountId/items/:itemId/:siteId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { itemId, siteId } = req.params;
    const { accessToken } = req.mlAccount;

    // Close the item in the target marketplace
    const response = await axios.put(
      `${ML_API_BASE}/items/${itemId}`,
      {
        status: 'closed',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Site-Id': siteId,
        },
      }
    );

    logger.info('Item removed from marketplace:', {
      itemId,
      siteId,
    });

    res.json({
      success: true,
      message: `Item removed from ${siteId}`,
    });
  } catch (error) {
    logger.error('Error removing item from marketplace:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/global-selling/:accountId/shipments
 * Get international shipments (CBT)
 */
router.get('/:accountId/shipments', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { accessToken, mlUserId } = req.mlAccount;
    const { offset = 0, limit = 50, status } = req.query;

    const params = {
      offset,
      limit,
    };

    if (status) {
      params.status = status;
    }

    // Get marketplace shipments
    const response = await axios.get(
      `${ML_API_BASE}/marketplace/shipments/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          ...params,
          seller: mlUserId,
        },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching international shipments:', {
      error: error.message,
    });

    // Return empty array if endpoint not available
    if (error.response?.status === 404) {
      return res.json({
        success: true,
        data: { results: [], paging: { total: 0 } },
        message: 'No international shipments found',
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/global-selling/:accountId/shipments/:shipmentId
 * Get shipment details with tracking
 */
router.get('/:accountId/shipments/:shipmentId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { accessToken } = req.mlAccount;

    const response = await axios.get(
      `${ML_API_BASE}/marketplace/shipments/${shipmentId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching shipment details:', {
      error: error.message,
      shipmentId: req.params.shipmentId,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
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
    const { accessToken, mlUserId } = req.mlAccount;
    const { offset = 0, limit = 50, status } = req.query;

    const params = {
      seller: mlUserId,
      offset,
      limit,
    };

    if (status) {
      params['order.status'] = status;
    }

    // Get marketplace orders (international)
    const response = await axios.get(
      `${ML_API_BASE}/marketplace/orders/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching international orders:', {
      error: error.message,
    });

    if (error.response?.status === 404) {
      return res.json({
        success: true,
        data: { results: [], paging: { total: 0 } },
        message: 'No international orders found',
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/global-selling/:accountId/working-days
 * Get working days for a country (holiday calendar)
 */
router.get('/:accountId/working-days/:siteId', authenticateToken, getMLAccount, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { accessToken } = req.mlAccount;
    const { date_from, date_to } = req.query;

    const response = await axios.get(
      `${ML_API_BASE}/sites/${siteId}/working_days`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          date_from,
          date_to,
        },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error('Error fetching working days:', {
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    });
  }
});


module.exports = router;
