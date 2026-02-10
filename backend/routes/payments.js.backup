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

    res.json({
      success: true,
      data: {
        payments: payments.map(p => p.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_PAYMENTS_ERROR',
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/:accountId
 * List payments for a specific account with filters
 */
router.get(
  '/:accountId',
  authenticateToken,
  validateMLToken,
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const {
        limit = 20,
        offset = 0,
        status,
        paymentType,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        refundStatus,
        sort = '-dateCreated',
      } = req.query;

      // Verify account exists and belongs to user
      const account = await MLAccount.findOne({
        id: accountId,
        userId: req.user.userId,
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found',
        });
      }

      // Build search filters
      const filters = {
        status,
        paymentType,
        dateFrom,
        dateTo,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        refundStatus,
        limit: parseInt(limit),
        offset: parseInt(offset),
        sort,
      };

      const result = await Payment.search(accountId, filters);

      res.json({
        success: true,
        data: {
          payments: result.payments.map(p => p.getSummary()),
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
      });
    } catch (error) {
      logger.error({
        action: 'GET_ACCOUNT_PAYMENTS_ERROR',
        accountId: req.params.accountId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch account payments',
        error: error.message,
      });
    }
  },
);

/**
 * GET /api/payments/:accountId/stats
 * Get payment statistics for an account
 */
router.get(
  '/:accountId/stats',
  authenticateToken,
  validateMLToken,
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { startDate, endDate } = req.query;

      // Verify account exists
      const account = await MLAccount.findOne({
        id: accountId,
        userId: req.user.userId,
      });

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

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error({
        action: 'GET_PAYMENT_STATS_ERROR',
        accountId: req.params.accountId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment statistics',
        error: error.message,
      });
    }
  },
);

/**
 * GET /api/payments/:accountId/:paymentId
 * Get detailed payment information
 */
router.get(
  '/:accountId/:paymentId',
  authenticateToken,
  validateMLToken,
  async (req, res) => {
    try {
      const { accountId, paymentId } = req.params;

      // Verify account exists
      const account = await MLAccount.findOne({
        id: accountId,
        userId: req.user.userId,
      });

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

      res.json({
        success: true,
        data: payment.getDetails(),
      });
    } catch (error) {
      logger.error({
        action: 'GET_PAYMENT_DETAIL_ERROR',
        accountId: req.params.accountId,
        paymentId: req.params.paymentId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment details',
        error: error.message,
      });
    }
  },
);

/**
 * POST /api/payments/:accountId/sync
 * Sync payments from Mercado Livre orders
 */
router.post(
  '/:accountId/sync',
  authenticateToken,
  validateMLToken,
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const mlToken = req.mlToken;

      // Verify account exists
      const account = await MLAccount.findOne({
        id: accountId,
        userId: req.user.userId,
      });

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

      let syncedCount = 0;
      let skippedCount = 0;
      const errors = [];

      // Process each order's payments
      for (const order of orders) {
        try {
          if (!order.payments || order.payments.length === 0) {
            skippedCount++;
            continue;
          }

          // Process each payment in the order
          for (const paymentData of order.payments) {
            try {
              // Check if payment already exists
              const existingPayment = await Payment.findOne({
                mlPaymentId: paymentData.id,
              });

              if (existingPayment) {
                // Update existing payment
                existingPayment.status = paymentData.status;
                existingPayment.statusDetail = paymentData.statusDetail;
                existingPayment.dateLastModified = paymentData.dateLastModified;
                existingPayment.lastSyncedAt = new Date();
                await existingPayment.save();
              } else {
                // Create new payment
                const newPayment = new Payment({
                  accountId,
                  userId: req.user.userId,
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

                await newPayment.save();
                syncedCount++;
              }
            } catch (paymentError) {
              errors.push({
                orderId: order.mlOrderId,
                paymentId: paymentData.id,
                error: paymentError.message,
              });
            }
          }
        } catch (orderError) {
          errors.push({
            orderId: order.mlOrderId,
            error: orderError.message,
          });
        }
      }

      logger.info({
        action: 'SYNC_PAYMENTS',
        accountId,
        userId: req.user.userId,
        syncedCount,
        skippedCount,
        errorCount: errors.length,
      });

      res.json({
        success: true,
        message: 'Payments synced successfully',
        data: {
          syncedCount,
          skippedCount,
          errorCount: errors.length,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } catch (error) {
      logger.error({
        action: 'SYNC_PAYMENTS_ERROR',
        accountId: req.params.accountId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to sync payments',
        error: error.message,
      });
    }
  },
);

/**
 * POST /api/payments/:accountId/:paymentId/refund
 * Request refund for a payment
 */
router.post(
  '/:accountId/:paymentId/refund',
  authenticateToken,
  validateMLToken,
  async (req, res) => {
    try {
      const { accountId, paymentId } = req.params;
      const { reason, amount } = req.body;
      const mlToken = req.mlToken;

      // Verify account exists
      const account = await MLAccount.findOne({
        id: accountId,
        userId: req.user.userId,
      });

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
        const refundAmount = amount || payment.transactionAmount;

        const mlResponse = await axios.post(
          `${ML_API_BASE}/collections/${payment.mlPaymentId}/refunds`,
          {},
          {
            headers: {
              Authorization: `Bearer ${mlToken}`,
            },
          },
        );

        // Update payment with refund information
        payment.refundStatus = 'requested';
        payment.refundAmount = refundAmount;
        payment.refundReason = reason || 'Requested via dashboard';
        payment.refundRequestedAt = new Date();
        await payment.save();

        logger.info({
          action: 'REQUEST_PAYMENT_REFUND',
          accountId,
          paymentId: payment.mlPaymentId,
          refundAmount,
          mlRefundId: mlResponse.data?.id,
        });

        res.json({
          success: true,
          message: 'Refund requested successfully',
          data: {
            paymentId: payment.id,
            mlPaymentId: payment.mlPaymentId,
            refundStatus: payment.refundStatus,
            refundAmount: payment.refundAmount,
            refundRequestedAt: payment.refundRequestedAt,
            mlResponse: mlResponse.data,
          },
        });
      } catch (mlError) {
        logger.error({
          action: 'REQUEST_PAYMENT_REFUND_ML_ERROR',
          accountId,
          paymentId: payment.mlPaymentId,
          mlError: mlError.response?.data || mlError.message,
        });

        res.status(400).json({
          success: false,
          message: 'Failed to request refund from Mercado Livre',
          error: mlError.response?.data?.message || mlError.message,
        });
      }
    } catch (error) {
      logger.error({
        action: 'REQUEST_PAYMENT_REFUND_ERROR',
        accountId: req.params.accountId,
        paymentId: req.params.paymentId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to request refund',
        error: error.message,
      });
    }
  },
);

module.exports = router;
