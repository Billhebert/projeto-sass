#!/bin/bash

# TOKEN REFRESH TESTING GUIDE
# ==========================
#
# Complete guide to test the automatic token refresh implementation

## Test Environment Setup

Before testing, ensure:
1. Backend is running: `NODE_ENV=test node backend/server.js`
2. Frontend is running: `cd frontend && npm run dev`
3. MongoDB is running (in-memory for tests)
4. Check logs at: `logs/server.log`

---

## Test 1: Create Account with Manual Token

**Objective**: Verify that manual token entry works without refresh token

### Steps:
1. Open browser at http://localhost:5173
2. Login with test account
3. Go to "Contas ML"
4. Click "➕ Adicionar Manualmente"
5. Enter a valid Mercado Livre access token
6. Click "Salvar"

### Expected Results:
- ✅ Account created successfully
- ✅ TokenStatus shows red warning "Token expirado"  (since manual token has no refresh)
- ✅ Shows "Sem renovação automática" (no auto-refresh available)
- ✅ "Renovar Agora" button is visible
- ✅ Token health bar shows status

### Check Backend Logs:
```
grep "ML_ACCOUNT_ADDED" logs/server.log
# Should show: "hasRefreshToken": false
```

---

## Test 2: Token Status Display

**Objective**: Verify token status is displayed correctly

### Steps:
1. From Accounts page, view any account
2. Locate the TokenStatus component

### Expected Results:
- ✅ Token expiration time is shown
- ✅ Health bar displays correctly
- ✅ Color changes based on expiration time
  - Green: > 30% life remaining
  - Orange: < 30% life remaining
  - Red: Expired
- ✅ Minutes/hours until expiration is calculated

---

## Test 3: Automatic Token Refresh Job

**Objective**: Verify background job runs and refreshes tokens

### Prerequisites:
- Create account with OAuth token (has refreshToken)
- Or manually update database to add refreshToken

### Steps:
1. Wait for job to run (runs every hour, or check next run time)
2. Monitor backend logs for token refresh activity

### Expected Backend Logs:
```
# Job start
grep "TOKEN_REFRESH_JOB_START" logs/server.log
{
  "action": "TOKEN_REFRESH_JOB_START",
  "timestamp": "2026-01-30T12:00:00Z"
}

# Accounts found for refresh
grep "TOKEN_REFRESH_JOB_FOUND" logs/server.log
{
  "action": "TOKEN_REFRESH_JOB_FOUND",
  "count": 1
}

# Refresh completed
grep "TOKEN_REFRESH_JOB_COMPLETE" logs/server.log
{
  "action": "TOKEN_REFRESH_JOB_COMPLETE",
  "total": 1,
  "successful": 1,
  "failed": 0
}

# Individual refresh success
grep "TOKEN_REFRESH_SUCCESS" logs/server.log
{
  "action": "TOKEN_REFRESH_SUCCESS",
  "accountId": "ml_xxx",
  "mlUserId": "12345",
  "expiresIn": 21600
}
```

### Force Job to Run:
```bash
# In Node REPL:
const { tokenRefreshJob } = require('./backend/jobs/token-refresh.js')
await tokenRefreshJob()
```

---

## Test 4: Manual Token Refresh via Endpoint

**Objective**: Test the manual refresh endpoint

### Prerequisites:
- Account with refreshToken (created via OAuth)

### Steps:

**Using cURL:**
```bash
# 1. Get JWT token from login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  | jq -r '.data.token')

# 2. Call manual refresh endpoint
curl -X PUT http://localhost:3000/api/ml-accounts/ml_xxx/refresh-token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "accountId": "ml_xxx",
    "tokenExpiresAt": "2026-01-30T10:45:00Z",
    "expiresIn": 21600,
    "refreshedAt": "2026-01-30T04:45:00Z"
  }
}
```

**Response (No Refresh Token):**
```json
{
  "success": false,
  "code": "NO_REFRESH_TOKEN",
  "message": "This account does not have automatic token refresh capability"
}
```

### Expected Backend Log:
```
grep "MANUAL_TOKEN_REFRESH" logs/server.log
{
  "action": "MANUAL_TOKEN_REFRESH_SUCCESS",
  "accountId": "ml_xxx",
  "expiresIn": 21600
}
```

