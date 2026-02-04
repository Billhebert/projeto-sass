# Quick Start Guide - Projeto SASS

Complete guide for running, testing, and deploying Projeto SASS.

---

## Table of Contents

1. [Local Development](#local-development)
2. [Testing](#testing)
3. [Production Deployment](#production-deployment)
4. [Common Tasks](#common-tasks)
5. [Troubleshooting](#troubleshooting)

---

## Local Development

### Start Services

```bash
cd /root/projeto/projeto-sass
docker compose up -d
```

### Check Services

```bash
docker compose ps
```

### View Logs

```bash
# API logs
docker compose logs api -f

# Frontend logs
docker compose logs frontend -f

# All services
docker compose logs -f
```

### Stop Services

```bash
docker compose down
```

---

## Testing

### Register a User

```bash
TIMESTAMP=$(date +%s)
curl -X POST http://localhost:3011/api/user/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test${TIMESTAMP}@example.com\",
    \"password\": \"TestPassword123!\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }"
```

### Test Email Verification Token

```bash
# Get token from database
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme --quiet <<'EOF'
use("projeto-sass");
db.users.findOne(
  { emailVerified: false },
  { emailVerificationToken: 1, email: 1 }
);
EOF
```

### Test API Health

```bash
curl -s http://localhost:3011/health | jq .
```

### Test Frontend

```bash
# Open browser
http://localhost:5173
```

### Test Admin Panel (Local)

```bash
# Admin panel
http://localhost/admin

# Admin token (from .env)
test-admin-token-secret-2026
```

---

## Production Deployment

### Preparation

```bash
# Review deployment guide
cat DEPLOYMENT_RUNBOOK.md

# Copy production environment file
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

### Deploy

```bash
# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose ps
curl https://api.vendata.com.br/health
```

### Post-Deployment

```bash
# Test registration
curl -X POST https://api.vendata.com.br/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Check logs
docker compose logs api | tail -50
```

---

## Common Tasks

### Add Admin User

```bash
# Via database
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme --quiet <<'EOF'
use("projeto-sass");
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "admin" } }
);
EOF

# Verify
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme --quiet <<'EOF'
use("projeto-sass");
db.users.findOne({ email: "user@example.com" }, { email: 1, role: 1 });
EOF
```

### Change ADMIN_TOKEN

```bash
# Generate new token
openssl rand -base64 32

# Update .env
nano .env

# Add/update ADMIN_TOKEN=<new-token>

# Restart API
docker compose restart api
```

### Reset Database

```bash
# WARNING: This deletes all data
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme --quiet <<'EOF'
use("projeto-sass");
db.users.deleteMany({});
db.accounts.deleteMany({});
EOF

# Verify
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme --quiet <<'EOF'
use("projeto-sass");
db.users.countDocuments({});
EOF
```

### Rebuild Frontend

```bash
cd frontend
npm run build
docker compose restart frontend
```

### View Database

```bash
# Access MongoDB directly
docker compose exec mongo mongosh --authenticationDatabase admin -u admin -p changeme

# Or via UI (Mongo Express)
# http://localhost:8081
```

### Check Performance

```bash
# Docker stats
docker stats

# API metrics
curl -s http://localhost:3011/health | jq .memory

# Database size
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme --quiet <<'EOF'
use("projeto-sass");
db.stats();
EOF
```

---

## Troubleshooting

### API Won't Start

```bash
# Check logs
docker compose logs api | tail -50

# Check if port is in use
lsof -i :3011

# Restart
docker compose restart api
```

### Frontend Not Loading

```bash
# Check logs
docker compose logs frontend

# Rebuild
docker compose up -d --build frontend

# Clear browser cache (Ctrl+Shift+Delete)
```

### Database Connection Issues

```bash
# Test connection
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Check logs
docker compose logs mongo | tail -20

# Restart
docker compose restart mongo
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3011
lsof -i :5173

# Kill process
kill -9 <PID>

# Or change docker compose ports
nano docker-compose.yml
```

### High Memory Usage

```bash
# Check which service
docker stats

# Reduce resource limits in docker-compose.yml
# Restart
docker compose restart api
```

### Email Not Sending

```bash
# Check current mode
grep EMAIL_MODE .env

# Check logs
docker compose logs api | grep -i email

# If using provider:
# 1. Verify credentials in .env
# 2. Check provider dashboard
# 3. Review EMAIL_PROVIDER_SETUP.md
```

---

## File Reference

### Critical Files

- `.env` - Local development environment
- `.env.production` - Production environment
- `docker-compose.yml` - Local development setup
- `docker-compose.prod.yml` - Production setup
- `nginx.prod.conf` - Production Nginx config

### Configuration Files

- `backend/config/rbac.js` - Role definitions
- `backend/middleware/rbac.js` - Auth middleware
- `frontend/src/components/ProtectedRoute.jsx` - Frontend auth

### Database

- `backend/db/models/User.js` - User schema
- Collections auto-created on first run

### Documentation

- `DEPLOYMENT_RUNBOOK.md` - How to deploy
- `EMAIL_PROVIDER_SETUP.md` - Email setup
- `ROLES_PERMISSIONS_API.md` - Roles reference
- `SCALABILITY_KUBERNETES.md` - Kubernetes setup

---

## Useful Shortcuts

### Connect to Services

```bash
# MongoDB shell
docker compose exec mongo mongosh --authenticationDatabase admin -u admin -p changeme

# Redis CLI
docker compose exec redis redis-cli

# Backend container
docker compose exec api bash
```

### Database Operations

```bash
# Count users
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme --quiet <<'EOF'
use("projeto-sass");
db.users.countDocuments({});
EOF

# Find user by email
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme --quiet <<'EOF'
use("projeto-sass");
db.users.findOne({ email: "test@example.com" });
EOF

# Update user role
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme --quiet <<'EOF'
use("projeto-sass");
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { role: "admin" } }
);
EOF
```

### View Logs

```bash
# Last 50 lines
docker compose logs api | tail -50

