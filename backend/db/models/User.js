/**
 * User Model
 * User authentication and profile management
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Invalid email format'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // Don't include password by default in queries
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    
    // Profile
    avatar: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    company: {
      type: String,
      default: null,
    },
    
    // Mercado Livre Integration
    mlAccounts: [
      {
        accountId: String,
        userId: String,
        nickname: String,
        status: {
          type: String,
          enum: ['active', 'inactive', 'disabled'],
          default: 'active',
        },
        connectedAt: Date,
      },
    ],
    
    // Account Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'deleted'],
      default: 'active',
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    
    // Password Reset
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    lastPasswordChange: {
      type: Date,
      default: null,
    },
    
    // Two-Factor Authentication
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
      default: null,
    },
    backupCodes: [
      {
        code: String,
        used: Boolean,
        usedAt: Date,
      },
    ],
    
    // Security & Preferences
    preferences: {
      language: {
        type: String,
        enum: ['pt', 'en', 'es'],
        default: 'pt',
      },
      timezone: {
        type: String,
        default: 'America/Sao_Paulo',
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: false,
      },
    },
    
    // Activity Tracking
    lastLogin: {
      type: Date,
      default: null,
    },
    lastLoginIP: {
      type: String,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    
    // API Keys
    apiKeys: [
      {
        id: {
          type: String,
          default: () => uuidv4(),
        },
        name: String,
        key: String, // Hashed
        lastUsed: Date,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    
    // Sessions
    sessions: [
      {
        id: {
          type: String,
          default: () => uuidv4(),
        },
        token: String, // Hashed JWT token
        userAgent: String,
        ipAddress: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: Date,
        lastActivity: Date,
      },
    ],
    
    // Metadata
    metadata: {
      plan: {
        type: String,
        enum: ['free', 'starter', 'professional', 'enterprise'],
        default: 'free',
      },
      accountsLimit: {
        type: Number,
        default: 1,
      },
      apiCallsLimit: {
        type: Number,
        default: 1000,
      },
      apiCallsUsed: {
        type: Number,
        default: 0,
      },
      totalAccounts: {
        type: Number,
        default: 0,
      },
    },
    
    // Roles & Permissions
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator', 'viewer'],
      default: 'user',
      index: true,
    },
    permissions: [String], // Custom permissions
    
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
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Indexes for performance (additional, non-duplicated)
userSchema.index({ createdAt: -1 });
userSchema.index({ 'mlAccounts.accountId': 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password is new or modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.lastPasswordChange = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to hash tokens
userSchema.methods.hashToken = function (token) {
  return require('crypto').createHash('sha256').update(token).digest('hex');
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  this.passwordResetToken = this.hashToken(resetToken);
  this.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  return resetToken;
};

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  this.emailVerificationToken = this.hashToken(verificationToken);
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return verificationToken;
};

// Method to verify email
userSchema.methods.verifyEmail = function (token) {
  const hashedToken = this.hashToken(token);
  if (this.emailVerificationToken !== hashedToken) {
    return false;
  }
  if (this.emailVerificationExpires < new Date()) {
    return false;
  }
  this.emailVerified = true;
  this.emailVerificationToken = null;
  this.emailVerificationExpires = null;
  return true;
};

// Method to verify password reset token
userSchema.methods.verifyPasswordResetToken = function (token) {
  const hashedToken = this.hashToken(token);
  if (this.passwordResetToken !== hashedToken) {
    return false;
  }
  if (this.passwordResetExpires < new Date()) {
    return false;
  }
  return true;
};

// Method to lock account on failed login attempts
userSchema.methods.lockAccount = function () {
  this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
};

// Method to check if account is locked
userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  // Otherwise increment
  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 attempts
  if (this.loginAttempts + 1 >= 5 && !this.isAccountLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + 30 * 60 * 1000) };
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Method to add API key
userSchema.methods.addApiKey = function (name, key) {
  const hashedKey = require('crypto').createHash('sha256').update(key).digest('hex');
  this.apiKeys.push({
    id: uuidv4(),
    name,
    key: hashedKey,
    createdAt: new Date(),
  });
  return this.save();
};

// Method to revoke API key
userSchema.methods.revokeApiKey = function (keyId) {
  this.apiKeys = this.apiKeys.filter(k => k.id !== keyId);
  return this.save();
};

// Method to add session
userSchema.methods.addSession = function (token, userAgent, ipAddress, expiresAt) {
  const hashedToken = this.hashToken(token);
  this.sessions.push({
    id: uuidv4(),
    token: hashedToken,
    userAgent,
    ipAddress,
    createdAt: new Date(),
    expiresAt,
    lastActivity: new Date(),
  });
  return this.save();
};

// Method to revoke session
userSchema.methods.revokeSession = function (sessionId) {
  this.sessions = this.sessions.filter(s => s.id !== sessionId);
  return this.save();
};

// Method to get user profile (without sensitive data)
userSchema.methods.getProfile = function () {
  return {
    id: this.id,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    avatar: this.avatar,
    phone: this.phone,
    company: this.company,
    emailVerified: this.emailVerified,
    status: this.status,
    preferences: this.preferences || {},
    lastLogin: this.lastLogin,
    role: this.role,
    plan: this.metadata?.plan || 'free',
    createdAt: this.createdAt,
  };
};

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
