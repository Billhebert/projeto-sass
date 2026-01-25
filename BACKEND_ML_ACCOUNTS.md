# Backend Implementation - Multiple ML Accounts with Persistent Storage

## Overview

This document describes the complete backend system for managing multiple Mercado Livre accounts with persistent storage in MongoDB. The system includes:

- **Persistent Account Storage**: MongoDB models for storing ML account credentials and metadata
- **RESTful API Endpoints**: Full CRUD operations for account management
- **Background Jobs**: Automated synchronization and token refresh
- **Token Management**: Secure OAuth token handling and renewal
- **Comprehensive Tests**: Integration and unit tests for all functionality

---

## Architecture

### Database Models

#### MLAccount Model (`backend/db/models/MLAccount.js`)

The core model that represents a Mercado Livre account connection.

**Key Fields:**
```javascript
{
  id: String,                    // Unique identifier
  userId: ObjectId,              // Link to User (1:N relationship)
  
  // ML Identifiers
  mlUserId: String,              // Mercado Livre user ID
  nickname: String,              // Store nickname
  email: String,                 // Associated email
  
  // OAuth Tokens
  accessToken: String,           // JWT access token
  refreshToken: String,          // Refresh token for renewal
  tokenExpiresAt: Date,          // Token expiration time
  
  // Account Status
  status: String,                // active, paused, error, expired
  syncEnabled: Boolean,          // Whether auto-sync is enabled
  
  // Synchronization
  lastSync: Date,                // Last successful sync time
  nextSync: Date,                // Next scheduled sync time
  lastSyncStatus: String,        // success, failed, in_progress
  lastSyncError: String,         // Error message if last sync failed
  
  // Cached Data
  cachedData: {
    products: Number,            // Product count
    orders: Number,              // Order count
    issues: Number,              // Open issues count
    lastUpdated: Date,
  },
  
  // Configuration
  accountName: String,           // User-friendly account name
  isPrimary: Boolean,            // Is this the primary account
  syncInterval: Number,          // Sync frequency in ms
  
  // Error Tracking
  errorCount: Number,            // Total error count
  errorHistory: Array,           // Last 20 errors
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  disconnectedAt: Date,
}
```

**Methods:**

- `isTokenExpired()` - Check if token needs refresh
- `updateSyncStatus(status, error)` - Update synchronization status
- `updateCachedData(data)` - Update cached ML data
- `pauseSync()` - Pause automatic synchronization
- `resumeSync()` - Resume synchronization
- `disconnect()` - Disconnect account
- `getSummary()` - Get account summary for API response

**Static Methods:**

- `findByUserId(userId)` - Find all accounts for a user
- `findPrimaryAccount(userId)` - Get primary account
- `findAccountsToSync()` - Find accounts needing synchronization
- `findAccountsWithExpiredTokens()` - Find accounts needing token refresh

---

## API Endpoints

### Base URL
```
POST /api/ml-accounts
GET  /api/ml-accounts
GET  /api/ml-accounts/:accountId
PUT  /api/ml-accounts/:accountId
DELETE /api/ml-accounts/:accountId
POST /api/ml-accounts/:accountId/sync
POST /api/ml-accounts/sync-all
PUT  /api/ml-accounts/:accountId/pause
PUT  /api/ml-accounts/:accountId/resume
PUT  /api/ml-accounts/:accountId/refresh-token
GET  /api/ml-accounts/:accountId/token-info
```

### 1. Add Account
**POST /api/ml-accounts**

Add a new Mercado Livre account to user's portfolio.

**Request:**
```json
{
  "mlUserId": "123456789",
  "nickname": "my_store",
  "email": "store@mercadolibre.com",
  "accessToken": "APP_USR_...",
  "refreshToken": "APP_REF_...",
  "tokenExpiresAt": "2024-01-25T18:00:00Z",
  "accountName": "My Store",           // Optional
  "accountType": "store"               // Optional: store, individual, business
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Account added successfully",
  "data": {
    "id": "ml_1234567890_abc123",
    "mlUserId": "123456789",
    "nickname": "my_store",
    "status": "active",
    "isPrimary": true,
    ...
  }
}
```

