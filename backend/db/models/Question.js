/**
 * Question Model
 * Stores questions and answers from Mercado Livre
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const questionSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `question_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
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

    // Mercado Livre Question Info
    mlQuestionId: {
      type: String,
      required: [true, 'Mercado Livre question ID is required'],
      index: true,
    },
    itemId: {
      type: String,
      required: [true, 'Item ID is required'],
      index: true,
    },

    // Question Content
    text: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['UNANSWERED', 'ANSWERED', 'CLOSED_UNANSWERED', 'UNDER_REVIEW', 'DISABLED', 'BANNED'],
      default: 'UNANSWERED',
      index: true,
    },

    // Answer
    answer: {
      text: String,
      status: String,
      dateCreated: Date,
    },

    // From User (Buyer)
    from: {
      id: String,
      nickname: String,
      answeredQuestions: Number,
    },

    // Seller Info
    sellerId: {
      type: String,
      index: true,
    },

    // Dates
    dateCreated: {
      type: Date,
      required: true,
      index: true,
    },

    // Hold status
    holdStatus: {
      type: String,
      default: null,
    },

    // Item Info (cached)
    item: {
      title: String,
      price: Number,
      currencyId: String,
      thumbnailUrl: String,
      permalink: String,
    },

    // Deleted by buyer
    deletedFromListing: {
      type: Boolean,
      default: false,
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
    collection: 'questions',
  }
);

// Indexes
questionSchema.index({ accountId: 1, status: 1 });
questionSchema.index({ mlQuestionId: 1, accountId: 1 }, { unique: true });
questionSchema.index({ itemId: 1, status: 1 });
questionSchema.index({ dateCreated: -1 });

// Methods
questionSchema.methods.getSummary = function () {
  return {
    id: this.id,
    mlQuestionId: this.mlQuestionId,
    itemId: this.itemId,
    text: this.text,
    status: this.status,
    from: this.from,
    dateCreated: this.dateCreated,
    hasAnswer: !!this.answer?.text,
    item: this.item,
  };
};

questionSchema.methods.getDetails = function () {
  return {
    id: this.id,
    mlQuestionId: this.mlQuestionId,
    itemId: this.itemId,
    text: this.text,
    status: this.status,
    answer: this.answer,
    from: this.from,
    dateCreated: this.dateCreated,
    item: this.item,
    lastSyncedAt: this.lastSyncedAt,
  };
};

// Static: Find unanswered questions
questionSchema.statics.findUnanswered = function (accountId, options = {}) {
  const query = this.find({
    accountId,
    status: 'UNANSWERED',
  }).sort({ dateCreated: -1 });
  
  if (options.limit) query.limit(options.limit);
  
  return query;
};

// Static: Find questions by item
questionSchema.statics.findByItemId = function (accountId, itemId) {
  return this.find({ accountId, itemId }).sort({ dateCreated: -1 });
};

// Static: Get question statistics
questionSchema.statics.getStats = async function (accountId) {
  const stats = await this.aggregate([
    { $match: { accountId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    unanswered: 0,
    answered: 0,
    other: 0,
  };

  stats.forEach(s => {
    result.total += s.count;
    if (s._id === 'UNANSWERED') result.unanswered = s.count;
    else if (s._id === 'ANSWERED') result.answered = s.count;
    else result.other += s.count;
  });

  return result;
};

module.exports = mongoose.model('Question', questionSchema);
