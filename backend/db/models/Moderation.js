/**
 * Moderation Model - MongoDB Schema
 * Stores item health and moderation status from ML
 */

const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['error', 'warning', 'info', 'status'],
    required: true,
  },
  code: String,
  message: String,
  recommendation: String,
  source: {
    type: String,
    enum: ['health', 'item', 'tags', 'system'],
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  fixable: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  message: String,
  attributeId: String,
  attributeName: String,
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: Date,
}, { _id: false });

const moderationSchema = new mongoose.Schema({
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
  permalink: String,
  categoryId: String,

  // Status
  itemStatus: {
    type: String,
    enum: ['active', 'paused', 'closed', 'under_review', 'inactive'],
    index: true,
  },
  subStatus: [String],

  // Health Score (0-100)
  healthScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
    index: true,
  },

  // Issues and Actions
  issues: [issueSchema],
  requiredActions: [actionSchema],

  // Counts
  issueCount: {
    type: Number,
    default: 0,
  },
  errorCount: {
    type: Number,
    default: 0,
  },
  warningCount: {
    type: Number,
    default: 0,
  },
  actionCount: {
    type: Number,
    default: 0,
  },

  // Raw Health Data
  healthData: {
    type: mongoose.Schema.Types.Mixed,
  },

  // History
  statusHistory: [{
    status: String,
    date: { type: Date, default: Date.now },
    reason: String,
  }],

  // Resolution
  isResolved: {
    type: Boolean,
    default: false,
    index: true,
  },
  resolvedAt: Date,
  resolvedBy: String,

  // Sync metadata
  lastSyncAt: {
    type: Date,
    default: Date.now,
  },
  lastHealthCheck: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound indexes
moderationSchema.index({ accountId: 1, itemId: 1 }, { unique: true });
moderationSchema.index({ accountId: 1, itemStatus: 1 });
moderationSchema.index({ accountId: 1, healthScore: 1 });
moderationSchema.index({ accountId: 1, isResolved: 1 });
moderationSchema.index({ accountId: 1, errorCount: -1 });

// Pre-save hook to update counts
moderationSchema.pre('save', function(next) {
  this.issueCount = this.issues?.length || 0;
  this.errorCount = this.issues?.filter(i => i.type === 'error').length || 0;
  this.warningCount = this.issues?.filter(i => i.type === 'warning').length || 0;
  this.actionCount = this.requiredActions?.filter(a => !a.completed).length || 0;
  
  // Check if resolved
  this.isResolved = this.errorCount === 0 && 
                    this.actionCount === 0 && 
                    this.itemStatus === 'active';
  
  if (this.isResolved && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  
  next();
});

// Instance methods
moderationSchema.methods.addIssue = function(issue) {
  // Check for duplicates
  const exists = this.issues.some(i => i.code === issue.code);
  if (!exists) {
    this.issues.push(issue);
    this.calculateHealthScore();
  }
  return this;
};

moderationSchema.methods.calculateHealthScore = function() {
  let score = 100;
  
  this.issues.forEach(issue => {
    if (issue.type === 'error') {
      score -= issue.severity === 'critical' ? 30 : 25;
    } else if (issue.type === 'warning') {
      score -= issue.severity === 'high' ? 15 : 10;
    }
  });
  
  // Status penalties
  if (this.itemStatus === 'under_review') score -= 20;
  if (this.itemStatus === 'inactive') score -= 30;
  if (this.itemStatus === 'paused') score -= 10;
  
  this.healthScore = Math.max(0, score);
  return this.healthScore;
};

moderationSchema.methods.addStatusToHistory = function(status, reason = '') {
  this.statusHistory.push({
    status,
    date: new Date(),
    reason,
  });
  return this;
};

// Static methods
moderationSchema.statics.getAccountSummary = async function(accountId) {
  const summary = await this.aggregate([
    { $match: { accountId: new mongoose.Types.ObjectId(accountId) } },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        avgHealthScore: { $avg: '$healthScore' },
        underReview: {
          $sum: { $cond: [{ $eq: ['$itemStatus', 'under_review'] }, 1, 0] }
        },
        inactive: {
          $sum: { $cond: [{ $eq: ['$itemStatus', 'inactive'] }, 1, 0] }
        },
        withErrors: {
          $sum: { $cond: [{ $gt: ['$errorCount', 0] }, 1, 0] }
        },
        withWarnings: {
          $sum: { $cond: [{ $gt: ['$warningCount', 0] }, 1, 0] }
        },
        pendingActions: { $sum: '$actionCount' },
      }
    }
  ]);

  return summary[0] || {
    totalItems: 0,
    avgHealthScore: 100,
    underReview: 0,
    inactive: 0,
    withErrors: 0,
    withWarnings: 0,
    pendingActions: 0,
  };
};

moderationSchema.statics.getProblematicItems = async function(accountId, limit = 20) {
  return this.find({
    accountId,
    $or: [
      { errorCount: { $gt: 0 } },
      { itemStatus: { $in: ['under_review', 'inactive'] } },
    ],
  })
  .sort({ errorCount: -1, healthScore: 1 })
  .limit(limit);
};

moderationSchema.statics.getByHealthRange = async function(accountId, minScore, maxScore) {
  return this.find({
    accountId,
    healthScore: { $gte: minScore, $lte: maxScore },
  }).sort({ healthScore: 1 });
};

const Moderation = mongoose.model('Moderation', moderationSchema);

module.exports = Moderation;
