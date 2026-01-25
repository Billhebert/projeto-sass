/**
 * Main Express.js Server for Projeto SASS Dashboard
 * Handles Mercado Livre OAuth, API Integration, and Webhooks
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create HTTP server for WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// ============================================
// MIDDLEWARE
// ============================================

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Import route handlers
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');
const accountRoutes = require('./routes/accounts');
const syncRoutes = require('./routes/sync');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/sync', syncRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// ============================================
// WEBSOCKET SETUP
// ============================================

const connectedClients = new Set();

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  connectedClients.add(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket message:', data.type);
      
      // Handle different message types
      switch(data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        case 'subscribe-account':
          // Subscribe to account updates
          ws.accountId = data.accountId;
          ws.send(JSON.stringify({ type: 'subscribed', accountId: data.accountId }));
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
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
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    ...(NODE_ENV === 'development' && { details: error.stack })
  });
});

// ============================================
// SERVER STARTUP
// ============================================

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  PROJETO SASS - Backend Server                                ║
║  Environment: ${NODE_ENV.toUpperCase().padEnd(13, ' ')}                           ║
║  Port: ${PORT.toString().padEnd(50, ' ')}║
║  WebSocket: /ws                                               ║
║                                                                ║
║  API Endpoints:                                               ║
║    • POST   /api/auth/ml-callback     - OAuth token exchange  ║
║    • POST   /api/auth/ml-refresh      - Token refresh         ║
║    • GET    /api/accounts             - List accounts         ║
║    • POST   /api/accounts/:id/sync    - Sync account          ║
║    • POST   /api/webhooks/ml          - ML webhook events     ║
║    • GET    /health                   - Health check          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, wss };
