#!/bin/bash

# Projeto SASS - Docker Fix Script
# Run this to fix the Docker build issues

echo "🔧 Cleaning up Docker environment..."

# Remove all containers
docker compose down -v

echo "📦 Removing old images..."
docker rmi $(docker images -q projeto-sass-api 2>/dev/null) 2>/dev/null || true

echo "🏗️  Rebuilding Docker image (this may take 2-3 minutes)..."
docker compose build --no-cache api

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 5

echo "✅ Checking status..."
docker compose ps

echo ""
echo "📊 Service Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose ps --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "🌐 Access your application:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Dashboard:   http://localhost"
echo "API Health:  http://localhost/api/health"
echo ""

# Check if API is healthy
echo "🏥 Checking API health..."
sleep 3
curl -s http://localhost/api/health | jq . || echo "API not ready yet, it may take 10-15 seconds..."

echo ""
echo "✨ Done! If you see errors above, run: docker compose logs api"
