/**
 * Event Model
 * Logs all Mercado Livre webhook events
 */

const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // Identificação
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  accountId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: Number,
    required: true,
    index: true
  },

  // Evento ML
  topic: {
    type: String,
    enum: ['orders_v2', 'items', 'shipments', 'questions', 'payments', 'disputes'],
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: {
    type: String,
    index: true
  },

  // Payload
  payload: mongoose.Schema.Types.Mixed,
  
  // Processamento
  status: {
    type: String,
    enum: ['received', 'processing', 'processed', 'failed'],
    default: 'received',
    index: true
  },
  processingStartedAt: Date,
  processedAt: Date,
  processError: String,
  retryCount: {
    type: Number,
    default: 0
  },

  // Metadata
  ipAddress: String,
  signature: String,
  requestId: String,

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 2592000 // Auto-delete após 30 dias
  }
}, {
  timestamps: true,
  collection: 'events'
});

// Índices
eventSchema.index({ userId: 1, topic: 1, createdAt: -1 });
eventSchema.index({ status: 1, createdAt: -1 });
eventSchema.index({ accountId: 1, processedAt: -1 });

// Método: marcar como processado
eventSchema.methods.markAsProcessed = async function() {
  this.status = 'processed';
  this.processedAt = new Date();
  return this.save();
};

// Método: marcar como falha
eventSchema.methods.markAsFailed = async function(error) {
  this.status = 'failed';
  this.processError = error;
  this.retryCount += 1;
  return this.save();
};

// Método: iniciar processamento
eventSchema.methods.startProcessing = async function() {
  this.status = 'processing';
  this.processingStartedAt = new Date();
  return this.save();
};

// Stático: encontrar eventos pendentes
eventSchema.statics.findPending = function() {
  return this.find({ status: { $in: ['received', 'failed'] } }).limit(100);
};

// Stático: contar eventos por tópico
eventSchema.statics.countByTopic = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'processed'
      }
    },
    {
      $group: {
        _id: '$topic',
        count: { $sum: 1 }
      }
    }
  ]);
};

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
