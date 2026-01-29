/**
 * Product Model
 * Stores products synced from Mercado Livre
 * One ML account can have multiple products
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const productSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `prod_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
      unique: true,
      index: true,
    },

    // Relationship to ML Account
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

    // Mercado Livre Product Info
    mlProductId: {
      type: String,
      required: [true, 'Mercado Livre product ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    category: {
      categoryId: String,
      categoryName: String,
    },

    // Pricing
    price: {
      currency: {
        type: String,
        default: 'BRL',
      },
      amount: {
        type: Number,
        required: [true, 'Price amount is required'],
        index: true,
      },
      originalPrice: Number, // If on sale
    },

    // Inventory
    quantity: {
      available: {
        type: Number,
        default: 0,
      },
      sold: {
        type: Number,
        default: 0,
      },
      reserved: {
        type: Number,
        default: 0,
      },
    },

    // Product Status
    status: {
      type: String,
      enum: ['active', 'paused', 'closed', 'removed'],
      default: 'active',
      index: true,
    },
    mlStatus: String, // Status returned by ML API

    // Images
    images: [
      {
        url: String,
        position: Number,
      },
    ],
    thumbnailUrl: String,

    // Shipping
    shipping: {
      freeShipping: Boolean,
      acceptsMercadopagoShipping: Boolean,
      mode: String, // 'me2', 'custom', etc
      acceptsPickup: Boolean,
    },

    // Seller Info
    sellerId: String,
    sellerNickname: String,

    // Ratings & Reviews
    ratings: {
      averageScore: Number,
      totalRatings: Number,
    },

    // Attributes
    attributes: [
      {
        name: String,
        value: String,
      },
    ],

    // URLs
    permalinkUrl: String,
    mlUrl: String,

    // Sync Metadata
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'failed'],
      default: 'synced',
    },
    syncError: String,

    // Activity Tracking
    viewCount: {
      type: Number,
      default: 0,
    },
    questionCount: {
      type: Number,
      default: 0,
    },
    salesCount: {
      type: Number,
      default: 0,
    },

    // Additional Info
    startTime: Date,
    stopTime: Date,
    buyingMode: String, // 'auction', 'buy_it_now'
    condition: {
      type: String,
      enum: ['new', 'used'],
    },
    acceptsMercadocredits: Boolean,

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
    collection: 'products',
  }
);

// Indexes for performance
productSchema.index({ accountId: 1, status: 1 });
productSchema.index({ userId: 1, status: 1 });
productSchema.index({ mlProductId: 1, accountId: 1 }, { unique: true });
productSchema.index({ createdAt: -1 });
productSchema.index({ lastSyncedAt: -1 });
productSchema.index({ 'price.amount': 1 });

// Method to get product summary
productSchema.methods.getSummary = function () {
  return {
    id: this.id,
    mlProductId: this.mlProductId,
    title: this.title,
    price: this.price.amount,
    currency: this.price.currency,
    quantity: this.quantity.available,
    status: this.status,
    thumbnailUrl: this.thumbnailUrl,
    permalinkUrl: this.permalinkUrl,
    salesCount: this.salesCount,
    createdAt: this.createdAt,
  };
};

// Method to get detailed product info
productSchema.methods.getDetails = function () {
  return {
    id: this.id,
    mlProductId: this.mlProductId,
    title: this.title,
    description: this.description,
    price: this.price,
    quantity: this.quantity,
    status: this.status,
    images: this.images,
    category: this.category,
    shipping: this.shipping,
    ratings: this.ratings,
    attributes: this.attributes,
    condition: this.condition,
    buyingMode: this.buyingMode,
    salesCount: this.salesCount,
    viewCount: this.viewCount,
    questionCount: this.questionCount,
    permalinkUrl: this.permalinkUrl,
    createdAt: this.createdAt,
    lastSyncedAt: this.lastSyncedAt,
  };
};

// Update sync status
productSchema.methods.updateSyncStatus = async function (status, error = null) {
  this.syncStatus = status;
  if (status === 'failed') {
    this.syncError = error;
  } else {
    this.syncError = null;
  }
  this.lastSyncedAt = new Date();
  return this.save();
};

// Static: Find products by account
productSchema.statics.findByAccountId = function (accountId, options = {}) {
  const query = this.find({ accountId, status: options.status || { $ne: 'removed' } });
  
  if (options.limit) query.limit(options.limit);
  if (options.sort) query.sort(options.sort);
  
  return query;
};

// Static: Find products by user
productSchema.statics.findByUserId = function (userId, options = {}) {
  const query = this.find({ userId, status: options.status || { $ne: 'removed' } });
  
  if (options.limit) query.limit(options.limit);
  if (options.sort) query.sort(options.sort);
  
  return query;
};

// Static: Count products by account
productSchema.statics.countByAccountId = function (accountId) {
  return this.countDocuments({ accountId, status: { $ne: 'removed' } });
};

// Static: Find active products in price range
productSchema.statics.findByPriceRange = function (accountId, minPrice, maxPrice) {
  return this.find({
    accountId,
    status: 'active',
    'price.amount': { $gte: minPrice, $lte: maxPrice },
  });
};

// Static: Find low stock products
productSchema.statics.findLowStockProducts = function (accountId, threshold = 5) {
  return this.find({
    accountId,
    status: 'active',
    'quantity.available': { $lte: threshold, $gt: 0 },
  });
};

// Static: Find out of stock products
productSchema.statics.findOutOfStockProducts = function (accountId) {
  return this.find({
    accountId,
    'quantity.available': 0,
  });
};

// Static: Find products needing resync (older than threshold)
productSchema.statics.findProductsNeedingResync = function (accountId, hoursAgo = 24) {
  const threshold = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return this.find({
    accountId,
    lastSyncedAt: { $lt: threshold },
  });
};

// Static: Update multiple products
productSchema.statics.updateByMLProductIds = async function (accountId, updates) {
  const results = [];
  
  for (const [mlProductId, data] of Object.entries(updates)) {
    const result = await this.findOneAndUpdate(
      { accountId, mlProductId },
      { ...data, lastSyncedAt: new Date() },
      { new: true }
    );
    results.push(result);
  }
  
  return results;
};

module.exports = mongoose.model('Product', productSchema);
