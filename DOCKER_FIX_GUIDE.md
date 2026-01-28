# 🐳 Docker Troubleshooting Guide

## Current Issue: Vite Not Found in Builder Stage

The Dockerfile has been fixed. The issue was that frontend `node_modules` weren't being installed before trying to run `npm run build`.

## ✅ How to Fix (Run in WSL Terminal)

### Quick Clean Rebuild

```bash
cd /mnt/e/Paulo\ ML/projeto-sass

# Step 1: Remove everything
docker compose down -v

# Step 2: Remove old images
docker rmi $(docker images -q projeto-sass-api 2>/dev/null) 2>/dev/null || true

# Step 3: Rebuild with no cache (takes 2-3 minutes)
docker compose build --no-cache api

# Step 4: Start services
docker compose up -d

# Step 5: Check status
docker compose ps
```

### Expected Build Output

You should see something like this (in order):

```
 => [builder 5/7] RUN npm ci                     ✓ (root deps)
 => [builder 6/7] WORKDIR /app/frontend          ✓
 => [builder 7/7] RUN npm ci                     ✓ (frontend deps)
 => [builder 8/7] COPY frontend . .              ✓
 => [builder 9/7] RUN npm run build              ✓ (vite build)
 => [stage-1 7/9] COPY --from=builder /app/frontend/dist ./frontend/dist ✓
```

---

## 📊 What's Happening in the Fixed Dockerfile

```dockerfile
# Builder Stage - Build the React app
FROM node:18-alpine as builder

WORKDIR /app

# 1. Install root npm packages first
COPY package*.json ./
RUN npm ci

# 2. Copy and install frontend packages separately
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci                    ← Installs vite, recharts, etc.

# 3. Copy frontend source code
COPY frontend . .

# 4. Build with vite (now available)
RUN npm run build
```

---

## 🔍 Debugging Tips

### If build still fails:

```bash
# Check Docker logs
docker compose logs api

# Rebuild with verbose output
docker compose build --no-cache api --progress=plain

# Check what's in the image
docker run -it projeto-sass-api:latest sh
```

### If API won't start:

```bash
# View all logs
docker compose logs

# Restart specific service
docker compose restart api

# Check if port 3000 is available
netstat -an | grep 3000
```

### If you see "OCI runtime create failed":

This means the old image still exists. Run:

```bash
docker system prune -a
docker compose build --no-cache api
docker compose up -d
```

---

## ✨ Once Everything Works

You should see:

```
$ docker compose ps

NAME                     STATUS
projeto-sass-mongo       Healthy
projeto-sass-redis       Healthy
projeto-sass-api         Up (Healthy after 10s)
projeto-sass-nginx       Up
```

Then access:
- **Dashboard**: http://localhost
- **API**: http://localhost/api/health

---

## 📝 File Changes Made

✅ **Dockerfile**: Fixed builder stage to properly install both root and frontend dependencies
✅ **fix-docker.sh**: Script to automate the rebuild process
✅ **This guide**: Troubleshooting steps

---

## 🚀 Next Steps

1. Run the rebuild commands above
2. Wait for build to complete
3. Check `docker compose ps`
4. Try accessing http://localhost
5. If issues persist, share the output of `docker compose logs api`

---

Good luck! The app should be running shortly. 🎉
