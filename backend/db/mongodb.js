/**
 * MongoDB Connection and Configuration
 * Database initialization and connection pooling
 */

const mongoose = require('mongoose');
const logger = require('../logger');

let mongoMemoryServer = null;
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projeto-sass';

const MONGODB_OPTIONS = {
  maxPoolSize: 20,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: 'majority',
};

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    // Use in-memory MongoDB for testing if NODE_ENV is test
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      MONGODB_URI = mongoMemoryServer.getUri();
      logger.info('✓ Using MongoDB Memory Server for testing');
    }

    await mongoose.connect(MONGODB_URI, MONGODB_OPTIONS);
    logger.info('✓ MongoDB connected successfully');
    
    // Setup event listeners
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected, attempting to reconnect...');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      logger.info('✓ MongoDB Memory Server stopped');
    }
    logger.info('✓ MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}

/**
 * Get connection status
 */
function getConnectionStatus() {
  return {
    connected: mongoose.connection.readyState === 1,
    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
    database: mongoose.connection.name,
    uri: MONGODB_URI
  };
}

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  mongoose
};
