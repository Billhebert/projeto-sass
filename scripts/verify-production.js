#!/usr/bin/env node

/**
 * Production Readiness Verification Script
 * Verifica se tudo está configurado para produção
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function pass(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
  checks.passed++;
}

function fail(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
  checks.failed++;
}

function warn(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
  checks.warnings++;
}

function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

async function checkEnvironmentVariables() {
  console.log('\n📋 Environment Variables');
  console.log('─'.repeat(50));

  const requiredVars = [
    'NODE_ENV',
    'MONGODB_URI',
    'ML_CLIENT_ID',
    'ML_CLIENT_SECRET',
    'ML_REDIRECT_URI'
  ];

  const env = require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

  for (const varName of requiredVars) {
    if (env.parsed?.[varName]) {
      pass(`${varName} is set`);
    } else {
      fail(`${varName} is NOT set`);
    }
  }

  if (env.parsed?.NODE_ENV !== 'production') {
    warn(`NODE_ENV is "${env.parsed?.NODE_ENV}" (should be "production")`);
  }
}

async function checkFiles() {
  console.log('\n📁 Required Files');
  console.log('─'.repeat(50));

  const requiredFiles = [
    'backend/server.js',
    'backend/routes/auth.js',
    'backend/routes/webhooks.js',
    'backend/routes/accounts.js',
    'backend/routes/sync.js',
    'backend/db/mongodb.js',
    'backend/db/models/Account.js',
    'package.json',
    'docker-compose.yml',
    'Dockerfile',
    'nginx.conf',
    'ecosystem.config.js'
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      pass(`${file} exists`);
    } else {
      fail(`${file} NOT found`);
    }
  }
}

async function checkDependencies() {
  console.log('\n📦 Dependencies');
  console.log('─'.repeat(50));

  const requiredPackages = [
    'express',
    'mongoose',
    'pino',
    'axios',
    'cors',
    'helmet',
    'ws'
  ];

  const packageJson = require('../package.json');

  for (const pkg of requiredPackages) {
    if (packageJson.dependencies[pkg] || packageJson.devDependencies[pkg]) {
      pass(`${pkg} is installed`);
    } else {
      fail(`${pkg} is NOT installed`);
    }
  }
}

async function checkNodeVersion() {
  console.log('\n🔧 Node.js Version');
  console.log('─'.repeat(50));

  try {
    const { stdout } = await execPromise('node --version');
    const version = stdout.trim();
    const majorVersion = parseInt(version.split('.')[0].substring(1));

    if (majorVersion >= 16) {
      pass(`Node.js ${version} is supported`);
    } else {
      fail(`Node.js ${version} - minimum v16 required`);
    }
  } catch (error) {
    fail('Could not determine Node.js version');
  }
}

async function checkDatabase() {
  console.log('\n🗄️  Database Connection');
  console.log('─'.repeat(50));

  try {
    const mongoose = require('mongoose');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/projeto-sass';

    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    pass(`MongoDB connection successful`);
    await mongoose.disconnect();
  } catch (error) {
    fail(`MongoDB connection failed: ${error.message}`);
  }
}

async function checkDocker() {
  console.log('\n🐳 Docker');
  console.log('─'.repeat(50));

  try {
    await execPromise('docker --version');
    pass('Docker is installed');

    try {
      await execPromise('docker-compose --version');
      pass('Docker Compose is installed');
    } catch {
      warn('Docker Compose is NOT installed (optional for development)');
    }
  } catch (error) {
    warn('Docker is NOT installed (optional for Kubernetes deployment)');
  }
}

async function checkSSL() {
  console.log('\n🔒 SSL/TLS Certificate');
  console.log('─'.repeat(50));

  if (fs.existsSync('ssl/cert.pem') && fs.existsSync('ssl/key.pem')) {
    pass('SSL certificate files exist');

    try {
      const { stdout } = await execPromise('openssl x509 -in ssl/cert.pem -noout -dates');
      console.log(stdout.split('\n').filter(Boolean).map(line => `  ${line}`).join('\n'));
    } catch {
      warn('Could not read SSL certificate details');
    }
  } else {
    warn('SSL certificate files NOT found (required for production)');
    info('Run: ./scripts/setup-ssl.sh yourdomain.com');
  }
}

async function checkSecurity() {
  console.log('\n🔐 Security Checks');
  console.log('─'.repeat(50));

  // Check .env não está no git
  if (fs.existsSync('.git')) {
    try {
      const { stdout } = await execPromise('git ls-files backend/.env');
      if (!stdout.trim()) {
        pass('.env file is NOT tracked by git');
      } else {
        fail('.env file is tracked by git (remove from git)');
      }
    } catch {
      pass('.env file is NOT tracked by git');
    }
  }

  // Check secret values
  const env = require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
  if (env.parsed?.ML_CLIENT_SECRET && env.parsed.ML_CLIENT_SECRET !== 'your_secret_here') {
    pass('ML_CLIENT_SECRET is configured');
  }

  // Check helmet setup
  const serverFile = fs.readFileSync('backend/server.js', 'utf8');
  if (serverFile.includes('helmet')) {
    pass('Security headers (Helmet) is configured');
  } else {
    fail('Security headers (Helmet) NOT found');
  }
}

async function checkLogs() {
  console.log('\n📝 Logging');
  console.log('─'.repeat(50));

  if (fs.existsSync('logs')) {
    pass('Logs directory exists');
  } else {
    warn('Logs directory NOT found (will be created at runtime)');
  }

  const serverFile = fs.readFileSync('backend/server.js', 'utf8');
  if (serverFile.includes('logger') || serverFile.includes('pino')) {
    pass('Logging is configured');
  } else {
    warn('Logging configuration NOT found');
  }
}

async function checkMonitoring() {
  console.log('\n📊 Monitoring');
  console.log('─'.repeat(50));

  const packageJson = require('../package.json');
  
  if (packageJson.dependencies['pino']) {
    pass('Pino logging is installed');
  }

  // Check health endpoint
  const serverFile = fs.readFileSync('backend/server.js', 'utf8');
  if (serverFile.includes('/health')) {
    pass('Health check endpoint is implemented');
  }
}

async function runAllChecks() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  PROJETO SASS - Production Readiness Check                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

  await checkEnvironmentVariables();
  await checkFiles();
  await checkDependencies();
  await checkNodeVersion();
  await checkDocker();
  await checkSSL();
  await checkSecurity();
  await checkLogs();
  await checkMonitoring();

  try {
    await checkDatabase();
  } catch (error) {
    fail(`Database check failed: ${error.message}`);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                         Summary                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`${colors.green}✓ Passed:${colors.reset}   ${checks.passed}`);
  console.log(`${colors.red}✗ Failed:${colors.reset}   ${checks.failed}`);
  console.log(`${colors.yellow}⚠ Warnings:${colors.reset} ${checks.warnings}`);

  if (checks.failed === 0) {
    console.log(`\n${colors.green}✓ All critical checks passed!${colors.reset}`);
    console.log('\nYour application is ready for production.\n');
    process.exit(0);
  } else {
    console.log(`\n${colors.red}✗ Please fix the issues above before deploying to production.${colors.reset}\n`);
    process.exit(1);
  }
}

runAllChecks();
