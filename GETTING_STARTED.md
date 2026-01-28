# 🚀 Projeto SASS - Local Development Quick Start

## ✅ Your Application is Now Running!

### Backend Status: ✅ RUNNING
- **URL**: http://localhost:3011
- **Health**: http://localhost:3011/health
- **API Docs**: http://localhost:3011/api-docs
- **WebSocket**: ws://localhost:3011/ws
- **Environment**: Development
- **Port**: 3011

### Database Status: ✅ RUNNING (Docker)
- **MongoDB**: `localhost:27017`
  - User: `admin`
  - Password: `changeme`
  - Database: `projeto-sass`
  - Connected: ✅ YES
- **Redis**: `localhost:6379`
  - Password: `changeme`
  - Connected: ✅ YES

### Frontend Status: Starting (or use separate terminal)
- **URL**: http://localhost:5173
- **Port**: 5173
- **Hot Reload**: Enabled ✅

---

## 📋 Environment Setup

Your `.env` file has been created with the following configuration:

```env
NODE_ENV=development
LOG_LEVEL=debug
MONGODB_URI=mongodb://admin:changeme@localhost:27017/projeto-sass?authSource=admin
REDIS_URL=redis://:changeme@localhost:6379
ML_CLIENT_ID=1706187223829083
ML_CLIENT_SECRET=vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG
JWT_SECRET=your_jwt_secret_key_here_min_32_characters
```

---

## 🎯 What to Do Next

### Option 1: Keep Both Servers Running in Same Terminal
```bash
npm run dev
# Both backend and frontend start together
```

### Option 2: Run Backend and Frontend in Separate Terminals

**Terminal 1 - Backend (already running):**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

### Option 3: Just Run Backend (if frontend not needed)
```bash
npm run dev:backend
```

---

## 🔍 Verify Everything is Working

### 1. Check Backend Health
```bash
curl http://localhost:3011/health
```

Expected response:
```json
{
  "status": "ok",
  "environment": "development",
  "mongodb": {
    "connected": true,
    "database": "projeto-sass"
  }
}
```

### 2. Check Available API Endpoints
```bash
curl http://localhost:3011/api-docs
```

Opens Swagger UI with all available endpoints.

### 3. Test Authentication
```bash
curl -X POST http://localhost:3011/api/auth/ml-refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"test"}'
```

### 4. List ML Accounts
```bash
curl http://localhost:3011/api/ml-accounts
```

---

## 📊 Available API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/ml-callback` | OAuth token exchange |
| POST | `/api/auth/ml-refresh` | Token refresh |
| GET | `/api/accounts` | List all accounts |
| GET | `/api/ml-accounts` | List Mercado Livre accounts |
| POST | `/api/sync/account/:id` | Sync specific account |
| POST | `/api/webhooks/ml` | Handle ML webhooks |
| GET | `/health` | Health check |
| GET | `/metrics` | Application metrics |

---

## 🧪 Running Tests

### Frontend Unit Tests
```bash
npm run test:frontend
```

### Frontend with Coverage
```bash
npm run test:frontend:coverage
```

### E2E Tests with Cypress
```bash
npm run cypress:open        # Interactive mode
npm run cypress:run         # Headless mode
```

### Full E2E Test Suite
```bash
npm run e2e  # Starts app + runs Cypress tests
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `LOCAL_DEV_ONLY.md` | Local development setup guide |
| `QUICKSTART.md` | Quick reference for common commands |
| `TESTING_INTEGRATION.md` | Comprehensive testing guide |
| `DEPLOYMENT_GUIDE.md` | Production deployment instructions |
| `SECURITY.md` | Security implementation details |
| `.env.example` | Example environment variables |
| `docker-compose.dev.yml` | Database containers only |

---

## 🛠️ Database Management

### Start Database Containers
```bash
npm run db:start
```

### Stop Database Containers
```bash
npm run db:stop
```

### View Database Logs
```bash
npm run db:logs
```

### Clean Database (remove volumes)
```bash
npm run db:clean
```

---

## 🔧 Environment Validation

The application automatically validates your environment on startup:

```bash
npm run validate-env
```

This checks:
- ✅ All required environment variables are set
- ✅ MongoDB connection is configured
- ✅ Redis connection is configured
- ✅ Mercado Livre credentials are present
- ✅ JWT secret is configured

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 3011 is in use
lsof -i :3011

# Kill process using port 3011
kill -9 <PID>

# Try starting again
npm run dev:backend
```

### Frontend won't start
```bash
# Check if port 5173 is in use
lsof -i :5173

# Kill process using port 5173
kill -9 <PID>

# Try starting again
npm run dev:frontend
```

### MongoDB connection error
```bash
# Check if containers are running
docker compose -f docker-compose.dev.yml ps

# Restart containers
docker compose -f docker-compose.dev.yml restart

# Check logs
npm run db:logs
```

### Port already in use errors
```bash
# List all Node processes
ps aux | grep node

# Kill specific process
kill -9 <PID>

# Or change ports in .env
API_PORT=3012        # Change backend port
FRONTEND_PORT=5174   # Change frontend port
```

---

## 📡 Useful Commands

```bash
# Full development setup
npm run dev

# Validate environment only
npm run validate-env

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Run test endpoints verification
npm run verify

# Build frontend for production
npm run frontend:build

# Preview production build
npm run frontend:preview

# View database logs
npm run db:logs

# Clean database volumes
npm run db:clean

# Git push
git push
```

---

## 🎓 Learning Resources

### Backend
- Express.js REST API
- MongoDB with Mongoose
- WebSocket support
- JWT authentication
- Rate limiting & security

### Frontend
- React 18+ with Vite
- Hot Module Replacement (HMR)
- Responsive design
- Testing with Vitest & Cypress

### Database
- MongoDB for persistent data
- Redis for caching
- MongoDB Memory Server for tests

---

## 📝 Next Steps

1. **Customize Environment** (if needed)
   - Edit `.env` file with your credentials
   - Update Mercado Livre OAuth credentials
   - Configure email service
   - Add third-party API keys

2. **Add Features**
   - Create new API endpoints
   - Add React components
   - Implement webhooks
   - Add scheduled jobs

3. **Run Tests**
   - Write unit tests
   - Create integration tests
   - Run E2E tests with Cypress

4. **Deploy to Production**
   - Follow `DEPLOYMENT_GUIDE.md`
   - Set up CI/CD with GitHub Actions
   - Configure environment secrets
   - Deploy to your hosting provider

---

## 💡 Tips

- Use **separate terminals** for better visibility:
  - Terminal 1: `npm run dev:backend`
  - Terminal 2: `npm run dev:frontend`
  - Terminal 3: For git commands and tests

- **Logs are color-coded** for easy reading:
  - Green: Success ✓
  - Yellow: Warnings ⚠
  - Red: Errors ✗
  - Blue: Info ℹ

- **Frontend auto-reloads** when you change files (HMR)

- **Backend auto-reloads** when you change files (nodemon)

- **API documentation** is always available at `/api-docs`

---

## 🚀 You're All Set!

Your Projeto SASS development environment is fully configured and running.

**Happy coding!** 🎉

For questions or issues, check the documentation files or GitHub issues.
