/**
 * Product Cost Model
 * Stores COGS (Cost of Goods Sold) for products
 */

const mongoose = require("mongoose");

const productCostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accountId: {
      type: String,
      required: true,
      index: true,
    },
    itemId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    // Cost of goods sold (custo do produto)
    cogs: {
      type: Number,
      required: true,
      min: 0,
    },
    // Currency (default BRL)
    currency: {
      type: String,
      default: "BRL",
    },
    // Optional notes about the cost
    notes: {
      type: String,
      maxlength: 500,
    },
    // Last updated by
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for fast lookups
productCostSchema.index(
  { userId: 1, accountId: 1, itemId: 1 },
  { unique: true },
);

// Index for reporting queries
productCostSchema.index({ userId: 1, accountId: 1, updatedAt: -1 });

// Static method to get or create product cost
productCostSchema.statics.getOrCreate = async function (
  userId,
  accountId,
  itemId,
  title,
  defaultCogs = 0,
) {
  let productCost = await this.findOne({ userId, accountId, itemId });

  if (!productCost) {
    productCost = await this.create({
      userId,
      accountId,
      itemId,
      title,
      cogs: defaultCogs,
      updatedBy: userId,
    });
  }

  return productCost;
};

// Instance method to calculate profit margin
productCostSchema.methods.calculateMargin = function (sellingPrice, fees = 0) {
  if (!sellingPrice || sellingPrice <= 0) {
    return 0;
  }

  const netRevenue = sellingPrice - fees;
  const profit = netRevenue - this.cogs;
  const margin = (profit / sellingPrice) * 100;

  return {
    profit,
    margin,
    netRevenue,
    cogs: this.cogs,
  };
};

const ProductCost = mongoose.model("ProductCost", productCostSchema);

module.exports = ProductCost;
