# 🚀 Quick Start Servers - Phase 6 Complete

## Backend Server

```bash
cd backend
npm install  # if needed
npm start
```

Server will run on: `http://localhost:3011`
API endpoints: `http://localhost:3011/api/`

## Frontend Server

```bash
cd frontend
npm install  # if needed
npm run dev
```

Frontend will run on: `http://localhost:5173`

## Test the Application

1. **Access Frontend**: http://localhost:5173
2. **Login**: Use your credentials
3. **Navigate**: Use Sidebar to access new pages:
   - Produtos (v6) → Produtos
   - Produtos (v6) → Categorias
   - Vendas (v6) → Pedidos
   - Vendas (v6) → Envios
   - Vendas (v6) → Avaliações
   - Atendimento (v6) → Perguntas

## Available Routes

### Phase 6 New Pages
- `/products-list` - ItemsList (Products with CRUD)
- `/orders-list` - OrdersList (Orders management)
- `/shipping-list` - ShippingList (Shipments & labels)
- `/questions-list` - QuestionsList (Q&A management)
- `/feedback-list` - FeedbackList (Customer reviews)
- `/categories` - CategoriesList (Category browsing)

### Existing Pages
- `/` - Dashboard
- `/orders` - Orders (old version)
- `/shipments` - Shipments (old version)
- `/questions` - Questions (old version)
- `/reviews` - Reviews (old version)
- And 30+ more...

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3011 (backend)
lsof -ti:3011 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Dependencies Not Installed
```bash
cd backend && npm install
cd frontend && npm install
```

### Build Errors
```bash
cd frontend && npm run build
```

### Clear Cache
```bash
# Frontend
rm -rf frontend/node_modules frontend/.vite
npm install --prefix frontend

# Backend
rm -rf backend/node_modules
npm install --prefix backend
```

## Next Steps

1. ✅ Start both servers
2. ✅ Test login/authentication
3. ✅ Navigate to new pages using Sidebar
4. ✅ Test API connections (check browser console)
5. ✅ Verify data loading
6. ⏳ Implement real API integration
7. ⏳ Add cache layer (localStorage)
8. ⏳ Create dashboard improvements

---

**Status**: Frontend 85% Complete - All routes integrated
**Next Phase**: Real API testing & data integration
