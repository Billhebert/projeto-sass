#!/bin/bash

# Script Quick Fix - Rebuild Frontend Only
# Execute: bash rebuild-frontend.sh

echo "======================================"
echo "   REBUILD FRONTEND"
echo "======================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📋 Passo 1: Parando frontend antigo${NC}"
docker compose down -s projeto-sass-frontend 2>/dev/null || true

echo ""
echo -e "${BLUE}🔨 Passo 2: Reconstruindo frontend${NC}"
docker compose build --no-cache frontend

echo ""
echo -e "${BLUE}🚀 Passo 3: Iniciando frontend${NC}"
docker compose up -d frontend

echo ""
echo -e "${BLUE}⏳ Aguardando 20 segundos...${NC}"
sleep 20

echo ""
echo -e "${BLUE}📊 Passo 4: Verificando status${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep frontend

echo ""
echo -e "${BLUE}✨ Passo 5: Testando acesso${NC}"
if docker exec projeto-sass-nginx curl -s -f http://frontend:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend está respondendo!${NC}"
else
    echo -e "${RED}❌ Frontend ainda não responde${NC}"
fi

echo ""
echo -e "${GREEN}✅ Rebuild concluído!${NC}"
echo ""
echo "Teste no navegador: https://seu-dominio.com"
echo ""
