#!/bin/bash

# ============================================
# Projeto SASS - Complete Docker Setup Script
# ============================================
# This script will:
# 1. Build the frontend if needed
# 2. Clean up old Docker images/containers
# 3. Build the Docker image
# 4. Start all services
# 5. Verify everything is working

set -e  # Exit on error

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     Projeto SASS - Docker Setup Script                 ║"
echo "║     Production Ready Full Stack Application            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build Frontend
echo -e "${BLUE}[1/5]${NC} Building React Frontend..."
cd frontend
npm run build > /dev/null 2>&1 || {
  echo -e "${RED}✗ Frontend build failed${NC}"
  exit 1
}
cd ..
echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Step 2: Verify dist folder
echo -e "${BLUE}[2/5]${NC} Verifying frontend dist folder..."
if [ -d "frontend/dist" ] && [ -f "frontend/dist/index.html" ]; then
  echo -e "${GREEN}✓ Frontend dist folder exists${NC}"
else
  echo -e "${RED}✗ Frontend dist folder not found${NC}"
  exit 1
fi

# Step 3: Clean up Docker
echo -e "${BLUE}[3/5]${NC} Cleaning up Docker environment..."
docker compose down -v > /dev/null 2>&1 || true
docker rmi $(docker images -q projeto-sass-api 2>/dev/null) 2>/dev/null || true
echo -e "${GREEN}✓ Docker cleanup complete${NC}"

# Step 4: Build Docker image
echo -e "${BLUE}[4/5]${NC} Building Docker image (this may take 1-2 minutes)..."
if docker compose build --no-cache api > /tmp/docker-build.log 2>&1; then
  echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
  echo -e "${RED}✗ Docker build failed${NC}"
  echo "Build log:"
  tail -50 /tmp/docker-build.log
  exit 1
fi

# Step 5: Start services
echo -e "${BLUE}[5/5]${NC} Starting services..."
docker compose up -d > /dev/null 2>&1
sleep 3

# Verify services
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║               SERVICE STATUS                           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

docker compose ps --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║               ACCESS INFORMATION                       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Dashboard:${NC}  http://localhost"
echo -e "${GREEN}API Health:${NC} http://localhost/api/health"
echo ""

# Test health endpoint
echo -e "${BLUE}Testing API health endpoint...${NC}"
sleep 2
if curl -s http://localhost/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ API is responding${NC}"
else
  echo -e "${YELLOW}⚠ API not ready yet, it may take 10-15 seconds...${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              SETUP COMPLETE! 🎉                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Your application is running! Open http://localhost in your browser."
echo ""
echo "To view logs: docker compose logs api"
echo "To stop:      docker compose down"
echo ""
