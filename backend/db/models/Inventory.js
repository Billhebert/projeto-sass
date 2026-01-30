/**
 * Inventory Model - MongoDB Schema
 * Stores inventory and stock information from ML
 */

const mongoose = require('mongoose');

const stockLocationSchema = new mongoose.Schema({
  warehouseId: String,
  warehouseName: String,
  quantity: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    enum: ['seller', 'fulfillment', 'cross_docking'],
  },
}, { _id: false });

const variationStockSchema = new mongoose.Schema({
  variationId: {
    type: String,
    required: true,
  },
  availableQuantity: {
    type: Number,
    default: 0,
  },
  soldQuantity: {
    type: Number,
    default: 0,
  },
  reservedQuantity: {
    type: Number,
    default: 0,
  },
  attributeCombinations: [{
    id: String,
    name: String,
    valueName: String,
  }],
}, { _id: false });

const inventorySchema = new mongoose.Schema({
  // References
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MLAccount',
    required: true,
    index: true,
  },
  itemId: {
    type: String,
    required: true,
    index: true,
  },

  // Item Info (denormalized)
  title: String,
  thumbnail: String,
  status: {
    type: String,
    index: true,
  },
  price: Number,
  currencyId: {
    type: String,
    default: 'BRL',
  },

  // Stock Info
  availableQuantity: {
    type: Number,
    default: 0,
    index: true,
  },
  soldQuantity: {
    type: Number,
    default: 0,
  },
  initialQuantity: {
    type: Number,
    default: 0,
  },
  reservedQuantity: {
    type: Number,
    default: 0,
  },

  // Low Stock Alert
  lowStockThreshold: {
    type: Number,
    default: 5,
  },
  isLowStock: {
    type: Boolean,
    default: false,
    index: true,
  },

  // Fulfillment
  isFulfillment: {
    type: Boolean,
    default: false,
    index: true,
  },
  logisticType: {
    type: String,
    enum: ['self_service', 'cross_docking', 'fulfillment', 'drop_off', 'custom'],
  },

  // Multi-location stock
  stockLocations: [stockLocationSchema],

  // Variations
  variations: [variationStockSchema],
  hasVariations: {
    type: Boolean,
    default: false,
  },

  // Catalog
  catalogProductId: String,

  // Sync metadata
  lastSyncAt: {
    type: Date,
    default: Date.now,
  },
  lastStockUpdate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound indexes
inventorySchema.index({ accountId: 1, itemId: 1 }, { unique: true });
inventorySchema.index({ accountId: 1, isLowStock: 1 });
inventorySchema.index({ accountId: 1, availableQuantity: 1 });
inventorySchema.index({ accountId: 1, isFulfillment: 1 });

// Pre-save hook to update isLowStock
inventorySchema.pre('save', function(next) {
  this.isLowStock = this.availableQuantity <= this.lowStockThreshold;
  this.hasVariations = this.variations && this.variations.length > 0;
  next();
});

// Instance methods
inventorySchema.methods.getTotalStock = function() {
  if (this.hasVariations && this.variations.length > 0) {
    return this.variations.reduce((sum, v) => sum + v.availableQuantity, 0);
  }
  return this.availableQuantity;
};

inventorySchema.methods.needsRestock = function() {
  return this.isLowStock || this.availableQuantity === 0;
};

// Static methods
inventorySchema.statics.getLowStockItems = async function(accountId, threshold = 5) {
  return this.find({
    accountId,
    $or: [
      { availableQuantity: { $lte: threshold } },
      { isLowStock: true },
    ],
    status: 'active',
  }).sort({ availableQuantity: 1 });
};

inventorySchema.statics.getStockSummary = async function(accountId) {
  const summary = await this.aggregate([
    { $match: { accountId: new mongoose.Types.ObjectId(accountId) } },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalStock: { $sum: '$availableQuantity' },
        totalSold: { $sum: '$soldQuantity' },
        lowStockCount: {
          $sum: { $cond: ['$isLowStock', 1, 0] }
        },
        outOfStockCount: {
          $sum: { $cond: [{ $eq: ['$availableQuantity', 0] }, 1, 0] }
        },
        fulfillmentCount: {
          $sum: { $cond: ['$isFulfillment', 1, 0] }
        },
      }
    }
  ]);

  return summary[0] || {
    totalItems: 0,
    totalStock: 0,
    totalSold: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    fulfillmentCount: 0,
  };
};

inventorySchema.statics.getFulfillmentItems = async function(accountId) {
  return this.find({
    accountId,
    isFulfillment: true,
  }).sort({ title: 1 });
};

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
