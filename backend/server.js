/**
 * Main Express.js Server - Production Ready
 * Projeto SASS Dashboard with Mercado Livre Integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize logger
const logger = require('./logger');

// Initialize database connection
const { connectDB } = require('./db/mongodb');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: NODE_ENV === 'production' ? [] : []
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => NODE_ENV !== 'production',
  keyGenerator: (req) => req.ip || req.connection.remoteAddress
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // limite de 10 tentativas
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// ============================================
// PARSING MIDDLEWARE
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// REQUEST CONTEXT MIDDLEWARE
// ============================================

app.use((req, res, next) => {
  // Gerar ID único para cada requisição
  req.id = uuidv4();
  req.startTime = Date.now();

  // Logger
  req.logger = new logger.Logger(`${req.method} ${req.path}`);

  // Interceptar response para logging
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - req.startTime;
    req.logger.logRequest(req, res, duration);
    return originalJson.call(this, data);
  };

  next();
});

// ============================================
// CORS CONFIGURATION
// ============================================

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    mongodb: require('./db/mongodb').getConnectionStatus()
  });
});

// ============================================
// ROUTES
// ============================================

// Import route handlers
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');
const accountRoutes = require('./routes/accounts');
const syncRoutes = require('./routes/sync');
const mlAccountRoutes = require('./routes/ml-accounts');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/ml-accounts', mlAccountRoutes);

// ============================================
// WEBSOCKET SETUP
// ============================================

const connectedClients = new Set();

wss.on('connection', (ws, req) => {
  ws.id = uuidv4();
  ws.lastHeartbeat = Date.now();
  
  logger.info(`WebSocket client connected: ${ws.id}`);
  connectedClients.add(ws);

  // Heartbeat check
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch(data.type) {
        case 'ping':
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: new Date().toISOString() 
          }));
          break;
        case 'subscribe-account':
          ws.accountId = data.accountId;
          ws.send(JSON.stringify({ 
            type: 'subscribed', 
            accountId: data.accountId 
          }));
          break;
        default:
          logger.debug(`Unknown WebSocket message type: ${data.type}`);
      }
    } catch (error) {
      logger.error('WebSocket message error:', { error: error.message });
    }
  });

  ws.on('close', () => {
    logger.info(`WebSocket client disconnected: ${ws.id}`);
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', { error: error.message, clientId: ws.id });
  });
});

// Heartbeat interval
const heartbeatInterval = setInterval(() => {
  connectedClients.forEach((ws) => {
    if (!ws.isAlive) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

/**
 * Broadcast message to all connected clients
 */
function broadcastToClients(message) {
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

/**
 * Send message to specific account subscribers
 */
function notifyAccountUpdate(accountId, update) {
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.accountId === accountId) {
      client.send(JSON.stringify({
        type: 'account-update',
        accountId,
        data: update,
        timestamp: new Date().toISOString()
      }));
    }
  });
}

// Export broadcast functions for use in route handlers
app.locals.broadcastToClients = broadcastToClients;
app.locals.notifyAccountUpdate = notifyAccountUpdate;

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    statusCode
  });

  res.status(statusCode).json({
    error: message,
    ...(NODE_ENV === 'development' && { 
      details: error.stack,
      path: req.path,
      method: req.method
    }),
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize ML Accounts background job
    const { initializeSchedules: initMLSchedules } = require('./jobs/ml-accounts-sync');
    await initMLSchedules().catch(error => {
      logger.warn('Failed to initialize ML accounts sync job:', { error: error.message });
      // Don't exit - let server continue without background jobs
    });

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`╔════════════════════════════════════════════════════════════════╗`);
      logger.info(`║                                                                ║`);
      logger.info(`║  PROJETO SASS - Backend Server                                ║`);
      logger.info(`║  Environment: ${NODE_ENV.toUpperCase().padEnd(13, ' ')}                           ║`);
      logger.info(`║  Port: ${PORT.toString().padEnd(50, ' ')}║`);
      logger.info(`║  WebSocket: /ws                                               ║`);
      logger.info(`║  Health: GET /health                                          ║`);
      logger.info(`║                                                                ║`);
      logger.info(`║  API Endpoints:                                               ║`);
      logger.info(`║    • POST   /api/auth/ml-callback     - OAuth token exchange  ║`);
      logger.info(`║    • POST   /api/auth/ml-refresh      - Token refresh         ║`);
      logger.info(`║    • GET    /api/accounts             - List accounts         ║`);
      logger.info(`║    • GET    /api/ml-accounts          - List ML accounts      ║`);
      logger.info(`║    • POST   /api/sync/account/:id     - Sync account          ║`);
      logger.info(`║    • POST   /api/webhooks/ml          - ML webhook events     ║`);
      logger.info(`║                                                                ║`);
      logger.info(`║  Background Jobs:                                             ║`);
      logger.info(`║    • ML Accounts sync (every 5 minutes)                       ║`);
      logger.info(`║    • Token refresh (every 30 minutes)                         ║`);
      logger.info(`║    • Health check (every 15 minutes)                          ║`);
      logger.info(`║                                                                ║`);
      logger.info(`╚════════════════════════════════════════════════════════════════╝`);
    });

  } catch (error) {
    logger.error('Failed to start server:', { error: error.message });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    connectedClients.forEach(ws => ws.close());
    process.exit(0);
  });
  
  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after 30s');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    connectedClients.forEach(ws => ws.close());
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
if (require.main === module) {
  startServer();
}

module.exports = { app, server, wss };