# Follow live logs
docker compose logs api -f

# Filter logs
docker compose logs api | grep ERROR

# All services
docker compose logs | tail -100
```

---

## Environment Variables Quick Reference

### Local Development (.env)

```
NODE_ENV=production
MONGODB_URI=mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin
JWT_SECRET=T2pD8F3O4Gc07hlniseEqeEczhjlAl9zyitfruCngeo=
EMAIL_MODE=test
ADMIN_TOKEN=test-admin-token-secret-2026
```

### Production (.env.production)

```
NODE_ENV=production
DOMAIN=vendata.com.br
MONGODB_URI=mongodb://username:password@mongo:27017/projeto-sass?authSource=admin
JWT_SECRET=<64-char-random-string>
EMAIL_MODE=test  # Change to gmail/sendgrid/ses when ready
ADMIN_TOKEN=<random-token>
```

---

## Performance Tips

### Database

- Use indexed fields in queries
- Monitor collection sizes with `db.stats()`
- Backup daily to separate storage

### Frontend

- Clear browser cache if changes don't appear
- Use production build for testing
- Monitor bundle size with `npm run build`

### API

- Monitor logs for errors
- Check response times
- Use health endpoint to monitor
- Adjust rate limiting if needed

### Docker

- Use `docker system prune` to free space
- Monitor memory with `docker stats`
- Restart services if memory leaks detected

---

## Next Steps

### First Time Setup

1. Run `docker compose up -d`
2. Test registration at http://localhost:5173
3. Check admin panel at http://localhost/admin
4. Read DEPLOYMENT_RUNBOOK.md for production

### Before Production

1. Change all default passwords
2. Generate secure JWT_SECRET
3. Setup email provider
4. Configure SSL certificate
5. Review security checklist in runbook

### Going Live

1. Follow DEPLOYMENT_RUNBOOK.md
2. Test all endpoints
3. Setup monitoring and backups
4. Configure alert thresholds
5. Train support team

---

## Getting Help

### Common Issues

- See Troubleshooting section above
- Check Docker logs: `docker compose logs`
- Review error messages in browser console

### Documentation

- DEPLOYMENT_RUNBOOK.md - Deployment help
- EMAIL_PROVIDER_SETUP.md - Email configuration
- ROLES_PERMISSIONS_API.md - API reference
- SCALABILITY_KUBERNETES.md - Scaling help

### Local Testing

- Postman collection (create in future)
- API health: GET /health
- Admin panel: POST /api/admin/stats with x-admin-token

---

## Quick Commands

```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# View all logs
docker compose logs -f

# Rebuild images
docker compose build

# Reset database
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme --quiet < /dev/null

# Clean up
docker system prune -a

# Production start
docker compose -f docker-compose.prod.yml up -d

# Production stop
docker compose -f docker-compose.prod.yml down
```

---

**Last Updated**: February 4, 2026
**Version**: 1.0
**Status**: ✓ Production Ready
