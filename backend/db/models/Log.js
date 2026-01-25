/**
 * Log Model
 * Centraliza logs da aplicação
 */

const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  // Log info
  level: {
    type: String,
    enum: ['error', 'warn', 'info', 'debug'],
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  context: {
    type: String,
    index: true
  },
  
  // Dados
  data: mongoose.Schema.Types.Mixed,
  error: {
    name: String,
    message: String,
    stack: String
  },

  // Requisição (se aplicável)
  requestId: String,
  method: String,
  path: String,
  statusCode: Number,
  userId: Number,
  accountId: String,
  ipAddress: String,

  // Performance
  duration: Number,
  
  // Metadata
  environment: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 604800 // Auto-delete após 7 dias
  }
}, {
  collection: 'logs'
});

// Índices
logSchema.index({ level: 1, timestamp: -1 });
logSchema.index({ context: 1, timestamp: -1 });
logSchema.index({ requestId: 1 });
logSchema.index({ accountId: 1, timestamp: -1 });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
