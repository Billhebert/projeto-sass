/**
 * Review Model - MongoDB Schema
 * Stores product reviews and ratings from ML
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // References
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MLAccount',
    required: true,
    index: true,
  },
  mlReviewId: {
    type: String,
    required: true,
    index: true,
  },
  itemId: {
    type: String,
    required: true,
    index: true,
  },
  orderId: {
    type: String,
    index: true,
  },

  // Reviewer Info
  reviewer: {
    id: String,
    nickname: String,
  },

  // Review Content
  rate: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
    index: true,
  },
  title: String,
  content: String,
  dateCreated: {
    type: Date,
    required: true,
    index: true,
  },

  // Seller Reply
  reply: {
    text: String,
    dateCreated: Date,
    status: {
      type: String,
      enum: ['pending', 'published', 'rejected'],
    },
  },

  // Status
  status: {
    type: String,
    enum: ['pending_reply', 'replied', 'reported'],
    default: 'pending_reply',
    index: true,
  },

  // Visibility
  isVisible: {
    type: Boolean,
    default: true,
  },

  // Item Info (denormalized for quick access)
  itemTitle: String,
  itemThumbnail: String,

  // Sync metadata
  lastSyncAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound indexes
reviewSchema.index({ accountId: 1, itemId: 1 });
reviewSchema.index({ accountId: 1, status: 1 });
reviewSchema.index({ accountId: 1, rate: 1 });
reviewSchema.index({ accountId: 1, dateCreated: -1 });

// Instance methods
reviewSchema.methods.needsReply = function() {
  return !this.reply || !this.reply.text;
};

reviewSchema.methods.isNegative = function() {
  return this.rate <= 2;
};

reviewSchema.methods.isPositive = function() {
  return this.rate >= 4;
};

// Static methods
reviewSchema.statics.getStats = async function(accountId) {
  const stats = await this.aggregate([
    { $match: { accountId: new mongoose.Types.ObjectId(accountId) } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rate' },
        pendingReplies: {
          $sum: { $cond: [{ $eq: ['$status', 'pending_reply'] }, 1, 0] }
        },
        positive: {
          $sum: { $cond: [{ $gte: ['$rate', 4] }, 1, 0] }
        },
        neutral: {
          $sum: { $cond: [{ $eq: ['$rate', 3] }, 1, 0] }
        },
        negative: {
          $sum: { $cond: [{ $lte: ['$rate', 2] }, 1, 0] }
        },
      }
    }
  ]);
  
  return stats[0] || {
    totalReviews: 0,
    averageRating: 0,
    pendingReplies: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
  };
};

reviewSchema.statics.getRatingDistribution = async function(accountId) {
  const distribution = await this.aggregate([
    { $match: { accountId: new mongoose.Types.ObjectId(accountId) } },
    {
      $group: {
        _id: '$rate',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);
  
  const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach(d => {
    result[d._id] = d.count;
  });
  
  return result;
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
