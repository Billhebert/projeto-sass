# 🐳 Docker Troubleshooting Guide - FIXED

## ✅ Issue Resolved!

The Dockerfile has been completely rewritten to use a **simpler, more reliable approach**.

## 🚀 Quick Start (Run in WSL Terminal)

```bash
cd /mnt/e/Paulo\ ML/projeto-sass

# Clean everything
docker compose down -v

# Remove old images
docker rmi $(docker images -q projeto-sass-api 2>/dev/null) 2>/dev/null || true

# Build fresh image
docker compose build --no-cache api

# Start everything
docker compose up -d

# Check status
docker compose ps
```

---

## ✅ Expected Output

```
NAME                     STATUS
projeto-sass-mongo       Healthy
projeto-sass-redis       Healthy
projeto-sass-api         Up
projeto-sass-nginx       Up
```

Then access:
- **Dashboard**: http://localhost
- **API Health**: http://localhost/api/health

---

## 🔍 What Changed

### Old Approach (Complicated - Failed)
```dockerfile
FROM node:18-alpine as builder
  # Install all deps
  # Build frontend
  # RUN npm run build  ← Failed here!

FROM node:18-alpine
  COPY --from=builder /app/frontend/dist ./frontend/dist  ← Not found!
```

### New Approach (Simple - Works!)
```dockerfile
FROM node:18-alpine
  # Install backend deps
  # Copy backend code
  COPY frontend/dist ./frontend/dist  ← Uses pre-built local dist
```

---

## 📝 Important Notes

### Frontend Build Workflow

The frontend `dist/` folder is **pre-built locally** and committed to git.

If you update the React code, rebuild it:

```bash
# From project root
npm run frontend:build

# Or manually
cd frontend && npm run build && cd ..

# Then rebuild Docker
docker compose build --no-cache api
docker compose up -d
```

### Why This Approach?

✅ **Simpler** - Single stage build, faster
✅ **More Reliable** - No npm cache issues in Docker
✅ **Faster Iteration** - Build frontend once, deploy multiple times
✅ **Production Standard** - CI/CD builds frontend, Docker packages it

---

## 🚨 Troubleshooting

### Still seeing "dist not found"?

```bash
# Force complete rebuild
docker system prune -a
docker compose build --no-cache api
docker compose up -d
```

### API won't start?

```bash
# Check logs
docker compose logs api

# If it's still using old image:
docker rmi $(docker images -q projeto-sass-api)
docker compose build --no-cache api
docker compose up -d
```

### Port already in use?

```bash
# Check what's using port 3000
netstat -an | grep 3000

# Kill the process or use different port in docker-compose.yml
```

---

## 🎯 Summary

**The fix is simple**: Use the pre-built frontend instead of trying to build it inside Docker.

Just run the commands at the top and your app will be running! 🚀

