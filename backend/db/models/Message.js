/**
 * Message Model
 * Stores post-sale messages from Mercado Livre
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const messageSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `msg_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
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

    // Mercado Livre Message Info
    mlMessageId: {
      type: String,
      required: [true, 'Mercado Livre message ID is required'],
      index: true,
    },
    packId: {
      type: String,
      required: [true, 'Pack ID is required'],
      index: true,
    },
    orderId: {
      type: String,
      index: true,
    },

    // Message Content
    text: {
      type: String,
      required: true,
    },
    plainText: String,

    // Message Status
    status: {
      type: String,
      enum: ['available', 'moderated', 'deleted', 'blocked'],
      default: 'available',
    },

    // From/To
    from: {
      id: String,
      email: String,
      nickname: String,
      role: {
        type: String,
        enum: ['seller', 'buyer'],
      },
    },
    to: {
      id: String,
      email: String,
      nickname: String,
      role: {
        type: String,
        enum: ['seller', 'buyer'],
      },
    },

    // Message Type
    messageType: {
      type: String,
      enum: ['text', 'attachment', 'auto_reply', 'system'],
      default: 'text',
    },

    // Attachments
    attachments: [
      {
        filename: String,
        originalFilename: String,
        size: Number,
        type: String,
        url: String,
      },
    ],

    // Dates
    dateCreated: {
      type: Date,
      required: true,
      index: true,
    },
    dateReceived: Date,
    dateRead: Date,

    // Site
    siteId: String,

    // Conversation Thread
    conversationId: {
      type: String,
      index: true,
    },

    // Read Status
    isRead: {
      type: Boolean,
      default: false,
    },

    // Message direction (inbound = from buyer, outbound = from seller)
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'inbound',
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
    collection: 'messages',
  }
);

// Indexes
messageSchema.index({ accountId: 1, packId: 1 });
messageSchema.index({ mlMessageId: 1, accountId: 1 }, { unique: true });
messageSchema.index({ dateCreated: -1 });
messageSchema.index({ isRead: 1, direction: 1 });

// Methods
messageSchema.methods.getSummary = function () {
  return {
    id: this.id,
    mlMessageId: this.mlMessageId,
    packId: this.packId,
    text: this.text.substring(0, 100) + (this.text.length > 100 ? '...' : ''),
    from: this.from,
    to: this.to,
    dateCreated: this.dateCreated,
    isRead: this.isRead,
    direction: this.direction,
    hasAttachments: this.attachments?.length > 0,
  };
};

messageSchema.methods.getDetails = function () {
  return {
    id: this.id,
    mlMessageId: this.mlMessageId,
    packId: this.packId,
    orderId: this.orderId,
    text: this.text,
    plainText: this.plainText,
    from: this.from,
    to: this.to,
    dateCreated: this.dateCreated,
    dateReceived: this.dateReceived,
    dateRead: this.dateRead,
    isRead: this.isRead,
    direction: this.direction,
    attachments: this.attachments,
    messageType: this.messageType,
    status: this.status,
  };
};

// Static: Find messages by pack
messageSchema.statics.findByPackId = function (accountId, packId) {
  return this.find({ accountId, packId }).sort({ dateCreated: 1 });
};

// Static: Find unread messages
messageSchema.statics.findUnread = function (accountId, options = {}) {
  const query = this.find({
    accountId,
    isRead: false,
    direction: 'inbound',
  }).sort({ dateCreated: -1 });
  
  if (options.limit) query.limit(options.limit);
  
  return query;
};

// Static: Get conversation
messageSchema.statics.getConversation = function (accountId, packId) {
  return this.find({ accountId, packId }).sort({ dateCreated: 1 });
};

// Static: Get message statistics
messageSchema.statics.getStats = async function (accountId) {
  const stats = await this.aggregate([
    { $match: { accountId } },
    {
      $group: {
        _id: {
          direction: '$direction',
          isRead: '$isRead',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    unread: 0,
    inbound: 0,
    outbound: 0,
  };

  stats.forEach(s => {
    result.total += s.count;
    if (s._id.direction === 'inbound') {
      result.inbound += s.count;
      if (!s._id.isRead) result.unread += s.count;
    } else {
      result.outbound += s.count;
    }
  });

  return result;
};

module.exports = mongoose.model('Message', messageSchema);