**Error Cases:**
- `400`: Missing required fields
- `409`: Account already connected
- `401`: Unauthorized

---

### 2. List Accounts
**GET /api/ml-accounts**

Get all accounts for the authenticated user.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "ml_1234567890_abc123",
        "nickname": "my_store",
        "status": "active",
        "isPrimary": true,
        "syncEnabled": true,
        "lastSync": "2024-01-25T15:00:00Z",
        "cachedData": {
          "products": 42,
          "orders": 15,
          "issues": 2
        }
      },
      ...
    ],
    "total": 2
  }
}
```

---

### 3. Get Account Details
**GET /api/ml-accounts/:accountId**

Get detailed information about a specific account.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "ml_1234567890_abc123",
    "nickname": "my_store",
    "email": "store@mercadolibre.com",
    "status": "active",
    "isPrimary": true,
    "syncEnabled": true,
    "lastSync": "2024-01-25T15:00:00Z",
    "nextSync": "2024-01-25T15:05:00Z",
    "tokenExpiresAt": "2024-01-25T18:00:00Z",
    "cachedData": {
      "products": 42,
      "orders": 15,
      "issues": 2,
      "lastUpdated": "2024-01-25T15:00:00Z"
    },
    "errorCount": 0,
    "createdAt": "2024-01-20T10:00:00Z"
  }
}
```

---

### 4. Update Account
**PUT /api/ml-accounts/:accountId**

Update account settings.

**Request:**
```json
{
  "accountName": "Updated Store Name",
  "isPrimary": true,
  "syncInterval": 600000,
  "notificationsEnabled": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Account updated successfully",
  "data": { ... }
}
```

---

### 5. Delete Account
**DELETE /api/ml-accounts/:accountId**

Remove an account from the system.

**Response (200):**
```json
{
  "success": true,
  "message": "Account removed successfully"
}
```

---

### 6. Sync Single Account
**POST /api/ml-accounts/:accountId/sync**

Trigger synchronization for a specific account.

**Response (200):**
```json
{
  "success": true,
  "message": "Account synchronized successfully",
  "data": {
    "accountId": "ml_1234567890_abc123",
    "syncedAt": "2024-01-25T15:05:00Z",
    "data": {
      "products": 42,
      "orders": 15,
      "issues": 2
    }
  }
}
```

---

### 7. Sync All Accounts
**POST /api/ml-accounts/sync-all**

Trigger synchronization for all user accounts.

**Response (200):**
```json
{
  "success": true,
  "message": "Synchronized 2/2 accounts",
  "data": {
    "results": [
      {
        "accountId": "ml_1234567890_abc123",
        "success": true,
        "data": { ... }
      },
      {
        "accountId": "ml_0987654321_xyz789",
        "success": true,
        "data": { ... }
      }
    ],
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0
    }
  }
}
```

---

### 8. Pause Synchronization
**PUT /api/ml-accounts/:accountId/pause**

Pause automatic synchronization for an account.

**Response (200):**
```json
{
  "success": true,
  "message": "Account synchronization paused",
  "data": {
    "id": "ml_1234567890_abc123",
    "status": "paused",
    "syncEnabled": false
  }
}
```

---

### 9. Resume Synchronization
**PUT /api/ml-accounts/:accountId/resume**

Resume automatic synchronization for an account.

**Response (200):**
```json
{
  "success": true,
  "message": "Account synchronization resumed",
  "data": {
    "id": "ml_1234567890_abc123",
    "status": "active",
    "syncEnabled": true
  }
}
```

---

### 10. Refresh Token
**PUT /api/ml-accounts/:accountId/refresh-token**

