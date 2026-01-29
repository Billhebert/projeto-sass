# Quick Testing Guide - Product Management

**Created**: January 29, 2026

---

## 🚀 Quick Start Testing

### Step 1: Start Backend & Frontend

```bash
# In project root
npm run dev

# OR manually:
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev
```

Expected output:
- Backend running on `http://localhost:3011`
- Frontend running on `http://localhost:5173` or `http://localhost:5174`

---

## 🔐 Test Authentication

### Create Test User:

1. Open `http://localhost:5173` (or 5174)
2. Click "Register"
3. Fill in form:
   - Email: `test@example.com`
   - Password: `password123` (min 8 chars)
   - First Name: `Test`
   - Last Name: `User`
4. Click "Register"

### Login:

1. Click "Login"
2. Enter credentials from above
3. You should see Dashboard

---

## 📦 Test Product Management

### Step 1: Connect ML Account

1. Go to "Contas ML" (sidebar)
2. Click "🏪 Mercado Livre" button
3. OR click "➕ Adicionar Manualmente" to add test account

**If connecting via OAuth:**
- You'll be redirected to Mercado Livre
- Authorize the app
- Should return to accounts page

**If adding manually:**
- Nickname: `Test Store`
- Email: `test@mercadolivre.com`
- Access Token: `your_ml_token` (get from ML app dashboard)
- Click "Salvar"

### Step 2: View Products Page

1. On "Contas ML" page
2. Find your account
3. Click "📦 Produtos" button
4. Should show empty Products page with "Sync Products" button

### Step 3: Sync Products

1. Click "🔄 Sync Products" button
2. Wait for sync to complete (should show products)
3. See statistics:
   - Total Products
   - Active/Paused products
   - Sales metrics
   - Inventory value

### Step 4: Test Product Features

**Search:**
- Type product name in search box
- Results filter in real-time

**Filter by Status:**
- Select from dropdown: All, Active, Paused, Closed
- List updates immediately

**Sort Products:**
- Newest First / Oldest First
- Price: High to Low / Low to High
- Most Sales

**Pagination:**
- Click Next/Previous buttons
- Shows page number and total

**Product Actions:**
- 👁️ button: View on Mercado Livre
- 🗑️ button: Remove product

---

## 🧪 API Testing with cURL

### Get Access Token:

```bash
# Login to get JWT token (save this)
curl -X POST http://localhost:3011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Response will include token, copy it
# TOKEN=your_token_here
```

### Test Product Endpoints:

```bash
TOKEN="your_token_here"
ACCOUNT_ID="your_account_id"

# List all products
curl -X GET "http://localhost:3011/api/products" \
  -H "Authorization: Bearer $TOKEN"

# List products for account
curl -X GET "http://localhost:3011/api/products/$ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Get product stats
curl -X GET "http://localhost:3011/api/products/$ACCOUNT_ID/stats" \
  -H "Authorization: Bearer $TOKEN"

# Sync products from Mercado Livre
curl -X POST "http://localhost:3011/api/products/$ACCOUNT_ID/sync" \
  -H "Authorization: Bearer $TOKEN"
```

### Test ML App Token:

```bash
# Get app-level token (no account needed)
curl -X GET http://localhost:3011/api/auth/ml-app-token

# Response:
# {
#   "success": true,
#   "data": {
#     "accessToken": "...",
#     "expiresIn": 21600,
#     "tokenType": "Bearer"
#   }
# }
```

---

## 📊 Expected Test Results

### Successful Sync:
- ✅ Products appear in list
- ✅ Thumbnails load
- ✅ Prices display correctly
- ✅ Stock quantities shown
- ✅ Statistics update

### UI Elements Present:
- ✅ Statistics cards (6 cards)
- ✅ Search box
- ✅ Filter dropdowns
- ✅ Products table
- ✅ Pagination buttons
- ✅ Action buttons

### Data Integrity:
- ✅ Product count correct
- ✅ No duplicate products
- ✅ Prices match ML
- ✅ Stock levels accurate
- ✅ Images load correctly

---

## ❌ Troubleshooting

### No Products After Sync:
- Check ML account credentials
- Verify app credentials in `.env`
- Check browser console for errors
- Check backend logs for API errors

### Products Page Blank:
- Ensure you're logged in
- Check JWT token is valid
- Verify account ID in URL
- Check MongoDB connection

### Sync Button Stuck:
- Check backend logs
- Verify network connectivity
- Try refreshing page
- Check Mercado Livre API status

### Images Not Loading:
- Check image URLs in database
- Verify network access to ML
- Check CORS settings
- Try clearing browser cache

### Database Issues:
- Verify MongoDB running: `docker ps`
- Check connection string in `.env`
- Try MongoDB Compass to inspect data
- Check disk space

---

## 📝 Test Checklist

### Backend Tests:
- [ ] Backend starts without errors
- [ ] Health endpoint works: `GET /health`
- [ ] Auth endpoints work
- [ ] ML app token endpoint works
- [ ] Products endpoints work
- [ ] No 500 errors in logs

### Frontend Tests:
- [ ] Frontend starts without errors
- [ ] Can register new user
- [ ] Can login with user
- [ ] Can navigate to Accounts page
- [ ] Can navigate to Products page
- [ ] Statistics cards load
- [ ] Can sync products
- [ ] Product list displays
- [ ] Search works
- [ ] Filters work
- [ ] Sorting works
- [ ] Pagination works

### Database Tests:
- [ ] MongoDB running
- [ ] Product collection created
- [ ] Products stored after sync
- [ ] Indexes created
- [ ] No duplicate products

### Integration Tests:
- [ ] Full sync workflow works
- [ ] Products persist after page reload
- [ ] Multiple accounts supported
- [ ] User isolation (can't see other users' products)

---

## 🔗 Useful URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:5173` | Frontend app |
| `http://localhost:3011` | Backend API |
| `http://localhost:3011/health` | Health check |
| `http://localhost:3011/api-docs` | API docs |
| `http://localhost:27017` | MongoDB |
| `http://localhost:6379` | Redis |

---

## 📚 Related Documentation

- Main docs: `GETTING_STARTED.md`
- Product implementation: `PRODUCT_IMPLEMENTATION.md`
- Testing guide: `TESTING_INTEGRATION.md`
- Next steps: `PROXIMOS_PASSOS.md`

---

## 💡 Tips

1. **Keep browser DevTools open** (F12) to see any errors
2. **Watch backend logs** for API call details
3. **Use MongoDB Compass** to inspect database
4. **Postman** can help test API endpoints
5. **Clear cache** if styles/images don't update

---

## ⏭️ Next Session

When you restart in the next session:

```bash
# 1. Navigate to project
cd "E:\Paulo ML\projeto-sass"

# 2. Start services (without npm run dev to avoid freezing)
# Start backend manually
cd backend && npm start

# Start frontend manually in another terminal
cd frontend && npm run dev

# 3. Test products page
# Login → Accounts → Click Products button

# 4. Try syncing products
# Click "Sync Products" button
```

---

**Status**: Ready for testing ✅  
**Last Updated**: January 29, 2026
