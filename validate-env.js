#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates that all required environment variables are set before starting the application
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env file first
dotenv.config({ path: path.resolve('.env') });

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Required environment variables by environment
const requiredVars = {
  common: [
    'NODE_ENV',
    'MONGODB_URI',
    'MONGO_USER',
    'MONGO_PASSWORD',
  ],
  development: [
    'REDIS_PASSWORD',
    'JWT_SECRET',
    'ML_CLIENT_ID',
    'ML_CLIENT_SECRET',
  ],
  production: [
    'REDIS_PASSWORD',
    'JWT_SECRET',
    'ML_CLIENT_ID',
    'ML_CLIENT_SECRET',
    'JWT_EXPIRATION',
    'FRONTEND_URL',
  ],
};

// Optional variables with defaults
const optionalVars = {
  PORT: '3011',
  LOG_LEVEL: 'info',
  NODE_ENV: 'development',
  API_HOST: '0.0.0.0',
  FRONTEND_URL: 'http://localhost:5173',
  REDIS_URL: 'redis://:changeme@localhost:6379',
  JWT_EXPIRATION: '24h',
  DATABASE_NAME: 'projeto-sass',
  API_TIMEOUT: '15000',
  DB_TIMEOUT: '10000',
  MAX_RETRIES: '3',
  RETRY_DELAY: '1000',
  CACHE_TTL: '3600',
  RATE_LIMIT_WINDOW: '900000',
  RATE_LIMIT_MAX_REQUESTS: '100',
};

/**
 * Load and validate environment variables
 */
function validateEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = nodeEnv === 'production' ? '.env.production' : '.env';
  const envPath = path.resolve(envFile);

  console.log(`\n${colors.cyan}${colors.bold}Environment Validation${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════${colors.reset}\n`);

  // Check if .env file exists
  if (!fs.existsSync(envPath) && nodeEnv !== 'production') {
    console.log(`${colors.yellow}⚠ Warning: ${envFile} file not found${colors.reset}`);
    console.log(`  Creating from .env.example...\n`);
    
    const examplePath = path.resolve('.env.example');
    if (fs.existsSync(examplePath)) {
      const content = fs.readFileSync(examplePath, 'utf-8');
      fs.writeFileSync(envPath, content);
      console.log(`${colors.green}✓ Created ${envFile} from template${colors.reset}\n`);
    } else {
      console.log(`${colors.red}✗ Error: .env.example not found${colors.reset}\n`);
      process.exit(1);
    }
  }

  // Validate required variables
  const required = [...requiredVars.common, ...(requiredVars[nodeEnv] || [])];
  const missing = [];
  const warnings = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check optional variables
  for (const [varName, defaultValue] of Object.entries(optionalVars)) {
    if (!process.env[varName]) {
      warnings.push(`${varName} = "${defaultValue}" (using default)`);
      process.env[varName] = defaultValue;
    }
  }

  // Display results
  if (missing.length > 0) {
    console.log(`${colors.red}${colors.bold}✗ Missing Required Variables:${colors.reset}\n`);
    for (const varName of missing) {
      console.log(`  ${colors.red}• ${varName}${colors.reset}`);
    }
    console.log(
      `\n${colors.yellow}Please add these variables to ${envFile} before running the application.${colors.reset}\n`
    );
    return false;
  }

  if (warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠ Using Default Values:${colors.reset}\n`);
    for (const warning of warnings) {
      console.log(`  ${colors.yellow}• ${warning}${colors.reset}`);
    }
    console.log();
  }

  // Validate specific values
  console.log(`${colors.green}${colors.bold}✓ All Required Variables Present${colors.reset}\n`);
  console.log(`${colors.blue}Environment Configuration:${colors.reset}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  PORT: ${process.env.PORT || 3011}`);
  console.log(`  LOG_LEVEL: ${process.env.LOG_LEVEL || 'info'}`);
  console.log(`  MongoDB: ${process.env.MONGODB_URI ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`  Redis: ${process.env.REDIS_URL ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`  Mercado Livre: ${process.env.ML_CLIENT_ID ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`  JWT Secret: ${process.env.JWT_SECRET ? '✓ Configured' : '✗ Not configured'}`);
  console.log();

  return true;
}

/**
 * Main execution
 */
if (require.main === module) {
  try {
    const isValid = validateEnv();
    if (!isValid) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Validation Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

module.exports = { validateEnv };
