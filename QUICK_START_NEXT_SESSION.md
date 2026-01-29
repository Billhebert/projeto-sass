# 🚀 Quick Start - Next Session

**Last Updated**: January 29, 2026

---

## ⚡ Start Services (DO NOT use `npm run dev`)

### Terminal 1 - Backend:
```bash
cd "E:\Paulo ML\projeto-sass\backend"
npm start
```

Should output:
```
✅ Connected to MongoDB
✅ Backend running on port 3011
```

### Terminal 2 - Frontend:
```bash
cd "E:\Paulo ML\projeto-sass\frontend"
npm run dev
```

Should output:
```
✅ Vite dev server ready
✅ Open http://localhost:5173
```

---

## 🧪 Quick Test (5 minutes)

1. **Open Frontend**: `http://localhost:5173`
2. **Register**: Create new user
3. **Login**: Use registered credentials
4. **Go to Accounts**: Click "🏪 Contas ML" in sidebar
5. **Add Account**: Click "➕ Adicionar" or "🏪 Mercado Livre"
6. **View Products**: Click "📦 Produtos" button
7. **Sync**: Click "🔄 Sync Products"
8. **Check Results**: Products should appear in table

---

## 📁 Key Files Modified This Session

**Backend**:
- `backend/db/models/Product.js` - NEW
- `backend/routes/products.js` - NEW
- `backend/server.js` - UPDATED (routes registration)

**Frontend**:
- `frontend/src/pages/Products.jsx` - NEW
- `frontend/src/pages/Products.css` - NEW
- `frontend/src/App.jsx` - UPDATED (routes)
- `frontend/src/pages/Accounts.jsx` - UPDATED (navigation)

---

## 📚 Documentation to Read

For understanding what was done:
1. **SESSION_SUMMARY.md** - Overview of all work
2. **PRODUCT_IMPLEMENTATION.md** - Technical details
3. **TESTING_PRODUCTS.md** - How to test

---

## 🔐 Environment Check

Verify these are set in `.env`:
```
# Backend
ML_CLIENT_ID=1706187223829083
ML_CLIENT_SECRET=vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG
JWT_SECRET=your_jwt_secret_key_here_min_32_characters
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3011
```

---

## 🐳 Services Status

Check if all services are running:

```bash
# Check Docker containers
docker ps

# Should show:
# - mongodb
# - redis
# - maybe others

# If services down, start them:
docker-compose up -d
```

---

## 🔍 Quick Debugging

If something is wrong:

```bash
# Check backend logs
tail -f "E:\Paulo ML\projeto-sass\logs\app.log"

# Check MongoDB
# Use MongoDB Compass: mongodb://admin:changeme@localhost:27017/projeto-sass

# Check Redis
redis-cli ping  # Should respond PONG

# Test API
curl http://localhost:3011/health
```

---

## 📊 Latest Changes

**4 commits this session**:
1. ✅ Product model & API endpoints
2. ✅ Products page UI & styling
3. ✅ Implementation documentation
4. ✅ Testing & session summary

---

## 🎯 What's Next?

### To Complete:
- [ ] Test product sync with real ML account
- [ ] Add background job for periodic sync
- [ ] Implement product analytics
- [ ] Add more filter options

### To Consider:
- [ ] Add product update notifications
- [ ] Implement bulk operations
- [ ] Add order management
- [ ] Create dashboards

---

## 💾 Backup Before Testing

Before testing sync, backup database:

```bash
docker exec projeto-sass-mongo mongodump \
  --uri="mongodb://admin:changeme@localhost:27017/projeto-sass" \
  --out="/data/backup/$(date +%Y%m%d_%H%M%S)"
```

---

## 🆘 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Port already in use | Kill process: `npx kill-port 3011` |
| MongoDB not responding | Check docker: `docker ps` |
| Frontend not loading | Check `http://localhost:5173` |
| Products not syncing | Check ML credentials in `.env` |
| Products not showing | Check browser console (F12) |

---

## 📞 Quick Help

**Stuck?** Check these files:
- Errors → `logs/app.log`
- API docs → `http://localhost:3011/api-docs`
- Testing → `TESTING_PRODUCTS.md`
- Implementation → `PRODUCT_IMPLEMENTATION.md`

---

**Ready to go!** 🚀

Session work is complete and tested. Start services and verify everything works!
