#!/usr/bin/env node

/**
 * Comprehensive API Tests - Auth & Protected Routes
 * Tests authentication, registration, login, and protected endpoints
 */

const http = require('http');
const path = require('path');

// Set test mode before requiring the app
process.env.NODE_ENV = 'test';
process.env.PORT = 3001;
process.env.JWT_SECRET = 'dev_jwt_secret_min_32_characters_long_1234567890';

const { app, server } = require('./backend/server');
const { connectDB, disconnectDB } = require('./backend/db/mongodb');
const logger = require('./backend/logger');

let testsPassed = 0;
let testsFailed = 0;
let authToken = null;
let userId = null;

/**
 * Helper function to make HTTP requests
 */
function makeRequest(method, path, data = null, token = null) {
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

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

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
  console.log('║            COMPREHENSIVE API ENDPOINT TESTS                     ║');
  console.log('║              (Auth + Protected Routes)                          ║');
  console.log('║                 (MongoDB Memory Server)                         ║');
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

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    SECTION 1: AUTHENTICATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Test 1: Health Check
    console.log('Test 1: Health Check');
    console.log('─────────────────────────────────────────────────');
    try {
      const response = await makeRequest('GET', '/health');
      
      if (response.statusCode === 200 && response.body.status === 'ok') {
        console.log('✓ PASSED - Health check successful');
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
      email: 'testuser@example.com',
      password: 'TestPassword123!',
      firstName: 'Paulo',
      lastName: 'Silva'
    };
    
    try {
      const response = await makeRequest('POST', '/api/auth/register', registerData);
      
      if (response.statusCode === 201 && response.body.success) {
        const user = response.body.data?.user;
        const token = response.body.data?.token;
        console.log('✓ PASSED - User registered successfully');
        console.log(`  Email: ${user?.email}`);
        authToken = token;
        userId = user?.id;
        testsPassed++;
      } else if (response.statusCode === 409) {
        console.log('⚠ SKIPPED - User already exists');
      } else {
        console.log(`✗ FAILED - Unexpected status code: ${response.statusCode}`);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Registration error:', error.message);
      testsFailed++;
    }
    console.log();

    // Test 3: Login User
    console.log('Test 3: Login with Valid Credentials');
    console.log('─────────────────────────────────────────────────');
    const loginData = {
      email: 'testuser@example.com',
      password: 'TestPassword123!'
    };
    
    try {
      const response = await makeRequest('POST', '/api/auth/login', loginData);
      
      if (response.statusCode === 200 && response.body.success) {
        const token = response.body.data?.token;
        const user = response.body.data?.user;
        console.log('✓ PASSED - Login successful');
        console.log(`  User ID: ${user?.id}`);
        // Store token for protected route tests
        if (token && !authToken) {
          authToken = token;
          userId = user?.id;
        }
        testsPassed++;
      } else {
        console.log(`✗ FAILED - Login failed with status ${response.statusCode}`);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Login error:', error.message);
      testsFailed++;
    }
    console.log();

    // Test 4: Invalid Login Credentials
    console.log('Test 4: Reject Invalid Credentials');
    console.log('─────────────────────────────────────────────────');
    const invalidLoginData = {
      email: 'testuser@example.com',
      password: 'WrongPassword123!'
    };
    
    try {
      const response = await makeRequest('POST', '/api/auth/login', invalidLoginData);
      
      if (response.statusCode === 401) {
        console.log('✓ PASSED - Correctly rejected invalid credentials');
        testsPassed++;
      } else {
        console.log(`✗ FAILED - Should reject invalid credentials (got ${response.statusCode})`);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Error:', error.message);
      testsFailed++;
    }
    console.log();

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                SECTION 2: PROTECTED ROUTES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Test 5: Access Protected Route Without Token
    console.log('Test 5: Access Protected Route Without Token');
    console.log('─────────────────────────────────────────────────');
    try {
      const response = await makeRequest('GET', '/api/ml-accounts');
      
      if (response.statusCode === 401) {
        console.log('✓ PASSED - Correctly rejected request without token');
        console.log(`  Error: ${response.body.message}`);
        testsPassed++;
      } else {
        console.log(`✗ FAILED - Should reject without token (got ${response.statusCode})`);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Error:', error.message);
      testsFailed++;
    }
    console.log();

    // Test 6: Access Protected Route With Valid Token
    console.log('Test 6: Access Protected Route With Valid Token');
    console.log('─────────────────────────────────────────────────');
    if (authToken) {
      try {
        const response = await makeRequest('GET', '/api/ml-accounts', null, authToken);
        
        if (response.statusCode === 200 && response.body.success) {
          console.log('✓ PASSED - Accessed protected route successfully');
          console.log(`  Accounts: ${response.body.data?.accounts?.length || 0}`);
          testsPassed++;
        } else {
          console.log(`✗ FAILED - Protected route returned status ${response.statusCode}`);
          console.log(`  Response:`, response.body);
          testsFailed++;
        }
      } catch (error) {
        console.log('✗ FAILED - Error:', error.message);
        testsFailed++;
      }
    } else {
      console.log('⚠ SKIPPED - No auth token available');
    }
    console.log();

    // Test 7: Access Protected Route With Invalid Token
    console.log('Test 7: Access Protected Route With Invalid Token');
    console.log('─────────────────────────────────────────────────');
    try {
      const response = await makeRequest('GET', '/api/ml-accounts', null, 'invalid-token-12345');
      
      if (response.statusCode === 403) {
        console.log('✓ PASSED - Correctly rejected invalid token');
        console.log(`  Error: ${response.body.message}`);
        testsPassed++;
      } else {
        console.log(`✗ FAILED - Should reject invalid token (got ${response.statusCode})`);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Error:', error.message);
      testsFailed++;
    }
    console.log();

    // Test 8: 404 on Non-existent Route
    console.log('Test 8: 404 on Non-existent Route');
    console.log('─────────────────────────────────────────────────');
    try {
      const response = await makeRequest('GET', '/api/non-existent-route');
      
      if (response.statusCode === 404) {
        console.log('✓ PASSED - Correctly returned 404 for non-existent route');
        testsPassed++;
      } else {
        console.log(`✗ FAILED - Should return 404 (got ${response.statusCode})`);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Error:', error.message);
      testsFailed++;
    }
    console.log();

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                   SECTION 3: VALIDATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Test 9: Register with Missing Fields
    console.log('Test 9: Register with Missing Email');
    console.log('─────────────────────────────────────────────────');
    const invalidRegisterData = {
      password: 'ValidPassword123!',
      firstName: 'João',
      lastName: 'Silva'
      // Missing email
    };
    
    try {
      const response = await makeRequest('POST', '/api/auth/register', invalidRegisterData);
      
      if (response.statusCode === 400) {
        console.log('✓ PASSED - Correctly rejected missing email');
        console.log(`  Error: ${response.body.error}`);
        testsPassed++;
      } else {
        console.log(`✗ FAILED - Should reject missing email (got ${response.statusCode})`);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Error:', error.message);
      testsFailed++;
    }
    console.log();

    // Test 10: Register with Duplicate Email
    console.log('Test 10: Prevent Duplicate Email Registration');
    console.log('─────────────────────────────────────────────────');
    const duplicateRegisterData = {
      email: 'testuser@example.com', // Already exists
      password: 'AnotherPassword123!',
      firstName: 'João',
      lastName: 'Santos'
    };
    
    try {
      const response = await makeRequest('POST', '/api/auth/register', duplicateRegisterData);
      
      if (response.statusCode === 409) {
        console.log('✓ PASSED - Correctly prevented duplicate email');
        console.log(`  Error: ${response.body.error}`);
        testsPassed++;
      } else {
        console.log(`✗ FAILED - Should prevent duplicate email (got ${response.statusCode})`);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ FAILED - Error:', error.message);
      testsFailed++;
    }
    console.log();

  } catch (error) {
    console.error('Test suite error:', error);
    testsFailed++;
  } finally {
    // Print summary
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      TEST RESULTS SUMMARY                      ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ ✓ Passed: ${String(testsPassed).padEnd(50)} ║`);
    console.log(`║ ✗ Failed: ${String(testsFailed).padEnd(50)} ║`);
    console.log(`║ Total:   ${String(testsPassed + testsFailed).padEnd(50)} ║`);
    if (testsFailed === 0) {
      console.log('║                                                                ║');
      console.log('║              🎉 ALL TESTS PASSED! 🎉                          ║');
    }
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

// Timeout after 60 seconds
setTimeout(() => {
  console.error('Tests timed out after 60 seconds');
  process.exit(1);
}, 60000);
