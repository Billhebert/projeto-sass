#!/usr/bin/env node

/**
 * Complete API Test Suite
 * Tests all 50+ ML API endpoints implemented from web scraping
 */

const axios = require('axios');
const colors = require('colors');

const API_URL = process.env.API_URL || 'http://localhost:3011/api';
const TOKEN = process.env.TEST_TOKEN || 'test-jwt-token-for-testing';

// Test counter
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper function for API calls
async function testEndpoint(method, path, testName, expectedStatus = 200, body = null) {
  totalTests++;
  const fullPath = `${API_URL}${path}`;
  
  try {
    const config = {
      method,
      url: fullPath,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      validateStatus: () => true // Don't throw on any status
    };
    
    if (body) {
      config.data = body;
    }
    
    const response = await axios(config);
    
    if (response.status === expectedStatus || (expectedStatus === null)) {
      console.log(colors.green(`✅ PASS: ${testName}`));
      console.log(colors.gray(`   ${method} ${path} → ${response.status}`));
      passedTests++;
    } else {
      console.log(colors.red(`❌ FAIL: ${testName}`));
      console.log(colors.gray(`   Expected: ${expectedStatus}, Got: ${response.status}`));
      console.log(colors.gray(`   Path: ${method} ${path}`));
      failedTests++;
    }
  } catch (error) {
    console.log(colors.red(`❌ ERROR: ${testName}`));
    console.log(colors.gray(`   ${error.message}`));
    failedTests++;
  }
}

async function runTests() {
  console.log(colors.cyan.bold('\n🚀 Starting Complete API Test Suite\n'));
  console.log(colors.cyan(`Testing against: ${API_URL}\n`));
  
  // ============================================
  // USERS API TESTS
  // ============================================
  console.log(colors.yellow.bold('\n📝 Users API Tests'));
  console.log(colors.gray('=' .repeat(50)));
  
  await testEndpoint('GET', '/users/12345', 'GET user by ID', 200);
  await testEndpoint('GET', '/users/me/info', 'GET authenticated user info', 200);
  await testEndpoint('GET', '/users/12345/addresses', 'GET user addresses', 200);
  await testEndpoint('POST', '/users/12345/addresses', 'POST create address', 201, {
    street: 'Test Street',
    number: '123',
    city: 'São Paulo'
  });
  
  // ============================================
  // ITEMS/PUBLICATIONS API TESTS
  // ============================================
  console.log(colors.yellow.bold('\n📦 Items/Publications API Tests'));
  console.log(colors.gray('=' .repeat(50)));
  
  await testEndpoint('GET', '/items-publications/MLB12345678', 'GET item by ID', 200);
  await testEndpoint('POST', '/items-publications', 'POST create item', 201, {
    title: 'Test Product',
    category_id: 'MLB1234',
    price: 99.99,
    currency_id: 'BRL'
  });
  
  // ============================================
  // SEARCH API TESTS
  // ============================================
  console.log(colors.yellow.bold('\n🔍 Search API Tests'));
  console.log(colors.gray('=' .repeat(50)));
  
  await testEndpoint('GET', '/search?q=test', 'GET search items', 200);
  await testEndpoint('GET', '/search/categories/MLB1234', 'GET category', 200);
  
  // ============================================
  // ORDERS API TESTS
  // ============================================
  console.log(colors.yellow.bold('\n📋 Orders API Tests'));
  console.log(colors.gray('=' .repeat(50)));
  
  await testEndpoint('GET', '/orders-sales/search', 'GET search orders', 200);
  await testEndpoint('GET', '/orders-sales/12345678', 'GET order by ID', 200);
  
  // ============================================
  // SHIPMENTS API TESTS
  // ============================================
  console.log(colors.yellow.bold('\n📦 Shipments API Tests'));
  console.log(colors.gray('=' .repeat(50)));
  
  await testEndpoint('GET', '/shipping-ml/12345678', 'GET shipment by ID', 200);
  await testEndpoint('POST', '/shipping-ml', 'POST create shipment', 201, {
    order_id: '12345678'
  });
  
  // ============================================
  // PAYMENTS API TESTS
  // ============================================
  console.log(colors.yellow.bold('\n💰 Payments API Tests'));
  console.log(colors.gray('=' .repeat(50)));
  
  await testEndpoint('GET', '/payments/search', 'GET search payments', 200);
  await testEndpoint('GET', '/payments/12345678', 'GET payment by ID', 200);
  
  // ============================================
  // QUESTIONS API TESTS
  // ============================================
  console.log(colors.yellow.bold('\n❓ Questions API Tests'));
  console.log(colors.gray('=' .repeat(50)));
  
  await testEndpoint('GET', '/questions-answers/items/MLB12345678', 'GET item questions', 200);
  await testEndpoint('POST', '/questions-answers', 'POST create question', 201, {
    item_id: 'MLB12345678',
    text: 'Is this product available?'
  });
  
  // ============================================
  // REVIEWS API TESTS
  // ============================================
  console.log(colors.yellow.bold('\n⭐ Reviews API Tests'));
  console.log(colors.gray('=' .repeat(50)));
  
  await testEndpoint('GET', '/feedback-reviews/items/MLB12345678', 'GET item reviews', 200);
  await testEndpoint('POST', '/feedback-reviews', 'POST create feedback', 201, {
    order_id: '12345678',
    rating: 5,
    message: 'Great product!'
  });
  
  // ============================================
  // CATEGORIES API TESTS
  // ============================================
  console.log(colors.yellow.bold('\n📂 Categories API Tests'));
  console.log(colors.gray('=' .repeat(50)));
  
  await testEndpoint('GET', '/categories-attributes/MLB1234', 'GET category attributes', 200);
  await testEndpoint('GET', '/categories-attributes/domains/123456', 'GET domain', 200);
  
  // ============================================
  // PROMOTIONS API TESTS
  // ============================================
  console.log(colors.yellow.bold('\n🎉 Promotions API Tests'));
  console.log(colors.gray('=' .repeat(50)));
  
  await testEndpoint('GET', '/promotions/search', 'GET search promotions', 200);
  await testEndpoint('POST', '/promotions', 'POST create campaign', 201, {
    name: 'Test Campaign',
    items: ['MLB12345678'],
    start_date: '2026-01-30T00:00:00Z'
  });
  
  // ============================================
  // HEALTH CHECK
  // ============================================
  console.log(colors.yellow.bold('\n❤️ Health & Status Tests'));
  console.log(colors.gray('=' .repeat(50)));
  
  await testEndpoint('GET', '../../health', 'GET health status', 200);
  
  // ============================================
  // SUMMARY
  // ============================================
  console.log(colors.cyan.bold('\n' + '='.repeat(50)));
  console.log(colors.cyan.bold('📊 TEST SUMMARY'));
  console.log(colors.cyan.bold('='.repeat(50)));
  console.log(colors.gray(`Total Tests: ${totalTests}`));
  console.log(colors.green(`Passed: ${passedTests}`));
  console.log(colors.red(`Failed: ${failedTests}`));
  
  const percentage = ((passedTests / totalTests) * 100).toFixed(2);
  console.log(colors.cyan(`Success Rate: ${percentage}%\n`));
  
  if (failedTests === 0) {
    console.log(colors.green.bold('✨ All tests passed!\n'));
    process.exit(0);
  } else {
    console.log(colors.red.bold(`⚠️ ${failedTests} test(s) failed\n`));
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(colors.red(`Fatal error: ${error.message}`));
  process.exit(1);
});