Manually refresh the OAuth token for an account.

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accountId": "ml_1234567890_abc123",
    "status": "active",
    "tokenExpiresAt": "2024-01-25T22:00:00Z",
    "tokenInfo": {
      "timeToExpiry": 18000,
      "healthPercent": 100,
      "isExpired": false,
      "needsRefresh": false
    }
  }
}
```

---

### 11. Get Token Information
**GET /api/ml-accounts/:accountId/token-info**

Get current token status and health information.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accountId": "ml_1234567890_abc123",
    "tokenInfo": {
      "accountId": "ml_1234567890_abc123",
      "mlUserId": "123456789",
      "tokenExpiry": "2024-01-25T18:00:00Z",
      "timeToExpiry": 3600,
      "healthPercent": 50,
      "isExpired": false,
      "needsRefresh": false
    },
    "status": "active"
  }
}
```

---

## Background Jobs

### ML Accounts Sync Job (`backend/jobs/ml-accounts-sync.js`)

Automated background tasks for account management.

**Schedule:**

1. **Sync Accounts** - Every 5 minutes
   - Finds accounts with `syncEnabled=true` and `lastSync` older than interval
   - Fetches data from Mercado Livre API
   - Updates cached data
   - Tracks sync status and errors

2. **Refresh Tokens** - Every 30 minutes
   - Finds accounts with expired tokens
   - Attempts token refresh using refresh token
   - Updates token expiration time
   - Marks account as "expired" if refresh fails

3. **Cleanup Errors** - Daily at 3 AM
   - Keeps only last 20 errors per account
   - Maintains efficient error history

4. **Health Check** - Every 15 minutes
   - Logs count of accounts by status
   - Provides visibility into system health

**Functions:**

- `syncMLAccount(account)` - Sync a single account
- `syncAllMLAccounts()` - Sync all accounts that need it
- `refreshToken(account)` - Refresh expired token
- `refreshExpiredTokens()` - Refresh all expired tokens
- `cleanupOldErrors()` - Clean error history
- `healthCheck()` - Log system health metrics
- `initializeSchedules()` - Initialize all scheduled jobs

---

## Token Management

### MLTokenManager Utility (`backend/utils/ml-token-manager.js`)

Centralized token management functionality.

**Static Methods:**

```javascript
// Check if token is expired or about to expire
isTokenExpired(expiresAt, bufferMs = 5 * 60 * 1000)

// Check if token is critically expired
isTokenCriticallyExpired(expiresAt)

// Refresh OAuth token
refreshToken(refreshToken, clientId, clientSecret)

// Validate token with ML API
validateToken(accessToken)

// Get remaining time to expiry in seconds
getTimeToExpiry(expiresAt)

// Get token health percentage (100% = fresh, 0% = expiring)
getTokenHealthPercent(expiresAt, refreshedAt)

// Get complete token information
getTokenInfo(account)
```

**Usage:**

```javascript
const MLTokenManager = require('./utils/ml-token-manager');

// Check if token needs refresh
if (MLTokenManager.isTokenExpired(account.tokenExpiresAt)) {
  const result = await MLTokenManager.refreshToken(
    account.refreshToken,
    process.env.ML_CLIENT_ID,
    process.env.ML_CLIENT_SECRET
  );

  if (result.success) {
    account.accessToken = result.accessToken;
    account.refreshToken = result.refreshToken;
    account.tokenExpiresAt = result.tokenExpiresAt;
    await account.save();
  }
}

// Get token health info
const tokenInfo = MLTokenManager.getTokenInfo(account);
console.log(`Token expires in ${tokenInfo.timeToExpiry} seconds`);
console.log(`Health: ${tokenInfo.healthPercent}%`);
```

---

## Testing

### Integration Tests

**Location:** `backend/tests/integration/ml-accounts.test.js`

Tests complete workflows for account management:

- User registration and authentication
- Adding ML accounts
- Listing and retrieving accounts
- Updating account settings
- Syncing individual and multiple accounts
- Pause and resume synchronization
- Token refresh
- Account deletion
- Multiple account management

