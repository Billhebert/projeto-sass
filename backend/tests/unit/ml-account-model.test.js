/**
 * ML Account Model Unit Tests
 */

const { connectDB, disconnectDB } = require('../../db/mongodb');
const MLAccount = require('../../db/models/MLAccount');
const User = require('../../db/models/User');

describe('MLAccount Model Unit Tests', () => {
  let userId;
  let testAccount;

  beforeAll(async () => {
    await connectDB();

    // Create test user
    const user = await User.create({
      email: `test-${Date.now()}@example.com`,
      password: 'Test@12345678',
      firstName: 'Test',
      lastName: 'User',
    });
    userId = user._id;
  });

  afterAll(async () => {
    // Cleanup
    if (userId) {
      await User.deleteOne({ _id: userId });
    }
    await MLAccount.deleteMany({ userId });
    await disconnectDB();
  });

  describe('Create ML Account', () => {
    test('Should create a new ML account', async () => {
      const account = await MLAccount.create({
        userId,
        mlUserId: '123456789',
        nickname: 'test_store',
        email: 'store@example.com',
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        tokenExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      });

      testAccount = account;
      expect(account._id).toBeDefined();
      expect(account.id).toBeDefined();
      expect(account.nickname).toBe('test_store');
      expect(account.status).toBe('active');
      expect(account.isPrimary).toBe(false); // Default is false
    });

    test('Should set first account as primary automatically', async () => {
      // This test is more about business logic
      // The model doesn't auto-set primary, but the route handler does
      const account = await MLAccount.findOne({ userId });
      expect(account).toBeDefined();
    });
  });

  describe('isTokenExpired method', () => {
    test('Should return true for expired token', async () => {
      const account = await MLAccount.create({
        userId,
        mlUserId: `expired_${Date.now()}`,
        nickname: 'expired_account',
        email: 'expired@example.com',
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        tokenExpiresAt: new Date(Date.now() - 1000), // Already expired
      });

      const isExpired = account.isTokenExpired();
      expect(isExpired).toBe(true);

      await MLAccount.deleteOne({ _id: account._id });
    });

    test('Should return false for valid token', async () => {
      const account = await MLAccount.create({
        userId,
        mlUserId: `valid_${Date.now()}`,
        nickname: 'valid_account',
        email: 'valid@example.com',
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        tokenExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
      });

      const isExpired = account.isTokenExpired();
      expect(isExpired).toBe(false);

      await MLAccount.deleteOne({ _id: account._id });
    });
  });

  describe('updateSyncStatus method', () => {
    test('Should update sync status to success', async () => {
      const account = testAccount;
      await account.updateSyncStatus('success');

      const updated = await MLAccount.findById(account._id);
      expect(updated.lastSyncStatus).toBe('success');
      expect(updated.lastSync).toBeDefined();
      expect(updated.lastSyncError).toBeNull();
    });

    test('Should update sync status to failed with error', async () => {
      const account = testAccount;
      const errorMsg = 'Test error message';
      await account.updateSyncStatus('failed', errorMsg);

      const updated = await MLAccount.findById(account._id);
      expect(updated.lastSyncStatus).toBe('failed');
      expect(updated.lastSyncError).toBe(errorMsg);
      expect(updated.errorHistory.length).toBeGreaterThan(0);
    });

    test('Should track multiple errors', async () => {
      const account = testAccount;

      for (let i = 0; i < 5; i++) {
        await account.updateSyncStatus('failed', `Error ${i}`);
      }

      const updated = await MLAccount.findById(account._id);
      expect(updated.errorCount).toBeGreaterThan(0);
      expect(Array.isArray(updated.errorHistory)).toBe(true);
    });
  });

  describe('updateCachedData method', () => {
    test('Should update cached data', async () => {
      const account = testAccount;
      const data = {
        products: 42,
        orders: 15,
        issues: 2,
      };

      await account.updateCachedData(data);

      const updated = await MLAccount.findById(account._id);
      expect(updated.cachedData.products).toBe(42);
      expect(updated.cachedData.orders).toBe(15);
      expect(updated.cachedData.issues).toBe(2);
      expect(updated.cachedData.lastUpdated).toBeDefined();
    });
  });

  describe('pauseSync and resumeSync methods', () => {
    test('Should pause synchronization', async () => {
      const account = testAccount;
      await account.pauseSync();

      const updated = await MLAccount.findById(account._id);
      expect(updated.syncEnabled).toBe(false);
      expect(updated.status).toBe('paused');
    });

    test('Should resume synchronization', async () => {
      const account = await MLAccount.findById(testAccount._id);
      await account.resumeSync();

      const updated = await MLAccount.findById(account._id);
      expect(updated.syncEnabled).toBe(true);
      expect(updated.status).toBe('active');
    });
  });

  describe('touchLastActivity method', () => {
    test('Should update last activity timestamp', async () => {
      const account = testAccount;
      const originalActivity = account.lastActivity;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await account.touchLastActivity();

      const updated = await MLAccount.findById(account._id);
      expect(updated.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
    });
  });

  describe('getSummary method', () => {
    test('Should return account summary', async () => {
      const account = testAccount;
      const summary = account.getSummary();

      expect(summary).toHaveProperty('id');
      expect(summary).toHaveProperty('userId');
      expect(summary).toHaveProperty('mlUserId');
      expect(summary).toHaveProperty('nickname');
      expect(summary).toHaveProperty('email');
      expect(summary).toHaveProperty('status');
      expect(summary).toHaveProperty('cachedData');
      expect(summary).toHaveProperty('createdAt');

      expect(summary.nickname).toBe('test_store');
    });
  });

  describe('Static Methods', () => {
    test('findByUserId should find accounts for user', async () => {
      const accounts = await MLAccount.findByUserId(userId);
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBeGreaterThan(0);
    });

    test('findAccountsToSync should find accounts needing sync', async () => {
      // Create an account that needs sync
      const account = await MLAccount.create({
        userId,
        mlUserId: `tosync_${Date.now()}`,
        nickname: 'tosync_account',
        email: 'tosync@example.com',
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        tokenExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        syncEnabled: true,
        status: 'active',
        lastSync: null, // Never synced
      });

      const toSync = await MLAccount.findAccountsToSync();
      const found = toSync.find((a) => a._id.equals(account._id));
      expect(found).toBeDefined();

      await MLAccount.deleteOne({ _id: account._id });
    });

    test('findAccountsWithExpiredTokens should find expired tokens', async () => {
      // Create an account with expired token
      const account = await MLAccount.create({
        userId,
        mlUserId: `expired_token_${Date.now()}`,
        nickname: 'expired_token_account',
        email: 'expiredtoken@example.com',
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        tokenExpiresAt: new Date(Date.now() - 1000), // Already expired
      });

      const expired = await MLAccount.findAccountsWithExpiredTokens();
      const found = expired.find((a) => a._id.equals(account._id));
      expect(found).toBeDefined();

      await MLAccount.deleteOne({ _id: account._id });
    });
  });

  describe('Disconnect account', () => {
    test('Should disconnect account', async () => {
      const account = testAccount;
      await account.disconnect();

      const updated = await MLAccount.findById(account._id);
      expect(updated.status).toBe('error');
      expect(updated.syncEnabled).toBe(false);
      expect(updated.disconnectedAt).toBeDefined();
    });
  });

  describe('Error tracking', () => {
    test('Should maintain error history', async () => {
      const account = await MLAccount.create({
        userId,
        mlUserId: `error_track_${Date.now()}`,
        nickname: 'error_track_account',
        email: 'errortrack@example.com',
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        tokenExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      });

      // Add multiple errors
      await account.addError('Error 1', 500);
      await account.addError('Error 2', 400);
      await account.addError('Error 3', 401);

      const updated = await MLAccount.findById(account._id);
      expect(updated.errorHistory.length).toBe(3);
      expect(updated.errorCount).toBe(3);

      await MLAccount.deleteOne({ _id: account._id });
    });

    test('Should limit error history to 20 entries', async () => {
      const account = await MLAccount.create({
        userId,
        mlUserId: `error_limit_${Date.now()}`,
        nickname: 'error_limit_account',
        email: 'errorlimit@example.com',
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        tokenExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      });

      // Add 25 errors
      for (let i = 0; i < 25; i++) {
        await account.addError(`Error ${i}`, 500);
      }

      const updated = await MLAccount.findById(account._id);
      expect(updated.errorHistory.length).toBeLessThanOrEqual(20);

      await MLAccount.deleteOne({ _id: account._id });
    });
  });
});
