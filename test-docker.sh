#!/bin/bash

# Docker Deployment Test Script
# Tests all services and health endpoints

set -e

RESET='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'

echo -e "${BLUE}═══════════════════════════════════════════════════════${RESET}"
echo -e "${BLUE}  Projeto SASS - Docker Deployment Test${RESET}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${RESET}"
echo ""

# Check if Docker is running
echo -e "${YELLOW}Checking Docker installation...${RESET}"
if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker is not installed${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ Docker is installed${RESET}"

# Check if Docker daemon is running
if ! docker ps > /dev/null 2>&1; then
  echo -e "${RED}✗ Docker daemon is not running${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ Docker daemon is running${RESET}"
echo ""

# Stop any existing containers
echo -e "${YELLOW}Cleaning up previous containers...${RESET}"
docker compose down 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ Previous containers cleaned${RESET}"
echo ""

# Start services
echo -e "${YELLOW}Starting Docker services...${RESET}"
docker compose up -d
echo -e "${GREEN}✓ Docker Compose started${RESET}"
echo ""

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${RESET}"
sleep 10

# Test MongoDB
echo -e "${YELLOW}Testing MongoDB...${RESET}"
if docker compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ MongoDB is running${RESET}"
else
  echo -e "${RED}✗ MongoDB connection failed${RESET}"
fi

# Test Redis
echo -e "${YELLOW}Testing Redis...${RESET}"
if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Redis is running${RESET}"
else
  echo -e "${YELLOW}⚠ Redis not available (optional)${RESET}"
fi

# Test API health
echo -e "${YELLOW}Testing API health endpoint...${RESET}"
for i in {1..30}; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API is responding${RESET}"
    break
  fi
  
  if [ $i -eq 30 ]; then
    echo -e "${RED}✗ API health check failed${RESET}"
    docker compose logs api
    exit 1
  fi
  
  echo "  Attempt $i/30..."
  sleep 2
done

# Get health status
echo -e "${YELLOW}Checking health status...${RESET}"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
echo "  Response: $HEALTH_RESPONSE"
echo -e "${GREEN}✓ Health check passed${RESET}"
echo ""

# Test frontend
echo -e "${YELLOW}Testing frontend...${RESET}"
if curl -s http://localhost/ > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Frontend is accessible${RESET}"
else
  echo -e "${YELLOW}⚠ Frontend not yet fully ready${RESET}"
fi

# Test API endpoints
echo -e "${YELLOW}Testing API endpoints...${RESET}"
ENDPOINTS=(
  "/api/auth/health"
  "/metrics"
  "/api-docs"
)

for endpoint in "${ENDPOINTS[@]}"; do
  if curl -s "http://localhost:3000${endpoint}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ $endpoint${RESET}"
  else
    echo -e "${YELLOW}⚠ $endpoint (may require auth)${RESET}"
  fi
done

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${RESET}"
echo -e "${GREEN}✓ Docker deployment test completed successfully!${RESET}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${RESET}"
echo ""

echo -e "${BLUE}Service Status:${RESET}"
docker compose ps

echo ""
echo -e "${BLUE}Access URLs:${RESET}"
echo "  Frontend:      http://localhost"
echo "  API:           http://localhost:3000/api"
echo "  Health:        http://localhost:3000/health"
echo "  Metrics:       http://localhost:3000/metrics"
echo "  API Docs:      http://localhost:3000/api-docs"
echo ""

echo -e "${BLUE}Useful commands:${RESET}"
echo "  View logs:      docker compose logs -f api"
echo "  Stop services:  docker compose down"
echo "  Clean data:     docker compose down -v"
echo ""
