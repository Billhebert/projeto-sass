/**
 * Test Server Starter with In-Memory MongoDB
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function startServer() {
  console.log('🚀 Starting MongoDB Memory Server...\n');
  
  // Start in-memory MongoDB
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  console.log('✓ MongoDB Memory Server started');
  console.log(`✓ Connection string: ${mongoUri}\n`);
  
  // Set environment variables
  process.env.MONGODB_URI = mongoUri;
  process.env.NODE_ENV = 'development';
  process.env.PORT = '3000';
  process.env.ML_CLIENT_ID = '1706187223829083';
  process.env.ML_CLIENT_SECRET = 'vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG';
  process.env.ML_REDIRECT_URI = 'http://localhost:3000/auth/ml-callback';
  process.env.JWT_SECRET = 'test-secret-key-very-long-for-jwt-testing-purposes-12345';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  
  console.log('✓ Environment variables configured');
  console.log('🔧 Starting Express server...\n');
  
  // Start server
  const server = spawn('node', ['backend/server.js'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: process.env
  });
  
  server.on('error', (err) => {
    console.error('❌ Server error:', err);
    process.exit(1);
  });
  
  server.on('exit', (code) => {
    console.log(`\n⚠️  Server stopped with exit code ${code}`);
    mongoServer.stop();
    process.exit(code);
  });
  
  // Handle process signals
  process.on('SIGTERM', () => {
    console.log('\n📍 Received SIGTERM, shutting down...');
    server.kill();
    mongoServer.stop();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('\n📍 Received SIGINT, shutting down...');
    server.kill();
    mongoServer.stop();
    process.exit(0);
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
