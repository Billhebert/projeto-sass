/**
 * MP Subscription Model
 * Stores Mercado Pago subscription/preapproval records
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const mpSubscriptionSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `mpsub_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
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
    customerId: {
      type: String,
      ref: 'MPCustomer',
      index: true,
    },

    // Mercado Pago IDs
    mpSubscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mpPlanId: {
      type: String,
      index: true,
    },
    mpPayerId: String,

    // External Reference
    externalReference: {
      type: String,
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'authorized', 'paused', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Subscription Details
    reason: String,
    autoRecurring: {
      frequency: Number,
      frequencyType: {
        type: String,
        enum: ['days', 'months'],
      },
      transactionAmount: Number,
      currencyId: {
        type: String,
        default: 'BRL',
      },
      startDate: Date,
      endDate: Date,
      freeTrial: {
        frequency: Number,
        frequencyType: String,
      },
    },

    // Payer Info
    payer: {
      id: String,
      email: String,
      firstName: String,
      lastName: String,
    },

    // Card Info
    cardId: String,
    paymentMethodId: String,

    // URLs
    initPoint: String,
    sandboxInitPoint: String,
    backUrl: String,

    // Dates
    dateCreated: Date,
    lastModified: Date,
    nextPaymentDate: Date,

    // Billing
    summarized: {
      quotas: Number,
      chargedQuantity: Number,
      pendingChargeQuantity: Number,
      chargedAmount: Number,
      pendingChargeAmount: Number,
      semaphore: String,
      lastChargedDate: Date,
      lastChargedAmount: Number,
    },

    // Payment History
    payments: [{
      mpPaymentId: String,
      amount: Number,
      status: String,
      dateCreated: Date,
    }],

    // Full MP Response
    mpResponse: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'mp_subscriptions',
  }
);

// Indexes
mpSubscriptionSchema.index({ userId: 1, status: 1 });
mpSubscriptionSchema.index({ mpSubscriptionId: 1 });
mpSubscriptionSchema.index({ externalReference: 1 });
mpSubscriptionSchema.index({ nextPaymentDate: 1 });

/**
 * Get subscription summary
 */
mpSubscriptionSchema.methods.getSummary = function () {
  return {
    id: this.id,
    mpSubscriptionId: this.mpSubscriptionId,
    reason: this.reason,
    status: this.status,
    amount: this.autoRecurring?.transactionAmount,
    currencyId: this.autoRecurring?.currencyId,
    frequency: this.autoRecurring?.frequency,
    frequencyType: this.autoRecurring?.frequencyType,
    payerEmail: this.payer?.email,
    nextPaymentDate: this.nextPaymentDate,
    chargedQuantity: this.summarized?.chargedQuantity,
    chargedAmount: this.summarized?.chargedAmount,
    createdAt: this.createdAt,
  };
};

/**
 * Add payment to subscription history
 */
mpSubscriptionSchema.methods.addPayment = function (paymentData) {
  this.payments.push({
    mpPaymentId: paymentData.id,
    amount: paymentData.transaction_amount,
    status: paymentData.status,
    dateCreated: paymentData.date_created,
  });
  
  // Update summarized
  if (paymentData.status === 'approved') {
    this.summarized.chargedQuantity = (this.summarized.chargedQuantity || 0) + 1;
    this.summarized.chargedAmount = (this.summarized.chargedAmount || 0) + paymentData.transaction_amount;
    this.summarized.lastChargedDate = paymentData.date_created;
    this.summarized.lastChargedAmount = paymentData.transaction_amount;
  }
};

/**
 * Static: Get active subscriptions
 */
mpSubscriptionSchema.statics.getActive = async function (userId) {
  return this.find({
    userId,
    status: 'authorized',
  }).sort('-createdAt');
};

/**
 * Static: Get subscriptions due for payment
 */
mpSubscriptionSchema.statics.getDueForPayment = async function (userId, daysAhead = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  return this.find({
    userId,
    status: 'authorized',
    nextPaymentDate: { $lte: futureDate },
  }).sort('nextPaymentDate');
};

/**
 * Static: Get statistics
 */
mpSubscriptionSchema.statics.getStats = async function (userId) {
  const stats = await this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$summarized.chargedAmount' },
      },
    },
  ]);

  const result = {
    total: 0,
    active: 0,
    paused: 0,
    cancelled: 0,
    totalRevenue: 0,
  };

  stats.forEach((s) => {
    result.total += s.count;
    result.totalRevenue += s.totalAmount || 0;
    if (s._id === 'authorized') result.active = s.count;
    if (s._id === 'paused') result.paused = s.count;
    if (s._id === 'cancelled') result.cancelled = s.count;
  });

  return result;
};

/**
 * Static: Search subscriptions
 */
mpSubscriptionSchema.statics.search = async function (userId, filters = {}) {
  const {
    status,
    dateFrom,
    dateTo,
    limit = 20,
    offset = 0,
    sort = '-createdAt',
  } = filters;

  const query = { userId };

  if (status) query.status = status;

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const subscriptions = await this.find(query)
    .sort(sort)
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .select('-mpResponse -payments');

  const total = await this.countDocuments(query);

  return {
    subscriptions,
    total,
    limit: parseInt(limit),
    offset: parseInt(offset),
  };
};

module.exports = mongoose.model('MPSubscription', mpSubscriptionSchema);
