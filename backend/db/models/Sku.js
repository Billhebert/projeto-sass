/**
 * SKU Model
 * Stores SKU information with manual costs and taxes
 * This data is not available from Mercado Livre API
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const skuSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `sku_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
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

    // SKU Identifier (user defined)
    sku: {
      type: String,
      required: [true, 'SKU code is required'],
      trim: true,
      index: true,
    },

    // Costs & Taxes (manual input by user)
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Product Info (optional)
    gtin: {
      type: String,
      default: null,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },

    // Fixed Stock Settings
    fixedStock: {
      enabled: {
        type: Boolean,
        default: false,
      },
      quantity: {
        type: Number,
        default: 1,
        min: 0,
      },
    },

    // Stock Sync Settings
    stockSync: {
      disabled: {
        type: Boolean,
        default: false,
      },
    },

    // Active status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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
    collection: 'skus',
  }
);

// Compound index for user + sku uniqueness
skuSchema.index({ userId: 1, sku: 1 }, { unique: true });

// Methods
skuSchema.methods.getSummary = function () {
  return {
    id: this.id,
    sku: this.sku,
    cost: this.cost,
    taxPercent: this.taxPercent,
    gtin: this.gtin,
    description: this.description,
    fixedStock: this.fixedStock,
    stockSync: this.stockSync,
    isActive: this.isActive,
  };
};

// Calculate tax amount based on a sale value
skuSchema.methods.calculateTax = function (saleValue) {
  return saleValue * (this.taxPercent / 100);
};

// Calculate contribution margin for a sale
skuSchema.methods.calculateMargin = function (saleValue, mlFee = 0, shippingCost = 0) {
  const tax = this.calculateTax(saleValue);
  const margin = saleValue - this.cost - tax - mlFee - shippingCost;
  return {
    margin,
    marginPercent: saleValue > 0 ? (margin / saleValue) * 100 : 0,
    cost: this.cost,
    tax,
    mlFee,
    shippingCost,
  };
};

// Static: Find SKUs by user
skuSchema.statics.findByUserId = function (userId, options = {}) {
  const query = this.find({ userId, isActive: true });

  if (options.search) {
    query.where({
      $or: [
        { sku: new RegExp(options.search, 'i') },
        { description: new RegExp(options.search, 'i') },
        { gtin: new RegExp(options.search, 'i') },
      ],
    });
  }

  if (options.limit) query.limit(options.limit);
  if (options.sort) query.sort(options.sort);
  if (options.skip) query.skip(options.skip);

  return query;
};

// Static: Find or create SKU
skuSchema.statics.findOrCreate = async function (userId, skuCode) {
  let sku = await this.findOne({ userId, sku: skuCode });

  if (!sku) {
    sku = await this.create({
      userId,
      sku: skuCode,
    });
  }

  return sku;
};

// Static: Bulk get costs for multiple SKUs
skuSchema.statics.getCostsForSkus = async function (userId, skuCodes) {
  const skus = await this.find({
    userId,
    sku: { $in: skuCodes },
    isActive: true,
  });

  const skuMap = {};
  skus.forEach((s) => {
    skuMap[s.sku] = {
      cost: s.cost,
      taxPercent: s.taxPercent,
    };
  });

  return skuMap;
};

module.exports = mongoose.model('Sku', skuSchema);
