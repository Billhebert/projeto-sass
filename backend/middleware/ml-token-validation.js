/**
 * Mercado Livre Token Validation Middleware
 * 
 * Checks if ML account token is expired or about to expire
 * Automatically attempts refresh if token is about to expire
 * 
 * Usage in routes:
 * router.post('/:accountId/sync', validateMLToken, syncHandler);
 */

const logger = require('../logger');
const MLAccount = require('../db/models/MLAccount');
const MLTokenManager = require('../utils/ml-token-manager');

/**
 * Middleware to validate ML account token before operations
 * 
 * Checks:
 * 1. Token exists and is not critically expired
 * 2. If about to expire, attempt automatic refresh
 * 3. Return error if token is invalid/expired and can't refresh
 * 
 * Usage:
 * router.post('/:accountId/operation', 
 *   authenticateToken,           // Check user JWT
 *   validateMLToken('accountId'), // Check ML token
 *   handler
 * );
 */
function validateMLToken(accountIdParam = 'accountId') {
  return async (req, res, next) => {
    try {
      const accountId = req.params[accountIdParam];
      const userId = req.user.userId;

      // Find the account
      const account = await MLAccount.findOne({
        id: accountId,
        userId: userId,
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found',
        });
      }

      // Check if token is critically expired (past expiry date)
      if (MLTokenManager.isTokenCriticallyExpired(account.tokenExpiresAt)) {
        logger.warn({
          action: 'ML_TOKEN_CRITICALLY_EXPIRED',
          accountId: account.id,
          mlUserId: account.mlUserId,
          userId: userId,
          tokenExpiresAt: account.tokenExpiresAt,
        });

        return res.status(401).json({
          success: false,
          message: 'Account token has expired. Please reconnect your account.',
          code: 'TOKEN_EXPIRED',
          accountId: accountId,
          tokenExpiresAt: account.tokenExpiresAt,
          timeToExpiry: MLTokenManager.getTimeToExpiry(account.tokenExpiresAt),
        });
      }

      // Check if token needs refresh (within 5 minutes of expiry)
      if (MLTokenManager.isTokenExpired(account.tokenExpiresAt)) {
        logger.info({
          action: 'ML_TOKEN_NEEDS_REFRESH',
          accountId: account.id,
          mlUserId: account.mlUserId,
          timeToExpiry: MLTokenManager.getTimeToExpiry(account.tokenExpiresAt),
        });

        // If account has refreshToken, attempt automatic refresh
        if (account.refreshToken) {
          try {
            // Use account's own OAuth credentials first, then fall back to env vars
            // This allows each account to use their own ML app for token refresh
            const clientId = account.clientId || process.env.ML_APP_CLIENT_ID || process.env.ML_CLIENT_ID;
            const clientSecret = account.clientSecret || process.env.ML_APP_CLIENT_SECRET || process.env.ML_CLIENT_SECRET;
            
            if (!clientId || !clientSecret) {
              logger.warn({
                action: 'ML_TOKEN_REFRESH_NO_CREDENTIALS',
                accountId: account.id,
                hasAccountCredentials: !!(account.clientId && account.clientSecret),
                hasEnvCredentials: !!(process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET),
              });
              
              return res.status(401).json({
                success: false,
                message: 'No OAuth credentials available for automatic token refresh. Please reconnect your account.',
                code: 'NO_OAUTH_CREDENTIALS',
                accountId: accountId,
              });
            }
            
            const result = await MLTokenManager.refreshToken(
              account.refreshToken,
              clientId,
              clientSecret
            );

            if (result.success) {
              // Update account with new tokens
              await account.refreshedTokens(
                result.accessToken,
                result.refreshToken,
                result.expiresIn
              );

              logger.info({
                action: 'ML_TOKEN_AUTO_REFRESHED',
                accountId: account.id,
                mlUserId: account.mlUserId,
                expiresIn: result.expiresIn,
              });

              // Continue with operation using new token
              req.mlAccount = account;
              return next();
            } else {
              // Refresh failed, token is too old
              logger.error({
                action: 'ML_TOKEN_AUTO_REFRESH_FAILED',
                accountId: account.id,
                error: result.error,
              });

              return res.status(401).json({
                success: false,
                message: 'Account token expired and automatic refresh failed. Please reconnect your account.',
                code: 'TOKEN_REFRESH_FAILED',
                accountId: accountId,
                error: result.error,
              });
            }
          } catch (error) {
            logger.error({
              action: 'ML_TOKEN_REFRESH_ERROR',
              accountId: account.id,
              error: error.message,
            });

            return res.status(401).json({
              success: false,
              message: 'Failed to refresh token. Please try again or reconnect your account.',
              code: 'TOKEN_REFRESH_ERROR',
              error: error.message,
            });
          }
        } else {
          // No refresh token available, token will expire soon
          logger.warn({
            action: 'ML_TOKEN_EXPIRING_NO_REFRESH',
            accountId: account.id,
            mlUserId: account.mlUserId,
            timeToExpiry: MLTokenManager.getTimeToExpiry(account.tokenExpiresAt),
          });

          return res.status(401).json({
            success: false,
            message: 'Account token is about to expire. Automatic refresh not available. Please reconnect your account.',
            code: 'TOKEN_ABOUT_TO_EXPIRE_NO_AUTO_REFRESH',
            accountId: accountId,
            timeToExpiry: MLTokenManager.getTimeToExpiry(account.tokenExpiresAt),
            suggestion: 'Reconnect account using OAuth to enable automatic refresh',
          });
        }
      }

      // Token is valid, add account to request for use in handler
      req.mlAccount = account;
      next();
    } catch (error) {
      logger.error({
        action: 'ML_TOKEN_VALIDATION_ERROR',
        error: error.message,
        accountId: req.params.accountId,
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to validate token',
        error: error.message,
      });
    }
  };
}

module.exports = {
  validateMLToken,
};
