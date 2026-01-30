/**
 * Shipment Model
 * Stores shipment/delivery information from Mercado Livre
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const shipmentSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `shipment_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
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

    // Mercado Livre Shipment Info
    mlShipmentId: {
      type: String,
      required: [true, 'Mercado Livre shipment ID is required'],
      index: true,
    },
    orderId: {
      type: String,
      index: true,
    },

    // Shipment Status
    status: {
      type: String,
      enum: ['pending', 'handling', 'ready_to_ship', 'shipped', 'in_transit', 'delivered', 'not_delivered', 'cancelled', 'returned', 'returning'],
      default: 'pending',
      index: true,
    },
    substatus: {
      type: String,
      default: null,
    },
    statusHistory: [
      {
        status: String,
        substatus: String,
        date: Date,
      },
    ],

    // Mode
    mode: {
      type: String,
      enum: ['me1', 'me2', 'custom', 'not_specified', 'fulfillment', 'flex', 'places', 'cross_docking', 'drop_off', 'xd_drop_off', 'self_service'],
      default: 'me2',
    },
    logisticType: {
      type: String,
      enum: ['cross_docking', 'drop_off', 'xd_drop_off', 'fulfillment', 'self_service', 'default', 'custom'],
      default: 'default',
    },

    // Carrier Info
    carrier: {
      id: String,
      name: String,
    },
    serviceId: String,
    trackingNumber: String,
    trackingMethod: String,

    // Shipping Option
    shippingOption: {
      id: String,
      name: String,
      cost: Number,
      currencyId: String,
      listCost: Number,
      estimatedDeliveryTime: {
        type: String,
        date: Date,
        offset: {
          date: Date,
          shipping: Number,
          handling: Number,
        },
      },
      estimatedHandlingLimit: {
        date: Date,
      },
      estimatedDeliveryLimit: {
        date: Date,
      },
      estimatedDeliveryFinal: {
        date: Date,
      },
      estimatedDeliveryExtended: {
        date: Date,
      },
    },

    // Receiver Address
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

    // Sender Address
    senderAddress: {
      id: String,
      addressLine: String,
      streetName: String,
      streetNumber: String,
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
    },

    // Package Dimensions
    dimensions: {
      height: Number,
      width: Number,
      length: Number,
      weight: Number,
    },

    // Costs
    cost: {
      type: Number,
      default: 0,
    },
    baseCost: {
      type: Number,
      default: 0,
    },
    extraCost: {
      type: Number,
      default: 0,
    },
    currencyId: {
      type: String,
      default: 'BRL',
    },

    // Dates
    dateCreated: {
      type: Date,
      required: true,
    },
    dateFirstPrinted: Date,
    dateHandling: Date,
    dateShipped: Date,
    dateDelivered: Date,
    dateReturned: Date,
    lastUpdated: Date,

    // Lead Time
    leadTime: {
      handlingTime: Number,
      shippingTime: Number,
      totalTime: Number,
    },

    // Items in shipment
    items: [
      {
        id: String,
        title: String,
        quantity: Number,
        dimensions: {
          height: Number,
          width: Number,
          length: Number,
          weight: Number,
        },
      },
    ],

    // Tracking events
    trackingEvents: [
      {
        date: Date,
        type: String,
        description: String,
        location: String,
      },
    ],

    // Tags
    tags: [String],

    // Return Info (if applicable)
    returnDetails: {
      reason: String,
      status: String,
      dateCreated: Date,
      pickupId: String,
    },

    // Fulfillment Info (Full)
    fulfillment: {
      warehouseId: String,
      logisticProvider: String,
    },

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
    collection: 'shipments',
  }
);

// Indexes
shipmentSchema.index({ accountId: 1, status: 1 });
shipmentSchema.index({ mlShipmentId: 1, accountId: 1 }, { unique: true });
shipmentSchema.index({ orderId: 1 });
shipmentSchema.index({ dateCreated: -1 });
shipmentSchema.index({ trackingNumber: 1 });

// Methods
shipmentSchema.methods.getSummary = function () {
  return {
    id: this.id,
    mlShipmentId: this.mlShipmentId,
    orderId: this.orderId,
    status: this.status,
    substatus: this.substatus,
    mode: this.mode,
    carrier: this.carrier,
    trackingNumber: this.trackingNumber,
    dateCreated: this.dateCreated,
    dateShipped: this.dateShipped,
    dateDelivered: this.dateDelivered,
    receiverAddress: {
      city: this.receiverAddress?.city?.name,
      state: this.receiverAddress?.state?.name,
      receiverName: this.receiverAddress?.receiverName,
    },
    cost: this.cost,
  };
};

shipmentSchema.methods.getDetails = function () {
  return {
    id: this.id,
    mlShipmentId: this.mlShipmentId,
    orderId: this.orderId,
    status: this.status,
    substatus: this.substatus,
    statusHistory: this.statusHistory,
    mode: this.mode,
    logisticType: this.logisticType,
    carrier: this.carrier,
    trackingNumber: this.trackingNumber,
    shippingOption: this.shippingOption,
    receiverAddress: this.receiverAddress,
    senderAddress: this.senderAddress,
    dimensions: this.dimensions,
    cost: this.cost,
    dateCreated: this.dateCreated,
    dateHandling: this.dateHandling,
    dateShipped: this.dateShipped,
    dateDelivered: this.dateDelivered,
    items: this.items,
    trackingEvents: this.trackingEvents,
    tags: this.tags,
    lastSyncedAt: this.lastSyncedAt,
  };
};

// Static: Find shipments by account
shipmentSchema.statics.findByAccountId = function (accountId, options = {}) {
  const query = this.find({ accountId });
  
  if (options.status) query.where('status').equals(options.status);
  if (options.limit) query.limit(options.limit);
  if (options.sort) query.sort(options.sort);
  
  return query;
};

// Static: Find pending shipments
shipmentSchema.statics.findPending = function (accountId) {
  return this.find({
    accountId,
    status: { $in: ['pending', 'handling', 'ready_to_ship'] },
  }).sort({ dateCreated: 1 });
};

// Static: Get shipment statistics
shipmentSchema.statics.getStats = async function (accountId) {
  const stats = await this.aggregate([
    { $match: { accountId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalCost: { $sum: '$cost' },
      },
    },
  ]);

  return stats;
};

module.exports = mongoose.model('Shipment', shipmentSchema);
