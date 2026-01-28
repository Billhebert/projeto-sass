/**
 * Account Model
 * Stores Mercado Livre account connections and OAuth tokens
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const accountSchema = new mongoose.Schema({
  // Identificação
  accountId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  nickname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  firstName: String,
  lastName: String,

  // OAuth Tokens (encriptados no banco)
  accessToken: {
    type: String,
    required: true,
    encrypted: true
  },
  refreshToken: {
    type: String,
    required: true,
    encrypted: true
  },
  tokenExpiry: {
    type: Date,
    required: true
  },

  // Status
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'syncing', 'error'],
    default: 'connected',
    index: true
  },

  // Sincronização
  lastSyncTime: Date,
  lastSyncStatus: {
    type: String,
    enum: ['success', 'failed', 'in_progress'],
    default: null
  },
  lastSyncError: String,
  lastSyncData: {
    itemsCount: Number,
    ordersCount: Number,
    metrics: mongoose.Schema.Types.Mixed,
    syncedAt: Date
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: Date,

  // Configurações
  syncInterval: {
    type: Number,
    default: 300000 // 5 minutos em ms
  },
  autoSync: {
    type: Boolean,
    default: true
  },
  webhooksEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'accounts'
});

// Índices para performance (additional, non-duplicated)
accountSchema.index({ userId: 1, status: 1 });
accountSchema.index({ lastSyncTime: -1 });

// Middleware: atualizar updatedAt
accountSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Método: verificar se token está expirado
accountSchema.methods.isTokenExpired = function() {
  return new Date() >= this.tokenExpiry;
};

// Método: marcar como último ativo
accountSchema.methods.touchLastActive = async function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Método: resetar status de sincronização
accountSchema.methods.resetSyncStatus = async function() {
  this.lastSyncStatus = null;
  this.lastSyncError = null;
  return this.save();
};

// Stático: encontrar por user ID
accountSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId });
};

// Stático: encontrar contas ativas
accountSchema.statics.findActive = function() {
  return this.find({ status: 'connected' });
};

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