---

## Test 5: Token Validation Middleware

**Objective**: Verify token is validated before API calls

### Steps:

**Test 1: Valid Token**
```bash
# Account with valid token
curl -X POST http://localhost:3000/api/products/ml_xxx/sync \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Expected:
- ✅ Sync proceeds normally
- ✅ Products fetched and saved
- ✅ No error about expired token

**Test 2: Expired Token (No Refresh)**
```bash
# Manually expire a token in database:
db.ml_accounts.updateOne(
  { _id: ObjectId("...") },
  { $set: { tokenExpiresAt: new Date("2025-01-01") } }
)

# Try to sync
curl -X POST http://localhost:3000/api/products/ml_xxx/sync \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Expected Response:
```json
{
  "success": false,
  "code": "TOKEN_EXPIRED",
  "message": "Account token has expired. Please reconnect your account."
}
```

**Test 3: Token About to Expire (Has Refresh)**
```bash
# Set token to expire in 4 minutes
db.ml_accounts.updateOne(
  { _id: ObjectId("...") },
  { $set: { tokenExpiresAt: new Date(Date.now() + 4 * 60 * 1000) } }
)

# Try to sync - should auto-refresh
curl -X POST http://localhost:3000/api/products/ml_xxx/sync \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Expected:
- ✅ Middleware auto-refreshes token
- ✅ Sync proceeds with new token
- ✅ Log shows "ML_TOKEN_AUTO_REFRESHED"

### Backend Logs to Check:
```
# Token validation
grep "ML_TOKEN_VALIDATION" logs/server.log

# Token expired
grep "ML_TOKEN_CRITICALLY_EXPIRED" logs/server.log

# Token needs refresh
grep "ML_TOKEN_NEEDS_REFRESH" logs/server.log

# Auto-refresh success
grep "ML_TOKEN_AUTO_REFRESHED" logs/server.log

