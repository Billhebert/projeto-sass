/**
 * Claim Model
 * Stores claims/complaints from Mercado Livre
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const claimSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `claim_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
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

    // Mercado Livre Claim Info
    mlClaimId: {
      type: String,
      required: [true, 'Mercado Livre claim ID is required'],
      index: true,
    },
    resourceId: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ['order', 'shipment'],
      default: 'order',
    },

    // Claim Type
    type: {
      type: String,
      enum: ['mediation', 'return', 'cancel', 'chargeback', 'dispute', 'complaint'],
      required: true,
      index: true,
    },

    // Claim Reason
    reason: {
      id: String,
      description: String,
      subReason: {
        id: String,
        description: String,
      },
    },

    // Status
    status: {
      type: String,
      enum: ['opened', 'pending', 'waiting_seller', 'waiting_buyer', 'closed', 'cancelled', 'resolved', 'escalated'],
      default: 'opened',
      index: true,
    },
    statusDetail: String,
    resolution: {
      type: String,
      enum: ['refund', 'return_refund', 'closed_without_resolution', 'resolved_by_seller', 'resolved_by_buyer', 'partial_refund', null],
      default: null,
    },

    // Parties
    buyer: {
      id: String,
      nickname: String,
    },
    seller: {
      id: String,
      nickname: String,
    },

    // Order/Item Info
    orderInfo: {
      orderId: String,
      itemId: String,
      title: String,
      quantity: Number,
      price: Number,
      currencyId: String,
    },

    // Amounts
    amount: {
      claimed: Number,
      refunded: Number,
      currencyId: String,
    },

    // Messages in claim
    messages: [
      {
        id: String,
        from: {
          id: String,
          role: String,
        },
        text: String,
        dateCreated: Date,
        attachments: [
          {
            filename: String,
            url: String,
            type: String,
          },
        ],
      },
    ],

    // Return Info (if return claim)
    returnInfo: {
      returnId: String,
      status: String,
      shippingId: String,
      trackingNumber: String,
      receivedAt: Date,
    },

    // Timeline/Actions
    timeline: [
      {
        action: String,
        actor: {
          id: String,
          role: String,
        },
        dateCreated: Date,
        details: mongoose.Schema.Types.Mixed,
      },
    ],

    // Due Dates
    dueDates: {
      sellerResponse: Date,
      buyerResponse: Date,
      returnShipping: Date,
      resolution: Date,
    },

    // Dates
    dateCreated: {
      type: Date,
      required: true,
      index: true,
    },
    dateLastUpdated: Date,
    dateClosed: Date,

    // Priority/Severity
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    // Tags
    tags: [String],

    // Sync Metadata
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },

    // Audit
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'claims',
  }
);

// Indexes
claimSchema.index({ accountId: 1, status: 1 });
claimSchema.index({ mlClaimId: 1, accountId: 1 }, { unique: true });
claimSchema.index({ resourceId: 1 });
claimSchema.index({ dateCreated: -1 });
claimSchema.index({ type: 1, status: 1 });

// Methods
claimSchema.methods.getSummary = function () {
  return {
    id: this.id,
    mlClaimId: this.mlClaimId,
    type: this.type,
    status: this.status,
    reason: this.reason,
    buyer: this.buyer,
    orderInfo: this.orderInfo,
    amount: this.amount,
    dateCreated: this.dateCreated,
    priority: this.priority,
  };
};

claimSchema.methods.getDetails = function () {
  return {
    id: this.id,
    mlClaimId: this.mlClaimId,
    resourceId: this.resourceId,
    resourceType: this.resourceType,
    type: this.type,
    status: this.status,
    statusDetail: this.statusDetail,
    resolution: this.resolution,
    reason: this.reason,
    buyer: this.buyer,
    seller: this.seller,
    orderInfo: this.orderInfo,
    amount: this.amount,
    messages: this.messages,
    returnInfo: this.returnInfo,
    timeline: this.timeline,
    dueDates: this.dueDates,
    dateCreated: this.dateCreated,
    dateLastUpdated: this.dateLastUpdated,
    dateClosed: this.dateClosed,
    priority: this.priority,
    tags: this.tags,
    lastSyncedAt: this.lastSyncedAt,
  };
};

// Static: Find open claims
claimSchema.statics.findOpen = function (accountId) {
  return this.find({
    accountId,
    status: { $in: ['opened', 'pending', 'waiting_seller', 'escalated'] },
  }).sort({ dateCreated: -1 });
};

// Static: Find claims by status
claimSchema.statics.findByStatus = function (accountId, status) {
  return this.find({ accountId, status }).sort({ dateCreated: -1 });
};

// Static: Get claim statistics
claimSchema.statics.getStats = async function (accountId) {
  const stats = await this.aggregate([
    { $match: { accountId } },
    {
      $group: {
        _id: {
          type: '$type',
          status: '$status',
        },
        count: { $sum: 1 },
        totalClaimed: { $sum: '$amount.claimed' },
        totalRefunded: { $sum: '$amount.refunded' },
      },
    },
  ]);

  const openCount = await this.countDocuments({
    accountId,
    status: { $in: ['opened', 'pending', 'waiting_seller', 'escalated'] },
  });

  return { stats, openCount };
};

module.exports = mongoose.model('Claim', claimSchema);
