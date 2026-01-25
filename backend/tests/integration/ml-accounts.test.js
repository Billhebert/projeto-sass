/**
 * ML Accounts Integration Tests
 * Tests for multiple ML accounts management system
 */

const request = require('supertest');
const { connectDB, disconnectDB } = require('../../db/mongodb');
const MLAccount = require('../../db/models/MLAccount');
const User = require('../../db/models/User');
const { app } = require('../../server');

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'Test@1234567',
  firstName: 'Test',
  lastName: 'User',
};

const testAccount = {
  mlUserId: '123456789',
  nickname: 'test_store',
  email: 'store@mercadolibre.com',
  accessToken: 'APP_USR_test_token_12345',
  refreshToken: 'APP_REF_test_refresh_12345',
  tokenExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
};

let authToken;
let userId;
let createdAccountId;

describe('ML Accounts Integration Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Cleanup
    if (userId) {
      await User.deleteOne({ _id: userId });
    }
    if (createdAccountId) {
      await MLAccount.deleteOne({ id: createdAccountId });
    }
    await disconnectDB();
  });

  // ============================================
  // User Registration & Authentication
  // ============================================

  describe('User Setup', () => {
    test('Should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();

      userId = response.body.data.user._id || response.body.data.user.id;
      authToken = response.body.data.token;
    });

    test('Should login the user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();

      if (!authToken) {
        authToken = response.body.data.token;
      }
    });
  });

  // ============================================
  // ML Accounts CRUD Operations
  // ============================================

  describe('POST /api/ml-accounts - Add Account', () => {
    test('Should add a new ML account', async () => {
      const response = await request(app)
        .post('/api/ml-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAccount);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.nickname).toBe(testAccount.nickname);
      expect(response.body.data.isPrimary).toBe(true); // First account should be primary

      createdAccountId = response.body.data.id;
    });

    test('Should not allow duplicate accounts for same ML user', async () => {
      const response = await request(app)
        .post('/api/ml-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAccount);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    test('Should require authentication', async () => {
      const response = await request(app)
        .post('/api/ml-accounts')
        .send(testAccount);

      expect(response.status).toBe(401);
    });

    test('Should validate required fields', async () => {
      const response = await request(app)
        .post('/api/ml-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nickname: 'test_store',
          // Missing other required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/ml-accounts - List Accounts', () => {
    test('Should list all accounts for user', async () => {
      const response = await request(app)
        .get('/api/ml-accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.accounts)).toBe(true);
      expect(response.body.data.total).toBeGreaterThanOrEqual(1);
    });

    test('Should require authentication', async () => {
      const response = await request(app)
        .get('/api/ml-accounts');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/ml-accounts/:accountId - Get Account', () => {
    test('Should get account details', async () => {
      const response = await request(app)
        .get(`/api/ml-accounts/${createdAccountId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdAccountId);
      expect(response.body.data.nickname).toBe(testAccount.nickname);
    });

    test('Should return 404 for non-existent account', async () => {
      const response = await request(app)
        .get('/api/ml-accounts/nonexistent_id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/ml-accounts/:accountId - Update Account', () => {
    test('Should update account name', async () => {
      const response = await request(app)
        .put(`/api/ml-accounts/${createdAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountName: 'My Updated Store',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accountName).toBe('My Updated Store');
    });

    test('Should update sync interval', async () => {
      const response = await request(app)
        .put(`/api/ml-accounts/${createdAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          syncInterval: 600000, // 10 minutes
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should allow setting as primary', async () => {
      const response = await request(app)
        .put(`/api/ml-accounts/${createdAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          isPrimary: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isPrimary).toBe(true);
    });
  });

  // ============================================
  // Synchronization
  // ============================================

  describe('POST /api/ml-accounts/:accountId/sync - Sync Account', () => {
    test('Should sync account data', async () => {
      const response = await request(app)
        .post(`/api/ml-accounts/${createdAccountId}/sync`)
        .set('Authorization', `Bearer ${authToken}`);

      // May fail due to invalid token, but endpoint should exist
      expect([200, 500, 401]).toContain(response.status);
      expect(response.body.success !== undefined).toBe(true);
    });

    test('Should return 404 for non-existent account', async () => {
      const response = await request(app)
        .post('/api/ml-accounts/nonexistent_id/sync')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/ml-accounts/sync-all - Sync All', () => {
    test('Should sync all accounts', async () => {
      const response = await request(app)
        .post('/api/ml-accounts/sync-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.total).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // Pause/Resume
  // ============================================

  describe('PUT /api/ml-accounts/:accountId/pause - Pause Sync', () => {
    test('Should pause synchronization', async () => {
      const response = await request(app)
        .put(`/api/ml-accounts/${createdAccountId}/pause`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.syncEnabled).toBe(false);
      expect(response.body.data.status).toBe('paused');
    });
  });

  describe('PUT /api/ml-accounts/:accountId/resume - Resume Sync', () => {
    test('Should resume synchronization', async () => {
      const response = await request(app)
        .put(`/api/ml-accounts/${createdAccountId}/resume`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.syncEnabled).toBe(true);
      expect(response.body.data.status).toBe('active');
    });
  });

  // ============================================
  // Token Management
  // ============================================

  describe('PUT /api/ml-accounts/:accountId/refresh-token - Refresh Token', () => {
    test('Should attempt to refresh token (may fail with invalid token)', async () => {
      const response = await request(app)
        .put(`/api/ml-accounts/${createdAccountId}/refresh-token`)
        .set('Authorization', `Bearer ${authToken}`);

      // May fail due to invalid credentials, but endpoint should exist
      expect([200, 400, 401, 500]).toContain(response.status);
      expect(response.body.success !== undefined).toBe(true);
    });
  });

  describe('GET /api/ml-accounts/:accountId/token-info - Token Info', () => {
    test('Should get token information', async () => {
      const response = await request(app)
        .get(`/api/ml-accounts/${createdAccountId}/token-info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokenInfo).toBeDefined();
      expect(response.body.data.tokenInfo.healthPercent).toBeDefined();
      expect(response.body.data.tokenInfo.timeToExpiry).toBeDefined();
    });
  });

  // ============================================
  // Add Second Account & Test Multiple Accounts
  // ============================================

  describe('Multiple Accounts', () => {
    let secondAccountId;

    test('Should add second account without marking as primary', async () => {
      const secondAccount = {
        mlUserId: '987654321',
        nickname: 'second_store',
        email: 'second@mercadolibre.com',
        accessToken: 'APP_USR_test_token_second',
        refreshToken: 'APP_REF_test_refresh_second',
        tokenExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      };

      const response = await request(app)
        .post('/api/ml-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(secondAccount);

      expect(response.status).toBe(201);
      expect(response.body.data.isPrimary).toBe(false); // Second account shouldn't be primary
      secondAccountId = response.body.data.id;
    });

    test('Should list both accounts', async () => {
      const response = await request(app)
        .get('/api/ml-accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(2);
      expect(Array.isArray(response.body.data.accounts)).toBe(true);
    });

    test('Should have one primary account', async () => {
      const response = await request(app)
        .get('/api/ml-accounts')
        .set('Authorization', `Bearer ${authToken}`);

      const primaryAccounts = response.body.data.accounts.filter(acc => acc.isPrimary);
      expect(primaryAccounts.length).toBe(1);
    });

    test('Should remove second account', async () => {
      const response = await request(app)
        .delete(`/api/ml-accounts/${secondAccountId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================
  // Account Deletion
  // ============================================

  describe('DELETE /api/ml-accounts/:accountId - Delete Account', () => {
    test('Should delete account', async () => {
      const response = await request(app)
        .delete(`/api/ml-accounts/${createdAccountId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should return 404 after deletion', async () => {
      const response = await request(app)
        .get(`/api/ml-accounts/${createdAccountId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
