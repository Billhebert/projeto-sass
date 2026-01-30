/**
 * Payment Model
 * Stores payment information from Mercado Livre orders
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const paymentSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `payment_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
      unique: true,
      index: true,
    },

    // Relationship
    accountId: {
      type: String,
      ref: 'MLAccount',
      required: [true, 'Account ID is required'],
      index: true,
    },
    userId: {
      type: String,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    orderId: {
      type: String,
      ref: 'Order',
      required: [true, 'Order ID is required'],
      index: true,
    },

    // Mercado Livre Payment Info
    mlPaymentId: {
      type: String,
      required: [true, 'Mercado Livre payment ID is required'],
      unique: true,
      index: true,
    },
    mlOrderId: {
      type: String,
      required: true,
      index: true,
    },

    // Payment Status
    status: {
      type: String,
      enum: [
        'pending',
        'approved',
        'authorized',
        'in_process',
        'in_mediation',
        'rejected',
        'cancelled',
        'refunded',
        'charged_back',
      ],
      default: 'pending',
      index: true,
    },
    statusDetail: {
      type: String,
      default: null,
    },

    // Payer Information
    payerId: {
      type: String,
      index: true,
    },
    payerNickname: String,

    // Payment Method
    paymentMethodId: String,
    paymentType: {
      type: String,
      enum: ['account_money', 'ticket', 'bank_transfer', 'atm', 'credit_card', 'debit_card', 'prepaid_card'],
      default: null,
    },

    // Credit Card Details (if applicable)
    cardId: String,
    issuerID: String,
    installments: Number,
    installmentAmount: Number,

    // Amounts
    transactionAmount: {
      type: Number,
      required: true,
    },
    totalPaidAmount: Number,
    shippingCost: Number,
    marketplaceFee: Number,
    couponAmount: Number,
    taxesAmount: Number,
    overpaidAmount: Number,

    // Currency
    currencyId: {
      type: String,
      default: 'BRL',
    },

    // Dates
    dateCreated: {
      type: Date,
      required: true,
      index: true,
    },
    dateLastModified: Date,
    dateApproved: Date,

    // References
    transactionOrderId: String,
    authorizationCode: String,
    externalReference: String,

    // Coupon
    couponId: String,

    // ATM Transfer (if applicable)
    atmTransferReference: {
      companyId: String,
      transactionId: String,
    },

    // Additional Info
    reason: String,
    operationType: String,
    availableActions: [String],
    activationUri: String,
    deferredPeriod: String,

    // Refund tracking
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'approved', 'rejected', 'completed'],
      default: 'none',
    },
    refundAmount: Number,
    refundReason: String,
    refundRequestedAt: Date,
    refundCompletedAt: Date,

    // Sync tracking
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'payments',
  },
);

// Indexes for better query performance
paymentSchema.index({ accountId: 1, dateCreated: -1 });
paymentSchema.index({ userId: 1, dateCreated: -1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ refundStatus: 1 });

/**
 * Instance Methods
 */

/**
 * Get summary of payment for list views
 */
paymentSchema.methods.getSummary = function () {
  return {
    id: this.id,
    mlPaymentId: this.mlPaymentId,
    orderId: this.orderId,
    mlOrderId: this.mlOrderId,
    status: this.status,
    statusDetail: this.statusDetail,
    transactionAmount: this.transactionAmount,
    totalPaidAmount: this.totalPaidAmount,
    paymentType: this.paymentType,
    paymentMethodId: this.paymentMethodId,
    payerId: this.payerId,
    dateCreated: this.dateCreated,
    dateApproved: this.dateApproved,
    refundStatus: this.refundStatus,
    refundAmount: this.refundAmount,
  };
};

/**
 * Get detailed payment information
 */
paymentSchema.methods.getDetails = function () {
  return {
    id: this.id,
    mlPaymentId: this.mlPaymentId,
    orderId: this.orderId,
    mlOrderId: this.mlOrderId,
    status: this.status,
    statusDetail: this.statusDetail,
    payerId: this.payerId,
    payerNickname: this.payerNickname,
    paymentMethodId: this.paymentMethodId,
    paymentType: this.paymentType,
    cardId: this.cardId,
    issuerID: this.issuerID,
    installments: this.installments,
    installmentAmount: this.installmentAmount,
    transactionAmount: this.transactionAmount,
    totalPaidAmount: this.totalPaidAmount,
    shippingCost: this.shippingCost,
    marketplaceFee: this.marketplaceFee,
    couponAmount: this.couponAmount,
    taxesAmount: this.taxesAmount,
    overpaidAmount: this.overpaidAmount,
    currencyId: this.currencyId,
    dateCreated: this.dateCreated,
    dateLastModified: this.dateLastModified,
    dateApproved: this.dateApproved,
    transactionOrderId: this.transactionOrderId,
    authorizationCode: this.authorizationCode,
    externalReference: this.externalReference,
    couponId: this.couponId,
    atmTransferReference: this.atmTransferReference,
    reason: this.reason,
    operationType: this.operationType,
    availableActions: this.availableActions,
    activationUri: this.activationUri,
    deferredPeriod: this.deferredPeriod,
    refundStatus: this.refundStatus,
    refundAmount: this.refundAmount,
    refundReason: this.refundReason,
    refundRequestedAt: this.refundRequestedAt,
    refundCompletedAt: this.refundCompletedAt,
    lastSyncedAt: this.lastSyncedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Check if payment can be refunded
 */
paymentSchema.methods.canBeRefunded = function () {
  return (
    (this.status === 'approved' || this.status === 'authorized') &&
    this.refundStatus === 'none' &&
    this.transactionAmount > 0
  );
};

/**
 * Static Methods
 */

/**
 * Get payment statistics for account
 */
paymentSchema.statics.getStats = async function (accountId, dateRange = {}) {
  const query = { accountId };

  // Add date range filters
  if (dateRange.start || dateRange.end) {
    query.dateCreated = {};
    if (dateRange.start) {
      query.dateCreated.$gte = new Date(dateRange.start);
    }
    if (dateRange.end) {
      query.dateCreated.$lte = new Date(dateRange.end);
    }
  }

  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$transactionAmount' },
        avgAmount: { $avg: '$transactionAmount' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const refundStats = await this.countDocuments({
    ...query,
    refundStatus: { $in: ['requested', 'approved', 'completed'] },
  });

  return {
    byStatus: stats,
    pendingRefunds: refundStats,
  };
};

/**
 * Search payments with filters
 */
paymentSchema.statics.search = async function (accountId, filters = {}) {
  const {
    status,
    paymentType,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    refundStatus,
    limit = 20,
    offset = 0,
    sort = '-dateCreated',
  } = filters;

  const query = { accountId };

  if (status) query.status = status;
  if (paymentType) query.paymentType = paymentType;
  if (refundStatus) query.refundStatus = refundStatus;

  if (dateFrom || dateTo) {
    query.dateCreated = {};
    if (dateFrom) query.dateCreated.$gte = new Date(dateFrom);
    if (dateTo) query.dateCreated.$lte = new Date(dateTo);
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    query.transactionAmount = {};
    if (minAmount !== undefined) query.transactionAmount.$gte = minAmount;
    if (maxAmount !== undefined) query.transactionAmount.$lte = maxAmount;
  }

  const payments = await this.find(query)
    .sort(sort)
    .limit(parseInt(limit))
    .skip(parseInt(offset));

  const total = await this.countDocuments(query);

  return {
    payments,
    total,
    limit: parseInt(limit),
    offset: parseInt(offset),
  };
};

module.exports = mongoose.model('Payment', paymentSchema);
