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
      type: String,
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
    // accessToken: Used for API calls to Mercado Livre
    // refreshToken: Used to get new accessToken when it expires
    // 
    // Lifecycle:
    // 1. User provides accessToken (manual) or gets it via OAuth
    // 2. If refreshToken is provided, system can auto-renew accessToken
    // 3. When accessToken expires, use refreshToken to get new one
    // 4. New refreshToken comes with the new accessToken
    // 5. Both are stored for next refresh cycle
    accessToken: {
      type: String,
      required: [true, 'Access token is required'],
      trim: true,
    },
    refreshToken: {
      type: String,
      default: null, // Will be null if user provided token manually (without OAuth)
      trim: true,
    },
    tokenExpiresAt: {
      type: Date,
      required: [true, 'Token expiration time is required'],
    },

    // OAuth Client Credentials
    // These are the client's own Mercado Livre app credentials
    // Used for automatic token refresh (refresh_token grant)
    // 
    // Flow:
    // 1. Client provides: client_id, client_secret, code, redirect_uri
    // 2. We exchange code for tokens
    // 3. We store: client_id, client_secret, access_token, refresh_token
    // 4. When token expires, we use client_id + client_secret + refresh_token to get new token
    clientId: {
      type: String,
      default: null, // Will be null if user provided token manually without OAuth
      trim: true,
      index: true,
    },
    clientSecret: {
      type: String,
      default: null, // Will be null if user provided token manually without OAuth
      trim: true,
    },
    redirectUri: {
      type: String,
      default: null, // Will be null if user provided token manually without OAuth
      trim: true,
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
    nextTokenRefreshNeeded: {
      type: Date,
      default: null,
    },
    tokenRefreshStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'success', 'failed', null],
      default: null,
    },
    tokenRefreshError: {
      type: String,
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

// Indexes for performance (additional, non-duplicated)
mlAccountSchema.index({ userId: 1, status: 1 });
mlAccountSchema.index({ userId: 1, isPrimary: 1 });
mlAccountSchema.index({ lastSync: -1 });
mlAccountSchema.index({ nextSync: 1 });
mlAccountSchema.index({ clientId: 1 }); // For finding accounts with OAuth credentials

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

// Update token refresh status
mlAccountSchema.methods.updateTokenRefreshStatus = async function (status, error = null) {
  this.tokenRefreshStatus = status;
  
  if (status === 'success') {
    this.lastTokenRefresh = new Date();
    this.tokenRefreshError = null;
    // Next refresh needed in ~5.5 hours (refresh when 5 min left)
    this.nextTokenRefreshNeeded = new Date(this.tokenExpiresAt.getTime() - 5 * 60 * 1000);
  } else if (status === 'failed' && error) {
    this.tokenRefreshError = error;
    // Retry refresh in 1 hour if it failed
    this.nextTokenRefreshNeeded = new Date(Date.now() + 60 * 60 * 1000);
  }
  
  return this.save();
};

// Mark tokens as refreshed (call this when new tokens are received)
mlAccountSchema.methods.refreshedTokens = async function (newAccessToken, newRefreshToken, expiresInSeconds) {
  this.accessToken = newAccessToken;
  if (newRefreshToken) {
    this.refreshToken = newRefreshToken;
  }
  this.tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  this.lastTokenRefresh = new Date();
  this.nextTokenRefreshNeeded = new Date(this.tokenExpiresAt.getTime() - 5 * 60 * 1000);
  this.tokenRefreshStatus = 'success';
  this.tokenRefreshError = null;
  
  return this.save();
};

// Check if token refresh is needed
mlAccountSchema.methods.isTokenRefreshNeeded = function () {
  // Can only refresh if we have a refresh token
  // (credentials come from account or .env fallback)
  if (!this.refreshToken) {
    return false;
  }
  return new Date() >= (this.nextTokenRefreshNeeded || this.tokenExpiresAt);
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
    // Token refresh info
    // canAutoRefresh: true if account has refreshToken (uses .env credentials as fallback)
    canAutoRefresh: !!this.refreshToken,
    hasOAuthCredentials: !!(this.clientId && this.clientSecret),
    hasRefreshToken: !!this.refreshToken,
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
