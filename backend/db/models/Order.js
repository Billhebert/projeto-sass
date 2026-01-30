/**
 * Order Model
 * Stores orders/sales from Mercado Livre
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const orderSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `order_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
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

    // Mercado Livre Order Info
    mlOrderId: {
      type: String,
      required: [true, 'Mercado Livre order ID is required'],
      index: true,
    },
    packId: {
      type: String,
      default: null,
      index: true,
    },

    // Order Status
    status: {
      type: String,
      enum: ['confirmed', 'payment_required', 'payment_in_process', 'partially_paid', 'paid', 'partially_refunded', 'pending_cancel', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
    statusDetail: {
      type: String,
      default: null,
    },

    // Dates
    dateCreated: {
      type: Date,
      required: true,
    },
    dateClosed: {
      type: Date,
      default: null,
    },
    dateLastUpdated: {
      type: Date,
      default: null,
    },
    expirationDate: {
      type: Date,
      default: null,
    },

    // Buyer Info
    buyer: {
      id: String,
      nickname: String,
      firstName: String,
      lastName: String,
      email: String,
      phone: {
        areaCode: String,
        number: String,
        extension: String,
      },
      billingInfo: {
        docType: String,
        docNumber: String,
      },
    },

    // Seller Info
    seller: {
      id: String,
      nickname: String,
    },

    // Order Items
    orderItems: [
      {
        itemId: String,
        title: String,
        categoryId: String,
        variationId: String,
        variationAttributes: [{
          name: String,
          valueName: String,
        }],
        quantity: Number,
        unitPrice: Number,
        fullUnitPrice: Number,
        grossPrice: Number, // Preço bruto sem desconto
        currencyId: String,
        manufacturingDays: Number,
        saleFee: Number,
        listingTypeId: String,
        basePrice: Number,
        baseExchangeRate: Number,
        differentialPricingId: String,
        conditionItem: String,
        warrantyId: String,
        // Discounts applied to this item
        discounts: [
          {
            id: String,
            name: String,
            type: String, // percentage, fixed, etc
            value: Number, // Percentage value or fixed amount
            amount: Number, // Final discount amount
          },
        ],
      },
    ],

    // Payments
    payments: [
      {
        id: String,
        orderId: String,
        payerId: String,
        collector: {
          id: String,
        },
        currencyId: String,
        status: String,
        statusDetail: String,
        transactionAmount: Number,
        shippingCost: Number,
        overpaidAmount: Number,
        totalPaidAmount: Number,
        marketplaceFee: Number,
        couponAmount: Number,
        dateCreated: Date,
        dateLastModified: Date,
        dateApproved: Date,
        authorizationCode: String,
        transactionOrderId: String,
        paymentMethodId: String,
        paymentType: String,
        installments: Number,
        issuerID: String,
        atmTransferReference: {
          companyId: String,
          transactionId: String,
        },
        couponId: String,
        activationUri: String,
        operationType: String,
        cardId: String,
        reason: String,
        externalReference: String,
        availableActions: [String],
        installmentAmount: Number,
        deferredPeriod: String,
        taxesAmount: Number,
      },
    ],

    // Shipping
    shipping: {
      id: String,
      status: String,
      substatus: String,
      mode: String,
      shippingOption: {
        id: String,
        name: String,
        shippingMethodId: String,
        currencyId: String,
        cost: Number,
        estimatedDeliveryTime: {
          type: String,
          date: Date,
          unit: String,
        },
      },
      pickupId: String,
      receiverAddress: {
        id: String,
        addressLine: String,
        streetName: String,
        streetNumber: String,
        comment: String,
        zipCode: String,
        city: {
          id: String,
          name: String,
        },
        state: {
          id: String,
          name: String,
        },
        country: {
          id: String,
          name: String,
        },
        neighborhood: {
          id: String,
          name: String,
        },
        latitude: Number,
        longitude: Number,
        receiverName: String,
        receiverPhone: String,
      },
    },

    // Totals
    totalAmount: {
      type: Number,
      default: 0,
    },
    grossAmount: {
      type: Number,
      default: 0,
      description: 'Total amount before discounts'
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    couponAmount: {
      type: Number,
      default: 0,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    // Order-level discounts
    discounts: [
      {
        id: String,
        name: String,
        type: String,
        value: Number,
        amount: Number,
      },
    ],

    // Currency
    currencyId: {
      type: String,
      default: 'BRL',
    },

    // Marketplace
    context: {
      channel: String,
      site: String,
      flows: [String],
    },

    // Tags
    tags: [String],

    // Feedback
    feedback: {
      buyer: {
        id: String,
        fulfilled: Boolean,
        rating: String,
        status: String,
      },
      seller: {
        id: String,
        fulfilled: Boolean,
        rating: String,
        status: String,
      },
    },

    // Manufacturing (for custom items)
    manufacturing: {
      days: Number,
      deadline: Date,
    },

    // Mediations
    mediations: [
      {
        id: String,
        status: String,
        dateCreated: Date,
        dateLastUpdated: Date,
      },
    ],

    // Taxes
    taxes: {
      amount: Number,
      currencyId: String,
    },

    // Cancel detail
    cancelDetail: {
      reason: String,
      date: Date,
    },

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

    // Billing Info
    billingInfo: {
      docType: String,
      docNumber: String,
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
    collection: 'orders',
  }
);

// Indexes for performance
orderSchema.index({ accountId: 1, status: 1 });
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ mlOrderId: 1, accountId: 1 }, { unique: true });
orderSchema.index({ dateCreated: -1 });
orderSchema.index({ 'buyer.id': 1 });
orderSchema.index({ packId: 1 });

// Methods
orderSchema.methods.getSummary = function () {
  return {
    id: this.id,
    mlOrderId: this.mlOrderId,
    status: this.status,
    dateCreated: this.dateCreated,
    buyer: {
      nickname: this.buyer?.nickname,
      firstName: this.buyer?.firstName,
      lastName: this.buyer?.lastName,
    },
    totalAmount: this.totalAmount,
    paidAmount: this.paidAmount,
    currencyId: this.currencyId,
    itemsCount: this.orderItems?.length || 0,
    shipping: {
      status: this.shipping?.status,
      mode: this.shipping?.mode,
    },
  };
};

orderSchema.methods.getDetails = function () {
  return {
    id: this.id,
    mlOrderId: this.mlOrderId,
    packId: this.packId,
    status: this.status,
    statusDetail: this.statusDetail,
    dateCreated: this.dateCreated,
    dateClosed: this.dateClosed,
    dateLastUpdated: this.dateLastUpdated,
    buyer: this.buyer,
    seller: this.seller,
    orderItems: this.orderItems,
    payments: this.payments,
    shipping: this.shipping,
    totalAmount: this.totalAmount,
    paidAmount: this.paidAmount,
    couponAmount: this.couponAmount,
    shippingCost: this.shippingCost,
    currencyId: this.currencyId,
    tags: this.tags,
    feedback: this.feedback,
    lastSyncedAt: this.lastSyncedAt,
  };
};

// Static: Find orders by account
orderSchema.statics.findByAccountId = function (accountId, options = {}) {
  const query = this.find({ accountId });
  
  if (options.status) query.where('status').equals(options.status);
  if (options.limit) query.limit(options.limit);
  if (options.sort) query.sort(options.sort);
  if (options.skip) query.skip(options.skip);
  
  return query;
};

// Static: Find orders by user
orderSchema.statics.findByUserId = function (userId, options = {}) {
  const query = this.find({ userId });
  
  if (options.status) query.where('status').equals(options.status);
  if (options.limit) query.limit(options.limit);
  if (options.sort) query.sort(options.sort);
  
  return query;
};

// Static: Get order statistics
orderSchema.statics.getStats = async function (accountId, dateRange = {}) {
  const match = { accountId };
  
  if (dateRange.start) {
    match.dateCreated = { $gte: new Date(dateRange.start) };
  }
  if (dateRange.end) {
    match.dateCreated = { ...match.dateCreated, $lte: new Date(dateRange.end) };
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        paidAmount: { $sum: '$paidAmount' },
      },
    },
  ]);

  return stats;
};

module.exports = mongoose.model('Order', orderSchema);
