/**
 * Payments Routes
 * Manage payments/transactions from Mercado Livre
 *
 * GET    /api/payments                           - List all payments for user
 * GET    /api/payments/:accountId                - List payments for specific account
 * GET    /api/payments/:accountId/:paymentId     - Get payment details
 * POST   /api/payments/:accountId/sync            - Sync payments from ML orders
 * GET    /api/payments/:accountId/stats           - Get payment statistics
 * POST   /api/payments/:accountId/:paymentId/refund - Request refund for payment
 */

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const Payment = require('../db/models/Payment');
const Order = require('../db/models/Order');
const MLAccount = require('../db/models/MLAccount');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Unified error response handler
 */
function handleError(res, statusCode, message, error, context = {}) {
  logger.error({
    action: context.action || 'ERROR',
    error: error?.message || error,
    status: error?.response?.status,
    ...context,
  });

  return res.status(statusCode).json({
    success: false,
    message: message || 'An error occurred',
    error: error?.message || error,
  });
}

/**
 * Unified success response handler
 */
function sendSuccess(res, data, message = null, statusCode = 200) {
  const response = {
    success: true,
  };

  if (message) {
    response.message = message;
  }

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
}

/**
 * Verify account exists and belongs to user
 */
async function fetchAndVerifyAccount(accountId, userId) {
  const account = await MLAccount.findOne({ id: accountId, userId });
  return account;
}

/**
 * Build payment query filters
 */
function buildPaymentFilters(queryParams, accountId = null) {
  const filters = {
    status: queryParams.status,
    paymentType: queryParams.paymentType,
    dateFrom: queryParams.dateFrom,
    dateTo: queryParams.dateTo,
    minAmount: queryParams.minAmount ? parseFloat(queryParams.minAmount) : undefined,
    maxAmount: queryParams.maxAmount ? parseFloat(queryParams.maxAmount) : undefined,
    refundStatus: queryParams.refundStatus,
    limit: parseInt(queryParams.limit || 20),
    offset: parseInt(queryParams.offset || 0),
    sort: queryParams.sort || '-dateCreated',
  };

  // Remove undefined values
  Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

  return filters;
}

/**
 * Create payment from order payment data
 */
function createPaymentFromData(accountId, userId, order, paymentData) {
  return new Payment({
    accountId,
    userId,
    orderId: order.id,
    mlPaymentId: paymentData.id,
    mlOrderId: paymentData.orderId || order.mlOrderId,
    status: paymentData.status,
    statusDetail: paymentData.statusDetail,
    payerId: paymentData.payerId,
    paymentMethodId: paymentData.paymentMethodId,
    paymentType: paymentData.paymentType,
    cardId: paymentData.cardId,
    issuerID: paymentData.issuerID,
    installments: paymentData.installments,
    installmentAmount: paymentData.installmentAmount,
    transactionAmount: paymentData.transactionAmount,
    totalPaidAmount: paymentData.totalPaidAmount,
    shippingCost: paymentData.shippingCost,
    marketplaceFee: paymentData.marketplaceFee,
    couponAmount: paymentData.couponAmount,
    taxesAmount: paymentData.taxesAmount,
    overpaidAmount: paymentData.overpaidAmount,
    currencyId: paymentData.currencyId,
    dateCreated: paymentData.dateCreated,
    dateLastModified: paymentData.dateLastModified,
    dateApproved: paymentData.dateApproved,
    transactionOrderId: paymentData.transactionOrderId,
    authorizationCode: paymentData.authorizationCode,
    externalReference: paymentData.externalReference,
    couponId: paymentData.couponId,
    atmTransferReference: paymentData.atmTransferReference,
    reason: paymentData.reason,
    operationType: paymentData.operationType,
    availableActions: paymentData.availableActions,
    activationUri: paymentData.activationUri,
    deferredPeriod: paymentData.deferredPeriod,
  });
}

/**
 * Update existing payment from order payment data
 */
async function updatePaymentFromData(existingPayment, paymentData) {
  existingPayment.status = paymentData.status;
  existingPayment.statusDetail = paymentData.statusDetail;
  existingPayment.dateLastModified = paymentData.dateLastModified;
  existingPayment.lastSyncedAt = new Date();
  await existingPayment.save();
  return existingPayment;
}

