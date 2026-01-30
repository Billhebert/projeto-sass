/**
 * Pack Model - MongoDB Schema
 * Stores pack (cart) information from ML
 */

const mongoose = require('mongoose');

const packOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
  },
  status: String,
  totalAmount: Number,
  currencyId: String,
  itemCount: Number,
  buyer: {
    id: String,
    nickname: String,
  },
}, { _id: false });

const packSchema = new mongoose.Schema({
  // Unique Identifier
  id: {
    type: String,
    default: () => `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    unique: true,
    index: true,
  },

  // References
  accountId: {
    type: String,
    ref: 'MLAccount',
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  mlPackId: {
    type: String,
    required: true,
    index: true,
  },

  // Pack Info
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled', 'invalid', 'shipped', 'delivered'],
    default: 'pending',
    index: true,
  },
  substatus: String,
  
  dateCreated: {
    type: Date,
    required: true,
    index: true,
  },
  dateClosed: Date,
  dateLastUpdated: Date,

  // Buyer
  buyer: {
    id: String,
    nickname: String,
    email: String,
    firstName: String,
    lastName: String,
    phone: String,
  },

  // Orders in pack
  orders: [packOrderSchema],
  orderCount: {
    type: Number,
    default: 0,
  },

  // Pricing Details
  grossAmount: {
    type: Number,
    default: 0,
    description: 'Total amount before discounts'
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  shippingCost: {
    type: Number,
    default: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    default: 0,
    description: 'Total after all adjustments'
  },
  currencyId: {
    type: String,
    default: 'BRL',
  },

  // Shipping
  shipmentId: String,
  shippingStatus: String,
  shippingMode: String,
  logisticType: String,
  trackingNumber: String,
  
  // Receiver address
  receiverAddress: {
    zipCode: String,
    streetName: String,
    streetNumber: String,
    city: String,
    state: String,
    country: String,
  },

  // Items summary
  totalItems: {
    type: Number,
    default: 0,
  },
  uniqueItems: {
    type: Number,
    default: 0,
  },

  // Detailed items
  items: [
    {
      itemId: String,
      mlItemId: String,
      title: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number,
      discount: Number,
      finalPrice: Number,
    }
  ],

  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'refunded'],
    default: 'pending',
  },
  paymentMethod: String,
  paymentId: String,
  installments: Number,

  // Pack-specific features
  isPriority: {
    type: Boolean,
    default: false,
  },
  isGift: {
    type: Boolean,
    default: false,
  },
  giftMessage: String,
  hasInsurance: {
    type: Boolean,
    default: false,
  },

  // Tags and metadata
  tags: [String],
  notes: String,

  // Sync metadata
  lastSyncAt: {
    type: Date,
    default: Date.now,
  },
  mlSyncStatus: {
    type: String,
    enum: ['synced', 'pending', 'error'],
    default: 'pending',
  },
  syncError: String,
  rawData: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Compound indexes for better performance
packSchema.index({ accountId: 1, mlPackId: 1 }, { unique: true });
packSchema.index({ accountId: 1, status: 1 });
packSchema.index({ accountId: 1, dateCreated: -1 });
packSchema.index({ accountId: 1, 'buyer.id': 1 });
packSchema.index({ userId: 1, dateCreated: -1 });
packSchema.index({ paymentStatus: 1, status: 1 });

// Pre-save hook
packSchema.pre('save', function(next) {
  this.orderCount = this.orders?.length || 0;
  next();
});

// Instance methods
packSchema.methods.isPaid = function() {
  return this.status === 'paid';
};

packSchema.methods.getOrderIds = function() {
  return this.orders.map(o => o.orderId);
};

packSchema.methods.getSummary = function() {
  return {
    id: this.id,
    mlPackId: this.mlPackId,
    status: this.status,
    substatus: this.substatus,
    totalAmount: this.totalAmount,
    finalAmount: this.finalAmount,
    orderCount: this.orderCount,
    totalItems: this.totalItems,
    buyer: this.buyer,
    paymentStatus: this.paymentStatus,
    dateCreated: this.dateCreated,
    currencyId: this.currencyId,
  };
};

packSchema.methods.getDetails = function() {
  return {
    id: this.id,
    mlPackId: this.mlPackId,
    accountId: this.accountId,
    userId: this.userId,
    status: this.status,
    substatus: this.substatus,
    paymentStatus: this.paymentStatus,
    dateCreated: this.dateCreated,
    dateClosed: this.dateClosed,
    dateLastUpdated: this.dateLastUpdated,
    buyer: this.buyer,
    orders: this.orders,
    orderCount: this.orderCount,
    items: this.items,
    totalItems: this.totalItems,
    uniqueItems: this.uniqueItems,
    grossAmount: this.grossAmount,
    totalAmount: this.totalAmount,
    discountAmount: this.discountAmount,
    shippingCost: this.shippingCost,
    taxAmount: this.taxAmount,
    finalAmount: this.finalAmount,
    currencyId: this.currencyId,
    shipmentId: this.shipmentId,
    shippingStatus: this.shippingStatus,
    trackingNumber: this.trackingNumber,
    paymentMethod: this.paymentMethod,
    installments: this.installments,
    isPriority: this.isPriority,
    isGift: this.isGift,
    giftMessage: this.giftMessage,
    hasInsurance: this.hasInsurance,
    tags: this.tags,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

packSchema.methods.calculateTotals = function() {
  // Recalculate all totals
  const itemsTotal = this.items.reduce((sum, item) => sum + (item.finalPrice || 0), 0);
  
  this.totalAmount = itemsTotal;
  this.finalAmount = itemsTotal + (this.shippingCost || 0) + (this.taxAmount || 0) - (this.discountAmount || 0);
  
  this.totalItems = this.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  this.uniqueItems = this.items.length;
  
  return this;
};

packSchema.methods.canBeCancelled = function() {
  return ['pending', 'invalid'].includes(this.status);
};

packSchema.methods.canBeShipped = function() {
  return this.status === 'paid' && this.paymentStatus === 'approved';
};

// Static methods
packSchema.statics.getAccountStats = async function(accountId, startDate, endDate) {
  const match = { accountId };
  
  if (startDate || endDate) {
    match.dateCreated = {};
    if (startDate) match.dateCreated.$gte = new Date(startDate);
    if (endDate) match.dateCreated.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalPacks: { $sum: 1 },
        totalRevenue: { $sum: '$finalAmount' },
        avgPackValue: { $avg: '$finalAmount' },
        totalOrders: { $sum: '$orderCount' },
        totalItems: { $sum: '$totalItems' },
        paidPacks: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
        },
        cancelledPacks: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        shippedPacks: {
          $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] }
        },
        deliveredPacks: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
      }
    }
  ]);

  return stats[0] || {
    totalPacks: 0,
    totalRevenue: 0,
    avgPackValue: 0,
    totalOrders: 0,
    totalItems: 0,
    paidPacks: 0,
    cancelledPacks: 0,
    shippedPacks: 0,
    deliveredPacks: 0,
  };
};

packSchema.statics.getRecentPacks = async function(accountId, limit = 50) {
  return this.find({ accountId })
    .sort({ dateCreated: -1 })
    .limit(limit);
};

packSchema.statics.getByBuyer = async function(accountId, buyerId) {
  return this.find({
    accountId,
    'buyer.id': buyerId,
  }).sort({ dateCreated: -1 });
};

packSchema.statics.search = async function(accountId, filters = {}) {
  const {
    status,
    paymentStatus,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    buyerId,
    limit = 20,
    offset = 0,
    sort = '-dateCreated',
  } = filters;

  const query = { accountId };

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (buyerId) query['buyer.id'] = buyerId;

  if (dateFrom || dateTo) {
    query.dateCreated = {};
    if (dateFrom) query.dateCreated.$gte = new Date(dateFrom);
    if (dateTo) query.dateCreated.$lte = new Date(dateTo);
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    query.finalAmount = {};
    if (minAmount !== undefined) query.finalAmount.$gte = minAmount;
    if (maxAmount !== undefined) query.finalAmount.$lte = maxAmount;
  }

  const packs = await this.find(query)
    .sort(sort)
    .limit(parseInt(limit))
    .skip(parseInt(offset));

  const total = await this.countDocuments(query);

  return {
    packs,
    total,
    limit: parseInt(limit),
    offset: parseInt(offset),
  };
};

packSchema.statics.getPaidPacks = async function(accountId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    accountId,
    status: 'paid',
    dateCreated: { $gte: startDate },
  }).sort({ dateCreated: -1 });
};

packSchema.statics.getUnpaidPacks = async function(accountId) {
  return this.find({
    accountId,
    paymentStatus: { $ne: 'approved' },
    status: { $ne: 'cancelled' },
  }).sort({ dateCreated: -1 });
};

const Pack = mongoose.model('Pack', packSchema);

module.exports = Pack;
