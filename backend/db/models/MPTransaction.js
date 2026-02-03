/**
 * MP Transaction Model
 * Stores Mercado Pago transaction records
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const mpTransactionSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `mptx_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
      unique: true,
      index: true,
    },

    // Relationship
    userId: {
      type: String,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    accountId: {
      type: String,
      ref: 'MLAccount',
      index: true,
    },

    // Transaction Type
    type: {
      type: String,
      enum: ['payment', 'order', 'preference', 'subscription', 'refund', 'chargeback'],
      required: true,
      index: true,
    },

    // Mercado Pago IDs
    mpId: {
      type: String,
      required: true,
      index: true,
    },
    mpOrderId: {
      type: String,
      index: true,
    },
    mpPaymentId: {
      type: String,
      index: true,
    },
    mpPreferenceId: {
      type: String,
      index: true,
    },
    mpSubscriptionId: {
      type: String,
      index: true,
    },

    // External Reference
    externalReference: {
      type: String,
      index: true,
    },

    // Status
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
    statusDetail: String,

    // Amounts
    amount: {
      type: Number,
      required: true,
    },
    netAmount: Number,
    feeAmount: Number,
    refundedAmount: Number,
    currencyId: {
      type: String,
      default: 'BRL',
    },

    // Payment Method
    paymentMethodId: String,
    paymentTypeId: {
      type: String,
      enum: ['credit_card', 'debit_card', 'ticket', 'bank_transfer', 'atm', 'account_money', 'pix', null],
    },
    installments: Number,

    // Payer Info
    payer: {
      id: String,
      email: String,
      firstName: String,
      lastName: String,
      identification: {
        type: String,
        number: String,
      },
      phone: {
        areaCode: String,
        number: String,
      },
    },

    // Items (for preferences/orders)
    items: [{
      id: String,
      title: String,
      description: String,
      pictureUrl: String,
      categoryId: String,
      quantity: Number,
      currencyId: String,
      unitPrice: Number,
    }],

    // Dates from MP
    dateCreated: Date,
    dateApproved: Date,
    dateLastUpdated: Date,

    // URLs (for preferences)
    initPoint: String,
    sandboxInitPoint: String,
    backUrls: {
      success: String,
      failure: String,
      pending: String,
    },

    // Notification URL
    notificationUrl: String,

    // Full MP Response (for debugging)
    mpResponse: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Webhook tracking
    lastWebhookAt: Date,
    webhookCount: {
      type: Number,
      default: 0,
    },

    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'mp_transactions',
  }
);

// Indexes
mpTransactionSchema.index({ userId: 1, createdAt: -1 });
mpTransactionSchema.index({ type: 1, status: 1 });
mpTransactionSchema.index({ mpId: 1, type: 1 });
mpTransactionSchema.index({ externalReference: 1 });

/**
 * Get transaction summary
 */
mpTransactionSchema.methods.getSummary = function () {
  return {
    id: this.id,
    type: this.type,
    mpId: this.mpId,
    status: this.status,
    amount: this.amount,
    currencyId: this.currencyId,
    paymentMethodId: this.paymentMethodId,
    payerEmail: this.payer?.email,
    dateCreated: this.dateCreated,
    createdAt: this.createdAt,
  };
};

/**
 * Static: Get statistics for user
 */
mpTransactionSchema.statics.getStats = async function (userId, dateRange = {}) {
  const query = { userId };

  if (dateRange.start || dateRange.end) {
    query.createdAt = {};
    if (dateRange.start) query.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) query.createdAt.$lte = new Date(dateRange.end);
  }

  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: { type: '$type', status: '$status' },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.type': 1, count: -1 } },
  ]);

  // Group by type
  const byType = {};
  stats.forEach((s) => {
    if (!byType[s._id.type]) {
      byType[s._id.type] = { total: 0, totalAmount: 0, byStatus: {} };
    }
    byType[s._id.type].total += s.count;
    byType[s._id.type].totalAmount += s.totalAmount;
    byType[s._id.type].byStatus[s._id.status] = {
      count: s.count,
      amount: s.totalAmount,
    };
  });

  return byType;
};

/**
 * Static: Search transactions
 */
mpTransactionSchema.statics.search = async function (userId, filters = {}) {
  const {
    type,
    status,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    externalReference,
    limit = 20,
    offset = 0,
    sort = '-createdAt',
  } = filters;

  const query = { userId };

  if (type) query.type = type;
  if (status) query.status = status;
  if (externalReference) query.externalReference = externalReference;

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    query.amount = {};
    if (minAmount !== undefined) query.amount.$gte = minAmount;
    if (maxAmount !== undefined) query.amount.$lte = maxAmount;
  }

  const transactions = await this.find(query)
    .sort(sort)
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .select('-mpResponse');

  const total = await this.countDocuments(query);

  return {
    transactions,
    total,
    limit: parseInt(limit),
    offset: parseInt(offset),
  };
};

module.exports = mongoose.model('MPTransaction', mpTransactionSchema);