/**
 * Process payments from a single order
 */
async function processOrderPayments(order, accountId, userId) {
  const results = { synced: 0, skipped: 0, errors: [] };

  if (!order.payments || order.payments.length === 0) {
    results.skipped++;
    return results;
  }

  for (const paymentData of order.payments) {
    try {
      // Check if payment already exists
      const existingPayment = await Payment.findOne({
        mlPaymentId: paymentData.id,
      });

      if (existingPayment) {
        // Update existing payment
        await updatePaymentFromData(existingPayment, paymentData);
      } else {
        // Create new payment
        const newPayment = createPaymentFromData(accountId, userId, order, paymentData);
        await newPayment.save();
        results.synced++;
      }
    } catch (paymentError) {
      results.errors.push({
        orderId: order.mlOrderId,
        paymentId: paymentData.id,
        error: paymentError.message,
      });
    }
  }

  return results;
}

/**
 * Make ML API refund request
 */
async function requestMLRefund(paymentId, mlToken) {
  return axios.post(
    `${ML_API_BASE}/collections/${paymentId}/refunds`,
    {},
    {
      headers: {
        Authorization: `Bearer ${mlToken}`,
      },
    }
  );
}

/**
 * Update payment with refund information
 */
async function updatePaymentWithRefund(payment, reason, refundAmount) {
  payment.refundStatus = 'requested';
  payment.refundAmount = refundAmount || payment.transactionAmount;
  payment.refundReason = reason || 'Requested via dashboard';
  payment.refundRequestedAt = new Date();
  await payment.save();
  return payment;
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/payments
 * List all payments for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status, paymentType, sort = '-dateCreated' } = req.query;

    const query = { userId: req.user.userId };
    if (status) query.status = status;
    if (paymentType) query.paymentType = paymentType;

    const payments = await Payment.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Payment.countDocuments(query);

    return sendSuccess(res, {
      payments: payments.map(p => p.getSummary()),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    return handleError(res, 500, 'Failed to fetch payments', error, {
      action: 'GET_PAYMENTS_ERROR',
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/payments/:accountId
 * List payments for a specific account with filters
 */
router.get('/:accountId', authenticateToken, validateMLToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 20, offset = 0, status, paymentType, dateFrom, dateTo, minAmount, maxAmount, refundStatus, sort = '-dateCreated' } = req.query;

    // Verify account exists and belongs to user
    const account = await fetchAndVerifyAccount(accountId, req.user.userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Build search filters
    const filters = buildPaymentFilters({
      status,
      paymentType,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      refundStatus,
      limit,
      offset,
      sort,
    });

    const result = await Payment.search(accountId, filters);

    return sendSuccess(res, {
      payments: result.payments.map(p => p.getSummary()),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (error) {
    return handleError(res, 500, 'Failed to fetch account payments', error, {
      action: 'GET_ACCOUNT_PAYMENTS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/payments/:accountId/stats
 * Get payment statistics for an account
 */
router.get('/:accountId/stats', authenticateToken, validateMLToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify account exists
    const account = await fetchAndVerifyAccount(accountId, req.user.userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Build date range
    const dateRange = {};
    if (startDate) dateRange.start = startDate;
    if (endDate) dateRange.end = endDate;

    // Get statistics
    const stats = await Payment.getStats(accountId, dateRange);

    return sendSuccess(res, stats);
  } catch (error) {
    return handleError(res, 500, 'Failed to fetch payment statistics', error, {
      action: 'GET_PAYMENT_STATS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/payments/:accountId/:paymentId
 * Get detailed payment information
 */
router.get('/:accountId/:paymentId', authenticateToken, validateMLToken, async (req, res) => {
  try {
    const { accountId, paymentId } = req.params;

    // Verify account exists
    const account = await fetchAndVerifyAccount(accountId, req.user.userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Find payment
    const payment = await Payment.findOne({
      id: paymentId,
      accountId,
      userId: req.user.userId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    return sendSuccess(res, payment.getDetails());
  } catch (error) {
    return handleError(res, 500, 'Failed to fetch payment details', error, {
      action: 'GET_PAYMENT_DETAIL_ERROR',
      accountId: req.params.accountId,
      paymentId: req.params.paymentId,
      userId: req.user.userId,
    });
  }
});

/**
 * POST /api/payments/:accountId/sync
 * Sync payments from Mercado Livre orders
 */
router.post('/:accountId/sync', authenticateToken, validateMLToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account exists
    const account = await fetchAndVerifyAccount(accountId, req.user.userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Get all orders for the account
    const orders = await Order.find({
      accountId,
      userId: req.user.userId,
    });

    let totalSynced = 0;
    let totalSkipped = 0;
    const allErrors = [];

    // Process each order's payments
    for (const order of orders) {
      try {
        const result = await processOrderPayments(order, accountId, req.user.userId);
        totalSynced += result.synced;
        totalSkipped += result.skipped;
        allErrors.push(...result.errors);
      } catch (orderError) {
        allErrors.push({
          orderId: order.mlOrderId,
          error: orderError.message,
        });
      }
    }

    logger.info({
      action: 'SYNC_PAYMENTS',
      accountId,
      userId: req.user.userId,
      syncedCount: totalSynced,
      skippedCount: totalSkipped,
      errorCount: allErrors.length,
    });

    return sendSuccess(res, {
      syncedCount: totalSynced,
      skippedCount: totalSkipped,
      errorCount: allErrors.length,
      errors: allErrors.length > 0 ? allErrors : undefined,
    }, 'Payments synced successfully');
  } catch (error) {
    return handleError(res, 500, 'Failed to sync payments', error, {
      action: 'SYNC_PAYMENTS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * POST /api/payments/:accountId/:paymentId/refund
 * Request refund for a payment
 */
router.post('/:accountId/:paymentId/refund', authenticateToken, validateMLToken, async (req, res) => {
  try {
    const { accountId, paymentId } = req.params;
    const { reason, amount } = req.body;
    const mlToken = req.mlToken;

    // Verify account exists
    const account = await fetchAndVerifyAccount(accountId, req.user.userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Find payment
    const payment = await Payment.findOne({
      id: paymentId,
      accountId,
      userId: req.user.userId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check if payment can be refunded
    if (!payment.canBeRefunded()) {
      return res.status(400).json({
        success: false,
        message: 'Payment cannot be refunded',
        details: {
          currentStatus: payment.status,
          refundStatus: payment.refundStatus,
        },
      });
    }

    try {
      // Call Mercado Libre API to request refund
      const mlResponse = await requestMLRefund(payment.mlPaymentId, mlToken);

      // Update payment with refund information
      const updatedPayment = await updatePaymentWithRefund(payment, reason, amount);

      logger.info({
        action: 'REQUEST_PAYMENT_REFUND',
        accountId,
        paymentId: payment.mlPaymentId,
        refundAmount: updatedPayment.refundAmount,
        mlRefundId: mlResponse.data?.id,
      });

      return sendSuccess(res, {
        paymentId: payment.id,
        mlPaymentId: payment.mlPaymentId,
        refundStatus: updatedPayment.refundStatus,
        refundAmount: updatedPayment.refundAmount,
        refundRequestedAt: updatedPayment.refundRequestedAt,
        mlResponse: mlResponse.data,
      }, 'Refund requested successfully');
    } catch (mlError) {
      logger.error({
        action: 'REQUEST_PAYMENT_REFUND_ML_ERROR',
        accountId,
        paymentId: payment.mlPaymentId,
        mlError: mlError.response?.data || mlError.message,
      });

      return res.status(400).json({
        success: false,
        message: 'Failed to request refund from Mercado Livre',
        error: mlError.response?.data?.message || mlError.message,
      });
    }
  } catch (error) {
    return handleError(res, 500, 'Failed to request refund', error, {
      action: 'REQUEST_PAYMENT_REFUND_ERROR',
      accountId: req.params.accountId,
      paymentId: req.params.paymentId,
      userId: req.user.userId,
    });
  }
});

module.exports = router;
