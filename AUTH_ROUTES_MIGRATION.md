# Auth Routes Migration Plan

## Files Analysis

### auth.js (2645 lines) 
**Purpose:** User authentication (login, register, password reset)
**Status:** Standard auth flow - not ML-specific
**Priority:** Medium (can be optimized separately)

### ml-auth.js (412 lines)
**Purpose:** Mercado Libre OAuth 2.0 integration
**Status:** Using ml-oauth-invisible service
**Priority:** HIGH - Core to platform
**Refactoring Potential:** 30% code reduction

### ml-accounts.js (1063 lines)
**Purpose:** ML account management, connection, disconnection
**Status:** Using axios directly
**Priority:** CRITICAL - Multiple duplication opportunities
**Refactoring Potential:** 45% code reduction

## ml-auth.js Migration

### Current Architecture
```
Route: ml-auth.js
  └── Service: ml-oauth-invisible.js
       ├── OAuth state management
       ├── Token exchange
       └── Account storage
```

### Available SDK Methods
```javascript
sdk.auth.getAccessToken()        // Exchange code for token
sdk.auth.refreshToken()          // Refresh access token
sdk.auth.validateToken()         // Check token validity
sdk.auth.revokeToken()           // Revoke token
sdk.auth.getCurrentUser()        // Get authenticated user
```

### Migration Benefits
- Remove manual OAuth code
- SDK handles token refresh automatically
- Better error handling
- Standardized token storage

### Code Comparison

**BEFORE (Current ml-oauth-invisible.js):**
```javascript
// Manual OAuth flow
const exchangeCodeForToken = async (code) => {
  const response = await axios.post(
    'https://api.mercadolibre.com/oauth/token',
    {
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI
    }
  );
  return response.data;
};
```

**AFTER (SDK-based):**
```javascript
// SDK handles OAuth
const tokens = await sdk.auth.getAccessToken(code);
// SDK automatically refreshes when needed
```

## ml-accounts.js Migration - CRITICAL

### Current State: 1063 lines using axios directly

**Sample endpoints:**
- GET /api/ml-accounts - List accounts
- POST /api/ml-accounts/connect - Connect account
- DELETE /api/ml-accounts/:accountId - Disconnect
- GET /api/ml-accounts/:accountId/status - Check status

### Refactoring Strategy

1. **Connection Flow** (Lines 50-150)
   - Replace axios with SDK
   - Leverage SDK's token validation
   - Use SDK's user info fetch

2. **Account List** (Lines 160-250)
   - Use SDK to fetch user info
   - Reduce DB lookups

3. **Status Check** (Lines 260-330)
   - SDK auto-validates tokens
   - Check token expiry via SDK
   - Auto-refresh if needed

4. **Disconnection** (Lines 340-390)
   - SDK revoke token method
   - Clean up DB record

### Expected Code Reduction
- OAuth handling: -150 lines
- Error handling: -100 lines
- Token management: -150 lines
- API calls: -100 lines
**Total: ~500 lines saved (47% reduction)**

## Implementation Plan

### Step 1: Analyze Dependencies (30 min)
- Review ml-oauth-invisible.js usage
- Check what ml-accounts.js depends on
- Find all axios calls

### Step 2: Create SDK Wrapper (1 hour)
- Create ml-auth-sdk.js service
- Wrap SDK auth methods
- Add error normalization

### Step 3: Refactor ml-auth.js (1.5 hours)
- Replace oauth-invisible service
- Update token storage logic
- Test OAuth flow

### Step 4: Refactor ml-accounts.js (2 hours)
- Replace axios calls
- Update connection flow
- Update account validation

### Step 5: Testing (1 hour)
- Test OAuth callback
- Test account connection
- Test token refresh
- Test disconnection

**Total Time: ~6 hours**

## Critical Validation Points

### OAuth Flow
- [ ] Redirect to ML auth URL works
- [ ] Callback receives code
- [ ] Token exchange successful
- [ ] Tokens stored correctly
- [ ] User info fetched
- [ ] Account created in DB

### Account Management
- [ ] List accounts returns correct data
- [ ] New account connection works
- [ ] Token validation works
- [ ] Token refresh automatic
- [ ] Disconnection revokes token
- [ ] Status reflects actual token state

### Error Handling
- [ ] Invalid code → 400 error
- [ ] Expired token → 401 error
- [ ] Network error → retry logic
- [ ] Quota exceeded → rate limit error

## Files to Modify

```
backend/services/
  ├── ml-oauth-invisible.js        → Replace with SDK calls
  ├── sdk-manager.js               → Already exists, good to use
  └── ml-auth-sdk.js               → Create new wrapper

backend/routes/
  ├── ml-auth.js                   → Migrate to use new wrapper
  └── ml-accounts.js               → Migrate to use SDK manager
```

## Testing Examples

### OAuth Flow Test
```javascript
describe('ML OAuth Flow', () => {
  it('should exchange code for tokens', async () => {
    const code = 'TG...(mocked)';
    const tokens = await mlAuthSDK.exchangeCode(code);
    expect(tokens.access_token).toBeDefined();
    expect(tokens.user_id).toBeDefined();
  });

  it('should refresh token automatically', async () => {
    const account = await MLAccount.findOne(...);
    const newTokens = await mlAuthSDK.refreshToken(account.refreshToken);
    expect(newTokens.access_token).toBeDefined();
  });
});
```

## Success Criteria

### Code Quality
- [ ] Lines of code reduced by 40%+
- [ ] Cyclomatic complexity < 8
- [ ] 100% test coverage
- [ ] No duplication

### Performance
- [ ] OAuth flow < 2 seconds
- [ ] Account list < 1 second
- [ ] Token refresh automatic

### Functionality
- [ ] All existing endpoints work
- [ ] OAuth flow unchanged from user perspective
- [ ] Error messages clear
- [ ] Logging comprehensive

## Documentation to Create

1. **ml-auth-migration.md** - Step-by-step guide
2. **oauth-flow.md** - OAuth flow diagram
3. **troubleshooting.md** - Common issues
4. **testing-guide.md** - How to test changes

---

**Next Action:** Start with analyzing ml-oauth-invisible.js dependencies