**Run Tests:**
```bash
npm run test:integration
```

### Unit Tests

**Location:** `backend/tests/unit/`

1. **ml-token-manager.test.js**
   - Token expiration checks
   - Health percentage calculations
   - Token validation
   - Refresh token handling

2. **ml-account-model.test.js**
   - Account creation and updates
   - Sync status tracking
   - Cached data updates
   - Pause/resume operations
   - Error history management
   - Static query methods

**Run Tests:**
```bash
npm run test:unit
```

**Run All Tests:**
```bash
npm test
```

---

## Error Handling

### Account Status Values

- **active**: Account is functioning normally
- **paused**: Synchronization is paused by user
- **expired**: Token has expired and needs refresh
- **error**: An error occurred during last sync

### Common Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "message": "Missing required fields",
  "required": ["mlUserId", "nickname", "email", ...]
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Token has expired or is invalid",
  "code": "TOKEN_EXPIRED"
}
```

**409 Conflict**
```json
{
  "success": false,
  "message": "This Mercado Livre account is already connected"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Failed to synchronize account",
  "error": "Error details"
}
```

---

## Environment Configuration

Add to `backend/.env`:

```bash
# Mercado Livre OAuth
ML_CLIENT_ID=your_client_id
ML_CLIENT_SECRET=your_client_secret
ML_REDIRECT_URI=http://localhost:3000/auth/ml-callback

# Database
MONGODB_URI=mongodb://localhost:27017/projeto-sass
MONGODB_TEST_URI=mongodb://localhost:27017/projeto-sass-test

# Node
NODE_ENV=development
PORT=3000
```

---

## Integration with Frontend

The frontend can use these endpoints to:

1. **Initialize Account Connection**
```javascript
const integration = new MLFrontendIntegration({
  apiBaseUrl: 'http://localhost:3000'
});

await integration.init();
```

2. **Add Account**
```javascript
const response = await fetch('/api/ml-accounts', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    mlUserId: '123456',
    nickname: 'my_store',
    email: 'store@example.com',
    accessToken: 'APP_USR_...',
    refreshToken: 'APP_REF_...',
    tokenExpiresAt: new Date()
  })
});
```

3. **List Accounts**
```javascript
const response = await fetch('/api/ml-accounts', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const accounts = await response.json();
```

4. **Sync Account**
```javascript
await fetch(`/api/ml-accounts/${accountId}/sync`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Next Steps

### For Production Deployment

1. **Database Optimization**
   - Add MongoDB indexes (already configured in model)
   - Set up database backups
   - Enable MongoDB authentication

2. **Security Hardening**
   - Encrypt token storage in database
   - Implement rate limiting on token refresh
   - Add CORS configuration for frontend domain

3. **Monitoring**
   - Set up alerts for failed syncs
   - Monitor background job execution
   - Track API response times

4. **Performance**
   - Implement caching layer (Redis)
   - Add batch operation optimizations
   - Monitor and optimize sync performance

5. **Webhook Implementation**
   - Register webhooks with Mercado Livre
   - Handle real-time account update notifications
   - Reduce reliance on polling

---

## Troubleshooting

### Token Refresh Fails

1. Check `ML_CLIENT_ID` and `ML_CLIENT_SECRET` in `.env`
2. Verify refresh token hasn't expired
3. Check Mercado Libre API status
4. Review logs in `logs/app.log`

### Sync Not Running

1. Check background job is initialized in `server.js`
2. Verify MongoDB connection
3. Check if account has `syncEnabled=true`
4. Review sync status in account details

### Account Shows as Expired

1. Account needs token refresh via `/api/ml-accounts/:id/refresh-token`
2. If refresh fails, user needs to re-authenticate
3. Check ML app credentials are correct

---

## Support & Questions

For issues or questions about the backend implementation:

1. Check logs: `npm run logs`
2. Run health check: `npm run health-check`
3. Run tests: `npm test`
4. Review detailed error messages in response body
