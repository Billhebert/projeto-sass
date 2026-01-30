/**
 * Notification Model
 * Stores webhook events and notifications from Mercado Livre
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const notificationSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `notif_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
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

    // Webhook Info
    topic: {
      type: String,
      required: true,
      enum: ['orders_v2', 'items', 'shipments', 'questions', 'messages', 'payments', 'claims', 'invoices', 'created_orders', 'stock_locations'],
      index: true,
    },
    resource: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
      index: true,
    },

    // ML Application Info
    applicationId: String,
    mlUserId: String,

    // Processing Status
    status: {
      type: String,
      enum: ['received', 'processing', 'processed', 'failed', 'ignored'],
      default: 'received',
      index: true,
    },
    processedAt: Date,
    processingError: String,
    retryCount: {
      type: Number,
      default: 0,
    },

    // Payload
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Action taken
    action: {
      type: String,
      enum: ['created', 'updated', 'deleted', 'status_change', 'sync', 'none'],
      default: 'none',
    },
    actionDetails: mongoose.Schema.Types.Mixed,

    // Notification Priority
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    // Read Status (for UI)
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,

    // Dates
    dateReceived: {
      type: Date,
      default: Date.now,
      index: true,
    },
    mlSent: Date,

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
    collection: 'notifications',
  }
);

// Indexes
notificationSchema.index({ accountId: 1, topic: 1 });
notificationSchema.index({ dateReceived: -1 });
notificationSchema.index({ status: 1, retryCount: 1 });
notificationSchema.index({ accountId: 1, isRead: 1 });

// Methods
notificationSchema.methods.getSummary = function () {
  return {
    id: this.id,
    topic: this.topic,
    resourceId: this.resourceId,
    status: this.status,
    action: this.action,
    priority: this.priority,
    isRead: this.isRead,
    dateReceived: this.dateReceived,
  };
};

notificationSchema.methods.getDetails = function () {
  return {
    id: this.id,
    topic: this.topic,
    resource: this.resource,
    resourceId: this.resourceId,
    status: this.status,
    processedAt: this.processedAt,
    processingError: this.processingError,
    payload: this.payload,
    action: this.action,
    actionDetails: this.actionDetails,
    priority: this.priority,
    isRead: this.isRead,
    dateReceived: this.dateReceived,
  };
};

notificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsProcessed = async function (action, details = null) {
  this.status = 'processed';
  this.processedAt = new Date();
  this.action = action;
  if (details) this.actionDetails = details;
  return this.save();
};

notificationSchema.methods.markAsFailed = async function (error) {
  this.status = 'failed';
  this.processingError = error;
  this.retryCount += 1;
  return this.save();
};

// Static: Find unread notifications
notificationSchema.statics.findUnread = function (accountId, options = {}) {
  const query = this.find({
    accountId,
    isRead: false,
  }).sort({ dateReceived: -1 });
  
  if (options.limit) query.limit(options.limit);
  if (options.topic) query.where('topic').equals(options.topic);
  
  return query;
};

// Static: Find pending for processing
notificationSchema.statics.findPendingProcessing = function (options = {}) {
  const query = this.find({
    status: { $in: ['received', 'processing'] },
    retryCount: { $lt: options.maxRetries || 3 },
  }).sort({ dateReceived: 1 });
  
  if (options.limit) query.limit(options.limit);
  
  return query;
};

// Static: Get notification statistics
notificationSchema.statics.getStats = async function (accountId, dateRange = {}) {
  const match = { accountId };
  
  if (dateRange.start) {
    match.dateReceived = { $gte: new Date(dateRange.start) };
  }
  if (dateRange.end) {
    match.dateReceived = { ...match.dateReceived, $lte: new Date(dateRange.end) };
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          topic: '$topic',
          status: '$status',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const unreadCount = await this.countDocuments({ accountId, isRead: false });

  return { stats, unreadCount };
};

// Static: Find by topic
notificationSchema.statics.findByTopic = function (accountId, topic, options = {}) {
  const query = this.find({ accountId, topic }).sort({ dateReceived: -1 });
  
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  
  return query;
};

// Static: Mark all as read
notificationSchema.statics.markAllAsRead = function (accountId, topic = null) {
  const filter = { accountId, isRead: false };
  if (topic) filter.topic = topic;
  
  return this.updateMany(filter, {
    $set: { isRead: true, readAt: new Date() },
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