# Auto-refresh failure
grep "ML_TOKEN_AUTO_REFRESH_FAILED" logs/server.log
```

---

## Test 6: Frontend Token Status Component

**Objective**: Verify UI updates correctly

### Manual Testing:
1. Open Accounts page
2. Wait 5 minutes (component updates automatically)
3. Observe token health bar color changes
4. Click "🔄 Renovar Agora" button
5. Verify success/error messages appear

### Expected Behavior:
- ✅ Token status loads on component mount
- ✅ Updates every 5 minutes
- ✅ Manual refresh button works
- ✅ Success message appears for 3 seconds
- ✅ Error message shows if refresh fails
- ✅ Health bar animates on refresh

### Testing in Browser Console:
```javascript
// Force fetch token info
const accountId = 'ml_xxx'
const response = await fetch(`/api/ml-accounts/${accountId}/token-info`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
const data = await response.json()
console.log(data.data.tokenInfo)
```

---

## Test 7: End-to-End Flow

**Objective**: Complete workflow from account creation to automatic refresh

### Scenario 1: OAuth Flow
```
1. Create account via OAuth
   → Receive accessToken + refreshToken + expiresIn
   → Save both to database
   
2. Wait 5.5 hours (simulate time passing)
   
3. Background job runs
   → Detects token expiring
   → Calls Mercado Livre refresh endpoint
   → Gets new accessToken + new refreshToken
   
4. User tries to sync
   → API call uses new token
   → Sync succeeds
   → Cycle repeats
```

### Scenario 2: Manual Token Flow
```
1. Create account with manual token
   → Receive only accessToken
   → No refreshToken in database
   
2. Wait 5.5 hours (simulate time passing)
   
3. Background job runs
   → Checks account
   → Skips (no refreshToken available)
   → Logs "TOKEN_REFRESH_SKIP"
   
4. User tries to sync in hour 6
   → Token is expired
   → API returns error
   → User sees warning
   → User must reconnect account
```

### Scenario 3: Manual Refresh
```
1. Account with no refreshToken
   
2. Token approaching expiration (< 1 hour)
   
3. User clicks "🔄 Renovar Agora"
   
4. Frontend calls PUT /api/ml-accounts/:id/refresh-token
   
5. Backend returns error: "NO_REFRESH_TOKEN"
   
6. User must reconnect via OAuth
```

---

## Test 8: Error Scenarios

### Scenario 1: Refresh Token Expired
```bash
# In database, delete/corrupt refreshToken
db.ml_accounts.updateOne(
  { _id: ObjectId("...") },
  { $set: { refreshToken: "INVALID_TOKEN_12345" } }
)

# Call manual refresh
curl -X PUT http://localhost:3000/api/ml-accounts/ml_xxx/refresh-token \
  -H "Authorization: Bearer $TOKEN"
```

Expected Response:
```json
{
  "success": false,
  "code": "TOKEN_REFRESH_FAILED",
  "message": "Failed to refresh token. You may need to reconnect your account.",
  "error": "Invalid refresh token"
}
```

### Scenario 2: Network Error During Refresh
```bash
# Stop Mercado Livre API (simulate network issue)
# Call manual refresh or wait for job
```

Expected:
- ✅ Job logs error
- ✅ Account marked with error status
- ✅ Next refresh attempt in 1 hour
- ✅ User sees warning in UI

### Scenario 3: Concurrent Refresh Attempts
```bash
# Call refresh endpoint multiple times simultaneously
curl -X PUT http://localhost:3000/api/ml-accounts/ml_xxx/refresh-token \
  -H "Authorization: Bearer $TOKEN" &
curl -X PUT http://localhost:3000/api/ml-accounts/ml_xxx/refresh-token \
  -H "Authorization: Bearer $TOKEN" &
curl -X PUT http://localhost:3000/api/ml-accounts/ml_xxx/refresh-token \
  -H "Authorization: Bearer $TOKEN" &
```

Expected:
- ✅ All requests succeed
- ✅ Database has final token state
- ✅ No race condition errors

---

## Monitoring in Production

### Key Metrics to Track:
```
1. Token refresh success rate
   grep "TOKEN_REFRESH_SUCCESS\|TOKEN_REFRESH_FAILED" logs/server.log | wc -l

2. Average refresh time
   grep "TOKEN_REFRESH_SUCCESS" logs/server.log | jq '.expiresIn'

3. Accounts needing manual intervention
   grep "NO_REFRESH_TOKEN\|TOKEN_REFRESH_FAILED" logs/server.log

4. Job execution frequency
   grep "TOKEN_REFRESH_JOB_START" logs/server.log | wc -l
   # Should be 1 per hour
```

### Alerts to Configure:
```
- If TOKEN_REFRESH_FAILED count > 10 in 1 hour
- If TOKEN_REFRESH_JOB_START stops appearing (job crashed)
- If ML API response time > 5 seconds
```

---

## Debugging

### Enable Verbose Logging:
```bash
NODE_ENV=test DEBUG=*:ml-token,*:token-refresh node backend/server.js
```

### Check Token in Database:
```javascript
// Connect to MongoDB
db.ml_accounts.findOne({ id: 'ml_xxx' }).then(acc => {
  console.log('Token Info:', {
    tokenExpiresAt: acc.tokenExpiresAt,
    hasRefreshToken: !!acc.refreshToken,
    lastTokenRefresh: acc.lastTokenRefresh,
    nextTokenRefreshNeeded: acc.nextTokenRefreshNeeded,
    tokenRefreshStatus: acc.tokenRefreshStatus,
  })
})
```

### Test Mercado Livre API Directly:
```bash
# Get user info (validates token)
curl -X GET https://api.mercadolibre.com/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Refresh token
curl -X POST https://auth.mercadolibre.com/oauth/token \
  -d "grant_type=refresh_token" \
  -d "client_id=YOUR_APP_ID" \
  -d "client_secret=YOUR_APP_SECRET" \
  -d "refresh_token=YOUR_REFRESH_TOKEN"
```

---

## Summary

The token refresh system is working correctly if:

1. ✅ Accounts with refreshToken auto-refresh hourly
2. ✅ Manual tokens show warnings but work for 6 hours
3. ✅ Sync operations succeed with refreshed tokens
4. ✅ Frontend shows correct token status
5. ✅ Manual refresh button works
6. ✅ Error messages are clear and actionable
7. ✅ Background job runs consistently
8. ✅ No 401 errors for valid operations
