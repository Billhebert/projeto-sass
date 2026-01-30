/**
 * Promotion Model
 * Stores promotions and deals from Mercado Livre
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const promotionSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `promo_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
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

    // Mercado Livre Promotion Info
    mlPromotionId: {
      type: String,
      required: [true, 'Mercado Livre promotion ID is required'],
      index: true,
    },

    // Promotion Type
    type: {
      type: String,
      enum: ['DEAL', 'LIGHTNING_DEAL', 'PRICE_DISCOUNT', 'VOLUME_DISCOUNT', 'CAMPAIGN', 'MARKETPLACE_CAMPAIGN', 'COUPON', 'CO_FUNDED', 'MKT_COUPON', 'FREE_SHIPPING'],
      required: true,
      index: true,
    },

    // Promotion Name/Title
    name: String,
    description: String,

    // Status
    status: {
      type: String,
      enum: ['pending', 'started', 'finished', 'cancelled', 'paused', 'active', 'inactive', 'approved', 'rejected', 'candidate'],
      default: 'pending',
      index: true,
    },

    // Dates
    startDate: {
      type: Date,
      required: true,
    },
    finishDate: {
      type: Date,
      required: true,
    },
    dateCreated: Date,

    // Items in promotion
    items: [
      {
        itemId: String,
        title: String,
        originalPrice: Number,
        promotionPrice: Number,
        discountPercentage: Number,
        stock: Number,
        dealStock: Number,
        soldQuantity: Number,
        status: String,
      },
    ],

    // Discount Info
    discount: {
      type: {
        type: String,
        enum: ['percentage', 'fixed', 'volume'],
      },
      value: Number,
      minQuantity: Number,
      maxQuantity: Number,
    },

    // Budget (for campaigns)
    budget: {
      amount: Number,
      currencyId: String,
      spent: Number,
      remaining: Number,
    },

    // Benefits
    benefits: {
      freeShipping: Boolean,
      priorityListing: Boolean,
      highlightBadge: Boolean,
    },

    // Campaign Info (if applicable)
    campaign: {
      id: String,
      name: String,
      type: String,
    },

    // Rules
    rules: {
      maxSales: Number,
      maxPerBuyer: Number,
      minPrice: Number,
      maxPrice: Number,
    },

    // Statistics
    statistics: {
      impressions: Number,
      visits: Number,
      conversions: Number,
      sales: Number,
      revenue: Number,
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
    collection: 'promotions',
  }
);

// Indexes
promotionSchema.index({ accountId: 1, status: 1 });
promotionSchema.index({ mlPromotionId: 1, accountId: 1 }, { unique: true });
promotionSchema.index({ startDate: 1, finishDate: 1 });
promotionSchema.index({ type: 1, status: 1 });

// Methods
promotionSchema.methods.getSummary = function () {
  return {
    id: this.id,
    mlPromotionId: this.mlPromotionId,
    type: this.type,
    name: this.name,
    status: this.status,
    startDate: this.startDate,
    finishDate: this.finishDate,
    itemsCount: this.items?.length || 0,
    discount: this.discount,
    statistics: this.statistics,
  };
};

promotionSchema.methods.getDetails = function () {
  return {
    id: this.id,
    mlPromotionId: this.mlPromotionId,
    type: this.type,
    name: this.name,
    description: this.description,
    status: this.status,
    startDate: this.startDate,
    finishDate: this.finishDate,
    items: this.items,
    discount: this.discount,
    budget: this.budget,
    benefits: this.benefits,
    campaign: this.campaign,
    rules: this.rules,
    statistics: this.statistics,
    tags: this.tags,
    lastSyncedAt: this.lastSyncedAt,
  };
};

// Static: Find active promotions
promotionSchema.statics.findActive = function (accountId) {
  const now = new Date();
  return this.find({
    accountId,
    status: { $in: ['started', 'active'] },
    startDate: { $lte: now },
    finishDate: { $gte: now },
  }).sort({ finishDate: 1 });
};

// Static: Find upcoming promotions
promotionSchema.statics.findUpcoming = function (accountId) {
  const now = new Date();
  return this.find({
    accountId,
    status: { $in: ['pending', 'approved'] },
    startDate: { $gt: now },
  }).sort({ startDate: 1 });
};

// Static: Get promotion statistics
promotionSchema.statics.getStats = async function (accountId) {
  const now = new Date();
  
  const stats = await this.aggregate([
    { $match: { accountId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalSales: { $sum: '$statistics.sales' },
        totalRevenue: { $sum: '$statistics.revenue' },
      },
    },
  ]);

  const active = await this.countDocuments({
    accountId,
    status: { $in: ['started', 'active'] },
    startDate: { $lte: now },
    finishDate: { $gte: now },
  });

  return { stats, activeCount: active };
};

module.exports = mongoose.model('Promotion', promotionSchema);
