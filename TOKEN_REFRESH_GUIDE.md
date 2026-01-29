#!/bin/bash

# TOKEN REFRESH IMPLEMENTATION GUIDE
# ====================================
# 
# This document explains how the automatic token refresh system works
# and how to use it in your application.

## Problem Solved

Mercado Livre access tokens expire after 6 hours. This implementation
automatically refreshes tokens before they expire, so users never have
to manually reconnect their accounts (as long as they use OAuth).

## Solution Overview

```
User connects account (two methods):
│
├─ Method 1: Manual Token
│   User provides: accessToken only
│   System can: validate token, fetch data
│   BUT: Cannot auto-refresh (no refreshToken)
│   Duration: token expires after 6 hours, user must reconnect
│
└─ Method 2: OAuth (RECOMMENDED)
    User provides: accessToken + refreshToken (+ expiresIn)
    System can: validate, fetch data, AND auto-refresh
    Duration: refreshToken valid 6 months, auto-renewal every 5.5h
```

## Architecture

### 1. Token Storage (Database)
```
MLAccount Document:
├── accessToken: String (current token, used for API calls)
├── refreshToken: String (renewal token, valid 6 months)
├── tokenExpiresAt: Date (when accessToken expires)
├── lastTokenRefresh: Date (when token was last renewed)
├── nextTokenRefreshNeeded: Date (when to refresh again)
├── tokenRefreshStatus: String (pending/in_progress/success/failed)
└── tokenRefreshError: String (error message if refresh failed)
```

### 2. Automatic Refresh Job
```
File: backend/jobs/token-refresh.js

What it does:
1. Runs every hour (on minute 0: 12:00, 13:00, 14:00, etc.)
2. Finds all accounts with refreshToken that need renewal
3. Calls Mercado Libre OAuth endpoint: POST /oauth/token
4. Receives new accessToken + new refreshToken + expiresIn
5. Updates both tokens in database
6. Logs success/failure

Schedule:
- Hourly check for tokens needing refresh
- Refresh 5 minutes before expiry (safe margin)
- Also runs on server startup
```

### 3. Token Refresh Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    Token Lifecycle                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  T=0h    User logs in with OAuth                           │
│  ├─ Receives: accessToken (6h life) + refreshToken (6m)    │
│  ├─ Stored: both in database                               │
│  └─ Status: active, ready to use                           │
│                                                             │
│  T=5h    Background job checks tokens                      │
│  ├─ Finds: this token expires in 1 hour                    │
│  ├─ Action: calls Mercado Libre refresh endpoint           │
│  ├─ Receives: new accessToken + new refreshToken           │
│  ├─ Updated: database with new tokens                      │
│  └─ Status: refreshed, another 6 hours granted             │
│                                                             │
│  T=10h   Background job checks tokens again                │
│  ├─ Finds: token expires in 1 hour (from 5h refresh)       │
│  ├─ Action: refreshes again                                │
│  └─ Result: continuous operation, no manual action needed  │
│                                                             │
│  ... (repeats every 5.5 hours indefinitely)                │
│                                                             │
│  T=6 months  refreshToken expires                          │
│  ├─ System: marks account as needing re-authentication     │
│  └─ User: must reconnect account once                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### 1. Create Account with OAuth Token
```
POST /api/ml-accounts
Content-Type: application/json
Authorization: Bearer {user-jwt-token}

Request:
{
  "accessToken": "APP_USR-1234567890",
  "refreshToken": "TG-abcdef1234567890abcdef1234567890",
  "expiresIn": 21600,
  "accountName": "Minha Loja Principal"
}

Response:
{
  "success": true,
  "data": {
    "id": "ml_xxx",
    "nickname": "vendedor123",
    "email": "vendedor@email.com",
    "accountName": "Minha Loja Principal",
    "canAutoRefresh": true  ← Important: means account has refreshToken
  }
}
```

### 2. Manually Refresh Token
```
PUT /api/ml-accounts/{accountId}/refresh-token
Authorization: Bearer {user-jwt-token}

Response (success):
{
  "success": true,
  "data": {
    "accountId": "ml_xxx",
    "tokenExpiresAt": "2026-01-30T10:45:00Z",
    "expiresIn": 21600,
    "refreshedAt": "2026-01-30T04:45:00Z"
  }
}

Response (failure - no refreshToken):
{
  "success": false,
  "code": "NO_REFRESH_TOKEN",
  "message": "This account does not have automatic token refresh capability",
  "solution": "Reconnect account using OAuth"
}

Response (failure - refresh failed):
{
  "success": false,
  "code": "TOKEN_REFRESH_FAILED",
  "error": "Invalid refresh token",
  "solution": "Try reconnecting your Mercado Livre account"
}
```

### 3. Check Token Status
```
GET /api/ml-accounts/{accountId}/token-info
Authorization: Bearer {user-jwt-token}

Response:
{
  "success": true,
  "data": {
    "accountId": "ml_xxx",
    "tokenInfo": {
      "tokenExpiry": "2026-01-30T10:45:00Z",
      "timeToExpiry": 21300,        ← seconds until expiry
      "healthPercent": 95,          ← percentage of life remaining
      "isExpired": false,
      "needsRefresh": false
    }
  }
}
```

