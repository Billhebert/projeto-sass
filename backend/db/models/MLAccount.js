/**
 * MLAccount Model
 * Stores Mercado Livre account connections for users
 * Allows one user to have multiple ML accounts
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const mlAccountSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `ml_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
      unique: true,
      index: true,
    },

    // User Link
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },

    // Mercado Livre Identifiers
    mlUserId: {
      type: String,
      required: [true, 'Mercado Livre user ID is required'],
      index: true,
    },
    nickname: {
      type: String,
      required: [true, 'Nickname is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },

    // OAuth Tokens (encrypted)
    accessToken: {
      type: String,
      required: [true, 'Access token is required'],
    },
    refreshToken: {
      type: String,
      required: [true, 'Refresh token is required'],
    },
    tokenExpiresAt: {
      type: Date,
      required: [true, 'Token expiration time is required'],
    },

    // Account Status
    status: {
      type: String,
      enum: ['active', 'paused', 'error', 'expired'],
      default: 'active',
      index: true,
    },

    // Synchronization
    syncEnabled: {
      type: Boolean,
      default: true,
    },
    syncInterval: {
      type: Number,
      default: 300000, // 5 minutes in ms
    },
    lastSync: {
      type: Date,
      default: null,
    },
    nextSync: {
      type: Date,
      default: null,
    },
    lastSyncStatus: {
      type: String,
      enum: ['success', 'failed', 'in_progress', null],
      default: null,
    },
    lastSyncError: {
      type: String,
      default: null,
    },

    // Cached Data
    cachedData: {
      products: {
        type: Number,
        default: 0,
      },
      orders: {
        type: Number,
        default: 0,
      },
      issues: {
        type: Number,
        default: 0,
      },
      lastUpdated: Date,
    },

    // Account Metadata
    accountName: {
      type: String,
      default: null, // Custom user name for this account
    },
    accountType: {
      type: String,
      enum: ['store', 'individual', 'business'],
      default: 'individual',
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },

    // Notifications
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    emailNotificationsEnabled: {
      type: Boolean,
      default: true,
    },

    // Error Tracking
    errorCount: {
      type: Number,
      default: 0,
    },
    errorHistory: [
      {
        timestamp: Date,
        error: String,
        statusCode: Number,
      },
    ],

    // Webhooks
    webhooksEnabled: {
      type: Boolean,
      default: true,
    },
    webhookUrl: {
      type: String,
      default: null,
    },
    webhookSecret: {
      type: String,
      default: null,
    },

    // Activity Tracking
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    lastTokenRefresh: {
      type: Date,
      default: null,
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
    disconnectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'ml_accounts',
  }
);

// Indexes for performance
mlAccountSchema.index({ userId: 1, status: 1 });
mlAccountSchema.index({ userId: 1, isPrimary: 1 });
mlAccountSchema.index({ mlUserId: 1 });
mlAccountSchema.index({ lastSync: -1 });
mlAccountSchema.index({ nextSync: 1 });
mlAccountSchema.index({ createdAt: -1 });

// Check if token is expired
mlAccountSchema.methods.isTokenExpired = function () {
  return new Date() >= this.tokenExpiresAt;
};

// Mark as last activity
mlAccountSchema.methods.touchLastActivity = async function () {
  this.lastActivity = new Date();
  return this.save();
};

// Update sync status
mlAccountSchema.methods.updateSyncStatus = async function (status, error = null) {
  this.lastSyncStatus = status;
  if (status === 'in_progress') {
    this.nextSync = new Date(Date.now() + this.syncInterval);
  }
  if (error) {
    this.lastSyncError = error;
    this.errorCount = (this.errorCount || 0) + 1;
    // Keep last 20 errors
    if (!this.errorHistory) this.errorHistory = [];
    this.errorHistory.push({
      timestamp: new Date(),
      error,
    });
    if (this.errorHistory.length > 20) {
      this.errorHistory.shift();
    }
  } else {
    this.lastSyncError = null;
    this.lastSync = new Date();
    this.errorCount = 0; // Reset error count on success
  }
  return this.save();
};

// Update cached data
mlAccountSchema.methods.updateCachedData = async function (data) {
  this.cachedData = {
    products: data.products || 0,
    orders: data.orders || 0,
    issues: data.issues || 0,
    lastUpdated: new Date(),
  };
  return this.save();
};

// Pause synchronization
mlAccountSchema.methods.pauseSync = async function () {
  this.syncEnabled = false;
  this.status = 'paused';
  return this.save();
};

// Resume synchronization
mlAccountSchema.methods.resumeSync = async function () {
  this.syncEnabled = true;
  this.status = 'active';
  this.nextSync = new Date(); // Trigger sync immediately
  return this.save();
};

// Add error to history
mlAccountSchema.methods.addError = async function (error, statusCode = null) {
  if (!this.errorHistory) this.errorHistory = [];
  this.errorHistory.push({
    timestamp: new Date(),
    error: error.message || error,
    statusCode,
  });
  // Keep only last 20 errors
  if (this.errorHistory.length > 20) {
    this.errorHistory.shift();
  }
  this.errorCount = (this.errorCount || 0) + 1;
  return this.save();
};

// Disconnect account
mlAccountSchema.methods.disconnect = async function () {
  this.status = 'error';
  this.syncEnabled = false;
  this.disconnectedAt = new Date();
  return this.save();
};

// Get account summary
mlAccountSchema.methods.getSummary = function () {
  return {
    id: this.id,
    userId: this.userId,
    mlUserId: this.mlUserId,
    nickname: this.nickname,
    email: this.email,
    accountName: this.accountName || this.nickname,
    status: this.status,
    isPrimary: this.isPrimary,
    syncEnabled: this.syncEnabled,
    lastSync: this.lastSync,
    nextSync: this.nextSync,
    cachedData: this.cachedData,
    errorCount: this.errorCount,
    createdAt: this.createdAt,
  };
};

// Static: Find all accounts for user
mlAccountSchema.statics.findByUserId = function (userId) {
  return this.find({ userId }).sort({ isPrimary: -1, createdAt: 1 });
};

// Static: Find primary account for user
mlAccountSchema.statics.findPrimaryAccount = function (userId) {
  return this.findOne({ userId, isPrimary: true });
};

// Static: Find active accounts needing sync
mlAccountSchema.statics.findAccountsToSync = function () {
  return this.find({
    syncEnabled: true,
    status: { $in: ['active', 'paused'] },
    $or: [{ nextSync: { $lte: new Date() } }, { lastSync: null }],
  });
};

// Static: Find accounts with expired tokens
mlAccountSchema.statics.findAccountsWithExpiredTokens = function () {
  return this.find({
    tokenExpiresAt: { $lte: new Date() },
    status: { $ne: 'error' },
  });
};

module.exports = mongoose.model('MLAccount', mlAccountSchema);
