/**
 * Database Migration Script
 * Cria índices e inicializa dados
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const logger = require('../logger');

// Importar modelos
const Account = require('./models/Account');
const Event = require('./models/Event');
const Log = require('./models/Log');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projeto-sass';

/**
 * Executar migrations
 */
async function migrate() {
  try {
    logger.info('Starting database migrations...');

    // Conectar ao MongoDB
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
    logger.info('✓ Connected to MongoDB');

    // Criar índices
    await createIndexes();

    // Validar conexão
    await validateConnection();

    logger.info('✓ All migrations completed successfully');
    process.exit(0);

  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Criar todos os índices necessários
 */
async function createIndexes() {
  logger.info('Creating indexes...');

  try {
    // Account indexes
    await Account.collection.createIndex({ accountId: 1 }, { unique: true });
    await Account.collection.createIndex({ userId: 1 }, { unique: true });
    await Account.collection.createIndex({ email: 1 });
    await Account.collection.createIndex({ status: 1 });
    await Account.collection.createIndex({ createdAt: -1 });
    await Account.collection.createIndex({ userId: 1, status: 1 });
    
    logger.info('✓ Account indexes created');

    // Event indexes
    await Event.collection.createIndex({ eventId: 1 }, { unique: true });
    await Event.collection.createIndex({ accountId: 1 });
    await Event.collection.createIndex({ userId: 1 });
    await Event.collection.createIndex({ topic: 1 });
    await Event.collection.createIndex({ status: 1 });
    await Event.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 dias
    await Event.collection.createIndex({ userId: 1, topic: 1, createdAt: -1 });
    
    logger.info('✓ Event indexes created');

    // Log indexes
    await Log.collection.createIndex({ level: 1, timestamp: -1 });
    await Log.collection.createIndex({ context: 1, timestamp: -1 });
    await Log.collection.createIndex({ requestId: 1 });
    await Log.collection.createIndex({ accountId: 1, timestamp: -1 });
    await Log.collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 604800 }); // 7 dias
    
    logger.info('✓ Log indexes created');

  } catch (error) {
    logger.error('Error creating indexes:', error);
    throw error;
  }
}

/**
 * Validar conexão com banco
 */
async function validateConnection() {
  logger.info('Validating database connection...');

  try {
    // Testar ping
    await mongoose.connection.db.admin().ping();
    logger.info('✓ Database connection validated');

    // Verificar coleções
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    logger.info(`✓ Collections found: ${collectionNames.join(', ')}`);

    // Contar documentos
    const accountCount = await Account.countDocuments();
    const eventCount = await Event.countDocuments();
    const logCount = await Log.countDocuments();

    logger.info(`✓ Database stats:`, {
      accounts: accountCount,
      events: eventCount,
      logs: logCount
    });

  } catch (error) {
    logger.error('Database validation failed:', error);
    throw error;
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  migrate();
}

module.exports = { migrate, createIndexes, validateConnection };