## Background Job Logs

The token refresh job logs all activities. Check logs for:

### Success Log:
```
{
  "action": "TOKEN_REFRESH_SUCCESS",
  "accountId": "ml_xxx",
  "mlUserId": "12345",
  "nickname": "vendedor123",
  "expiresIn": 21600,
  "newTokenExpiresAt": "2026-01-30T10:45:00Z"
}
```

### Failure Log:
```
{
  "action": "TOKEN_REFRESH_FAILED",
  "accountId": "ml_xxx",
  "error": "Invalid refresh token",
  "statusCode": 401
}
```

### Skip Log (manual token, can't refresh):
```
{
  "action": "TOKEN_REFRESH_SKIP",
  "accountId": "ml_xxx",
  "reason": "No refresh token available (manual token entry)"
}
```

## Frontend Implementation

### 1. Showing Token Status
```javascript
// Display token health in UI
if (account.canAutoRefresh) {
  // Account has refreshToken, will auto-refresh
  showStatus('green', '✓ Token auto-refreshes');
} else {
  // Manual token, no auto-refresh
  showStatus('yellow', '⚠ Token expires in 6 hours');
  showButton('Refresh Now', refreshTokenManually);
}
```

### 2. Manual Refresh Button
```javascript
async function refreshToken(accountId) {
  const response = await fetch(
    `/api/ml-accounts/${accountId}/refresh-token`,
    { method: 'PUT' }
  );
  
  if (response.ok) {
    showSuccess('Token refreshed successfully!');
    // Update UI to show new expiry time
  } else {
    const error = await response.json();
    showError(error.message);
    if (error.code === 'NO_REFRESH_TOKEN') {
      showButton('Reconnect Account', reconnectAccount);
    }
  }
}
```

### 3. Periodic Token Status Check
```javascript
// Check token health every 30 minutes
setInterval(async () => {
  const account = getCurrentAccount();
  const response = await fetch(
    `/api/ml-accounts/${account.id}/token-info`
  );
  
  const { tokenInfo } = await response.json();
  
  // Show warning if token expiring soon
  if (tokenInfo.healthPercent < 20) {
    showWarning('Token expiring soon. Will auto-refresh.');
  }
  
  // Critical: token already expired
  if (tokenInfo.isExpired) {
    showError('Token has expired! Attempting refresh...');
  }
}, 30 * 60 * 1000);
```

## Troubleshooting

### Issue: Token keeps expiring even after refresh
**Solution**: Check if job is running
```bash
# Check logs
tail -f logs/server.log | grep TOKEN_REFRESH

# Manually trigger refresh
PUT /api/ml-accounts/{id}/refresh-token
```

### Issue: "No refresh token" error
**Solution**: Account was created with manual token entry, must reconnect via OAuth
```
The account has:
- accessToken (expires in 6 hours)
- NO refreshToken (can't auto-renew)

Fix: User must reconnect using OAuth flow
```

### Issue: Refresh failed with "Invalid refresh token"
**Solution**: The refresh token itself has expired (6 months) or was revoked
```
Possible causes:
1. User revoked app authorization in Mercado Livre
2. 6 months have passed since original OAuth
3. Mercado Livre revoked the token

Fix: User must reconnect account via OAuth
```

### Issue: Token refresh happened but still getting "token expired" errors
**Solution**: API might be caching token status. Wait a moment and retry.
```
The refresh job updated the token successfully, but:
- Your request might have used old token
- Wait 5 seconds and retry
- Or manually call refresh endpoint
```

## Configuration

Token refresh settings in code:

```javascript
// backend/jobs/token-refresh.js

// Refresh schedule
'0 * * * *'  ← Every hour at minute 0

// Refresh buffer (when to start refreshing)
TOKEN_REFRESH_BUFFER = 5 * 60 * 1000  ← 5 minutes before expiry

// Mercado Libre credentials (from environment)
ML_APP_CLIENT_ID = process.env.ML_APP_CLIENT_ID
ML_APP_CLIENT_SECRET = process.env.ML_APP_CLIENT_SECRET
```

To change refresh frequency, edit the schedule in token-refresh.js:
```javascript
// Every 30 minutes instead of hourly:
const job = schedule.scheduleJob('*/30 * * * *', tokenRefreshJob);

// Every 5 minutes:
const job = schedule.scheduleJob('*/5 * * * *', tokenRefreshJob);

// At specific time (2 AM daily):
const job = schedule.scheduleJob('0 2 * * *', tokenRefreshJob);
```

## Summary

✅ Automatic token refresh implemented
✅ Refresh tokens stored securely in database
✅ Background job runs hourly to refresh expiring tokens
✅ Manual refresh endpoint available for on-demand refresh
✅ Token status visible to frontend
✅ Error handling and fallbacks in place
✅ Accounts with OAuth can run indefinitely (6 months between re-auth)
✅ Manual token accounts work but need reconnection after 6 hours

Next: Implement frontend UI to show token status and warnings
