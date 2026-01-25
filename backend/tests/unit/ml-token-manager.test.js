/**
 * ML Token Manager Unit Tests
 */

const MLTokenManager = require('../../utils/ml-token-manager');

describe('MLTokenManager Unit Tests', () => {
  describe('isTokenExpired', () => {
    test('Should return true for expired token', () => {
      const expiredTime = new Date(Date.now() - 1000); // 1 second ago
      const result = MLTokenManager.isTokenExpired(expiredTime, 0);
      expect(result).toBe(true);
    });

    test('Should return true for token expiring soon with buffer', () => {
      const expiringTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
      const buffer = 5 * 60 * 1000; // 5 minutes buffer
      const result = MLTokenManager.isTokenExpired(expiringTime, buffer);
      expect(result).toBe(true);
    });

    test('Should return false for token with plenty of time left', () => {
      const validTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      const result = MLTokenManager.isTokenExpired(validTime);
      expect(result).toBe(false);
    });
  });

  describe('isTokenCriticallyExpired', () => {
    test('Should return true for critically expired token', () => {
      const expiredTime = new Date(Date.now() - 1000);
      const result = MLTokenManager.isTokenCriticallyExpired(expiredTime);
      expect(result).toBe(true);
    });

    test('Should return false for valid token', () => {
      const validTime = new Date(Date.now() + 1 * 60 * 60 * 1000);
      const result = MLTokenManager.isTokenCriticallyExpired(validTime);
      expect(result).toBe(false);
    });
  });

  describe('getTimeToExpiry', () => {
    test('Should return positive number for future expiry', () => {
      const futureTime = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
      const result = MLTokenManager.getTimeToExpiry(futureTime);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(3600); // 1 hour in seconds
    });

    test('Should return negative number for past expiry', () => {
      const pastTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      const result = MLTokenManager.getTimeToExpiry(pastTime);
      expect(result).toBeLessThan(0);
    });
  });

  describe('getTokenHealthPercent', () => {
    test('Should return 100 for freshly refreshed token', () => {
      const now = new Date();
      const expiryTime = new Date(now.getTime() + 1 * 60 * 60 * 1000);
      const result = MLTokenManager.getTokenHealthPercent(expiryTime, now);
      expect(result).toBeGreaterThan(90); // Should be ~100, allowing for execution time
    });

    test('Should return 0 for about-to-expire token', () => {
      const refreshedAt = new Date(Date.now() - 59 * 60 * 1000); // 59 min ago
      const expiryTime = new Date(Date.now() + 1 * 60 * 1000); // 1 min from now
      const result = MLTokenManager.getTokenHealthPercent(expiryTime, refreshedAt);
      expect(result).toBeLessThanOrEqual(10);
    });

    test('Should return middle value for mid-life token', () => {
      const refreshedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      const expiryTime = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
      const result = MLTokenManager.getTokenHealthPercent(expiryTime, refreshedAt);
      expect(result).toBeGreaterThan(40);
      expect(result).toBeLessThan(60);
    });

    test('Should return 0 when refreshedAt is not provided', () => {
      const expiryTime = new Date(Date.now() + 1 * 60 * 60 * 1000);
      const result = MLTokenManager.getTokenHealthPercent(expiryTime, null);
      expect(result).toBe(0);
    });
  });

  describe('getTokenInfo', () => {
    test('Should return token information object with all required fields', () => {
      const mockAccount = {
        id: 'test_account_id',
        mlUserId: '123456',
        tokenExpiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        lastTokenRefresh: new Date(),
      };

      const result = MLTokenManager.getTokenInfo(mockAccount);

      expect(result).toHaveProperty('accountId');
      expect(result).toHaveProperty('mlUserId');
      expect(result).toHaveProperty('tokenExpiry');
      expect(result).toHaveProperty('timeToExpiry');
      expect(result).toHaveProperty('healthPercent');
      expect(result).toHaveProperty('isExpired');
      expect(result).toHaveProperty('needsRefresh');

      expect(result.accountId).toBe('test_account_id');
      expect(result.isExpired).toBe(false);
      expect(result.needsRefresh).toBe(false);
    });

    test('Should detect expired token in token info', () => {
      const mockAccount = {
        id: 'test_account_id',
        mlUserId: '123456',
        tokenExpiresAt: new Date(Date.now() - 1000), // Already expired
        lastTokenRefresh: new Date(Date.now() - 1 * 60 * 60 * 1000),
      };

      const result = MLTokenManager.getTokenInfo(mockAccount);

      expect(result.isExpired).toBe(true);
      expect(result.needsRefresh).toBe(true);
    });
  });

  describe('validateToken', () => {
    test('Should handle validation error gracefully', async () => {
      // This test assumes invalid token will fail
      const result = await MLTokenManager.validateToken('invalid_token_12345');
      expect(result).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    test('Should handle missing parameters in refreshToken', async () => {
      const result = await MLTokenManager.refreshToken(null, null, null);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('Should return error for invalid refresh token', async () => {
      // Using invalid credentials will fail
      const result = await MLTokenManager.refreshToken(
        'invalid_refresh_token',
        'invalid_client_id',
        'invalid_client_secret'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
