/**
 * Invoices Routes
 * Manage invoices and billing from Mercado Livre
 *
 * GET    /api/invoices/:accountId              - List invoices for account
 * GET    /api/invoices/:accountId/:invoiceId   - Get invoice details
 * GET    /api/invoices/:accountId/order/:orderId - Get invoice for order
 * POST   /api/invoices/:accountId/order/:orderId - Create/send invoice for order
 */

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const Order = require('../db/models/Order');
const MLAccount = require('../db/models/MLAccount');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * GET /api/invoices/:accountId
 * List invoices for account
 */
router.get('/:accountId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 20, offset = 0, status } = req.query;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Fetch invoices from ML
    const params = {
      seller_id: account.mlUserId,
      limit: parseInt(limit),
      offset: parseInt(offset),
    };
    if (status) params.status = status;

    const response = await axios.get(
      `${ML_API_BASE}/invoices/search`,
      { headers, params }
    ).catch(err => {
      logger.warn({
        action: 'FETCH_INVOICES_ERROR',
        accountId,
        error: err.response?.data || err.message,
      });
      return { data: { results: [], paging: { total: 0 } } };
    });

    res.json({
      success: true,
      data: {
        invoices: response.data.results || [],
        paging: response.data.paging || { total: 0, limit, offset },
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_INVOICES_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message,
    });
  }
});

/**
 * GET /api/invoices/:accountId/:invoiceId
 * Get invoice details
 */
router.get('/:accountId/:invoiceId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, invoiceId } = req.params;
    const account = req.mlAccount;

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(
      `${ML_API_BASE}/invoices/${invoiceId}`,
      { headers }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'GET_INVOICE_ERROR',
      invoiceId: req.params.invoiceId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * GET /api/invoices/:accountId/order/:orderId
 * Get invoice for specific order
 */
router.get('/:accountId/order/:orderId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, orderId } = req.params;
    const account = req.mlAccount;

    // Find order
    const order = await Order.findOne({
      $or: [{ id: orderId }, { mlOrderId: orderId }],
      accountId,
      userId: req.user.userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get billing info
    const billingRes = await axios.get(
      `${ML_API_BASE}/orders/${order.mlOrderId}/billing_info`,
      { headers }
    ).catch(err => ({ data: null }));

    // Get invoice if exists
    const invoiceRes = await axios.get(
      `${ML_API_BASE}/packs/${order.packId || order.mlOrderId}/fiscal_documents`,
      { headers }
    ).catch(err => ({ data: { fiscal_documents: [] } }));

    res.json({
      success: true,
      data: {
        order: order.getSummary(),
        billingInfo: billingRes.data,
        fiscalDocuments: invoiceRes.data.fiscal_documents || [],
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ORDER_INVOICE_ERROR',
      orderId: req.params.orderId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch order invoice',
      error: error.message,
    });
  }
});

/**
 * POST /api/invoices/:accountId/order/:orderId
 * Create/send invoice for order
 */
router.post('/:accountId/order/:orderId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, orderId } = req.params;
    const { fiscalDocument } = req.body;
    const account = req.mlAccount;

    // Find order
    const order = await Order.findOne({
      $or: [{ id: orderId }, { mlOrderId: orderId }],
      accountId,
      userId: req.user.userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (!fiscalDocument) {
      return res.status(400).json({
        success: false,
        message: 'Fiscal document data is required',
      });
    }

    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Send fiscal document
    const response = await axios.post(
      `${ML_API_BASE}/packs/${order.packId || order.mlOrderId}/fiscal_documents`,
      {
        fiscal_document: fiscalDocument,
      },
      { headers }
    );

    logger.info({
      action: 'INVOICE_CREATED',
      orderId: order.mlOrderId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Invoice created successfully',
      data: response.data,
    });
  } catch (error) {
    logger.error({
      action: 'CREATE_INVOICE_ERROR',
      orderId: req.params.orderId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to create invoice',
      error: error.response?.data?.message || error.message,
    });
  }
});

module.exports = router;
