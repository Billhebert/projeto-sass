#!/usr/bin/env node

/**
 * Test Script - API Endpoints with MongoDB Memory Server
 * Tests /api/auth/register and /api/auth/login endpoints
 */

const http = require('http');
const path = require('path');

// Set test mode before requiring the app
process.env.NODE_ENV = 'test';
process.env.PORT = 3001; // Use different port for testing

const { app, server } = require('./backend/server');
const { connectDB, disconnectDB } = require('./backend/db/mongodb');
const logger = require('./backend/logger');

let testsPassed = 0;
let testsFailed = 0;

/**
 * Helper function to make HTTP requests
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Test runner
 */
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                   TESTING API ENDPOINTS                        ║');
  console.log('║                 (MongoDB Memory Server)                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Connect to database
    console.log('📦 Connecting to MongoDB Memory Server...');
    await connectDB();
    console.log('✓ Database connected\n');

    // Start HTTP server
    console.log('🚀 Starting Express server on port 3001...');
    await new Promise((resolve) => {
      server.listen(3001, () => {
        console.log('✓ Server started\n');
        resolve();
      });
    });

    // Test 1: Health Check
    console.log('Test 1: Health Check');
    console.log('─────────────────────────────────────────────────');
    try {
      const response = await makeRequest('GET', '/health');
      
      if (response.statusCode === 200 && response.body.status === 'ok') {
        console.log('✓ PASSED - Health check successful');
        console.log(`  Status: ${response.body.status}`);
        console.log(`  MongoDB: ${response.body.mongodb.connected ? 'Connected' : 'Disconnected'}`);
        testsPassed++;
      } else {
        console.log('✗ FAILED - Health check returned unexpected status');
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Health check error:', error.message);
      testsFailed++;
    }
    console.log();

    // Test 2: Register User
    console.log('Test 2: Register New User');
    console.log('─────────────────────────────────────────────────');
    const registerData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Paulo',
      lastName: 'Silva'
    };
    
    try {
      const response = await makeRequest('POST', '/api/auth/register', registerData);
      
      if (response.statusCode === 201 && response.body.success) {
        console.log('✓ PASSED - User registered successfully');
        const user = response.body.data?.user || response.body.user;
        const token = response.body.data?.token || response.body.token;
        console.log(`  Email: ${user?.email}`);
        console.log(`  Token: ${token ? '✓ Provided' : '✗ Missing'}`);
        testsPassed++;
      } else if (response.statusCode === 409) {
        console.log('⚠ SKIPPED - User already exists (expected if run multiple times)');
      } else {
        console.log(`✗ FAILED - Unexpected status code: ${response.statusCode}`);
        console.log('  Response:', JSON.stringify(response.body, null, 2));
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Registration error:', error.message);
      testsFailed++;
    }
    console.log();

    // Test 3: Register with Invalid Data
    console.log('Test 3: Register with Invalid Password (too short)');
    console.log('─────────────────────────────────────────────────');
    const invalidRegisterData = {
      email: 'invalid@example.com',
      password: 'short', // Too short
      firstName: 'João',
      lastName: 'Silva'
    };
    
    try {
      const response = await makeRequest('POST', '/api/auth/register', invalidRegisterData);
      
      if (response.statusCode === 400) {
        console.log('✓ PASSED - Correctly rejected invalid password');
        console.log(`  Error: ${response.body.error}`);
        testsPassed++;
      } else {
        console.log(`✗ FAILED - Should reject invalid password (got ${response.statusCode})`);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Validation error:', error.message);
      testsFailed++;
    }
    console.log();

    // Test 4: Login with Valid Credentials
    console.log('Test 4: Login with Valid Credentials');
    console.log('─────────────────────────────────────────────────');
    const loginData = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };
    
    try {
      const response = await makeRequest('POST', '/api/auth/login', loginData);
      
      if (response.statusCode === 200 && response.body.success) {
        console.log('✓ PASSED - Login successful');
        const user = response.body.data?.user || response.body.user;
        const token = response.body.data?.token || response.body.token;
        console.log(`  User ID: ${user?.id}`);
        console.log(`  Token: ${token ? '✓ Provided' : '✗ Missing'}`);
        testsPassed++;
      } else {
        console.log(`✗ FAILED - Login failed with status ${response.statusCode}`);
        console.log('  Response:', JSON.stringify(response.body, null, 2));
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Login error:', error.message);
      testsFailed++;
    }
    console.log();

    // Test 5: Login with Invalid Credentials
    console.log('Test 5: Login with Invalid Credentials');
    console.log('─────────────────────────────────────────────────');
    const invalidLoginData = {
      email: 'test@example.com',
      password: 'WrongPassword123!'
    };
    
    try {
      const response = await makeRequest('POST', '/api/auth/login', invalidLoginData);
      
      if (response.statusCode === 401) {
        console.log('✓ PASSED - Correctly rejected invalid credentials');
        console.log(`  Error: ${response.body.error}`);
        testsPassed++;
      } else {
        console.log(`✗ FAILED - Should reject invalid credentials (got ${response.statusCode})`);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Login validation error:', error.message);
      testsFailed++;
    }
    console.log();

    // Test 6: Duplicate Registration
    console.log('Test 6: Prevent Duplicate Email Registration');
    console.log('─────────────────────────────────────────────────');
    const duplicateData = {
      email: 'test@example.com', // Already registered
      password: 'AnotherPassword123!',
      firstName: 'João',
      lastName: 'Santos'
    };
    
    try {
      const response = await makeRequest('POST', '/api/auth/register', duplicateData);
      
      if (response.statusCode === 409) {
        console.log('✓ PASSED - Correctly prevented duplicate email');
        console.log(`  Error: ${response.body.error}`);
        testsPassed++;
      } else {
        console.log(`✗ FAILED - Should prevent duplicate email (got ${response.statusCode})`);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Duplicate check error:', error.message);
      testsFailed++;
    }
    console.log();

  } catch (error) {
    console.error('Test suite error:', error);
    testsFailed++;
  } finally {
    // Cleanup
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      TEST RESULTS SUMMARY                      ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ ✓ Passed: ${String(testsPassed).padEnd(50)} ║`);
    console.log(`║ ✗ Failed: ${String(testsFailed).padEnd(50)} ║`);
    console.log(`║ Total:   ${String(testsPassed + testsFailed).padEnd(50)} ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Close server and database
    console.log('🛑 Cleaning up...');
    server.close(() => {
      logger.info('Server closed');
    });

    try {
      await disconnectDB();
    } catch (error) {
      logger.error('Error disconnecting:', error);
    }

    // Exit with appropriate code
    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error('Tests timed out after 30 seconds');
  process.exit(1);
}, 30000);
