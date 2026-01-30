/**
 * Billing Model - MongoDB Schema
 * Stores billing periods and financial data from ML
 */

const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  // References
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MLAccount',
    required: true,
    index: true,
  },
  
  // Period Info
  periodId: {
    type: String,
    required: true,
    index: true,
  },
  periodStart: {
    type: Date,
    required: true,
    index: true,
  },
  periodEnd: {
    type: Date,
    required: true,
  },

  // Financial Summary
  summary: {
    grossAmount: {
      type: Number,
      default: 0,
    },
    totalFees: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'BRL',
    },
  },

  // Fee Breakdown
  fees: {
    marketplaceFee: {
      type: Number,
      default: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
    },
    financingFee: {
      type: Number,
      default: 0,
    },
    advertisingFee: {
      type: Number,
      default: 0,
    },
    otherFees: {
      type: Number,
      default: 0,
    },
  },

  // Order Stats
  orderStats: {
    totalOrders: {
      type: Number,
      default: 0,
    },
    paidOrders: {
      type: Number,
      default: 0,
    },
    cancelledOrders: {
      type: Number,
      default: 0,
    },
    refundedOrders: {
      type: Number,
      default: 0,
    },
  },

  // Balance
  balance: {
    available: {
      type: Number,
      default: 0,
    },
    pending: {
      type: Number,
      default: 0,
    },
    reserved: {
      type: Number,
      default: 0,
    },
  },

  // Status
  status: {
    type: String,
    enum: ['open', 'closed', 'processing'],
    default: 'open',
    index: true,
  },

  // Sync metadata
  lastSyncAt: {
    type: Date,
    default: Date.now,
  },
  rawData: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Compound indexes
billingSchema.index({ accountId: 1, periodId: 1 }, { unique: true });
billingSchema.index({ accountId: 1, periodStart: -1 });
billingSchema.index({ accountId: 1, status: 1 });

// Virtual for fee percentage
billingSchema.virtual('feePercentage').get(function() {
  if (this.summary.grossAmount === 0) return 0;
  return ((this.summary.totalFees / this.summary.grossAmount) * 100).toFixed(2);
});

// Instance methods
billingSchema.methods.calculateNet = function() {
  return this.summary.grossAmount - this.summary.totalFees;
};

// Static methods
billingSchema.statics.getAccountSummary = async function(accountId, startDate, endDate) {
  const match = { accountId: new mongoose.Types.ObjectId(accountId) };
  
  if (startDate) match.periodStart = { $gte: startDate };
  if (endDate) match.periodEnd = { ...match.periodEnd, $lte: endDate };

  const summary = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalGross: { $sum: '$summary.grossAmount' },
        totalFees: { $sum: '$summary.totalFees' },
        totalNet: { $sum: '$summary.netAmount' },
        totalOrders: { $sum: '$orderStats.totalOrders' },
        periodsCount: { $sum: 1 },
      }
    }
  ]);

  return summary[0] || {
    totalGross: 0,
    totalFees: 0,
    totalNet: 0,
    totalOrders: 0,
    periodsCount: 0,
  };
};

billingSchema.statics.getMonthlyTrend = async function(accountId, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
        periodStart: { $gte: startDate },
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$periodStart' },
          month: { $month: '$periodStart' },
        },
        gross: { $sum: '$summary.grossAmount' },
        fees: { $sum: '$summary.totalFees' },
        net: { $sum: '$summary.netAmount' },
        orders: { $sum: '$orderStats.totalOrders' },
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
};

const Billing = mongoose.model('Billing', billingSchema);

module.exports = Billing;
