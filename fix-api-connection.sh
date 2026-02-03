#!/bin/bash

# Script de Reparo - Erro de Conexão Recusada
# Uso: bash fix-api-connection.sh

echo "======================================"
echo "   REPARANDO ERRO DE CONEXÃO"
echo "======================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Parar tudo
echo -e "${YELLOW}[1] Parando containers...${NC}"
docker-compose down

echo ""
echo -e "${YELLOW}[2] Aguardando...${NC}"
sleep 5

# Limpar volumes (opcional)
echo -e "${YELLOW}[3] Reconstruindo containers...${NC}"
docker-compose up -d --build

echo ""
echo -e "${YELLOW}[4] Aguardando inicialização (30 segundos)...${NC}"
sleep 30

# Verificar status
echo ""
echo -e "${YELLOW}[5] Verificando status...${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${YELLOW}[6] Testando API...${NC}"
sleep 5

if docker exec projeto-sass-nginx curl -s -f http://api:3011/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API está respondendo!${NC}"
    
    # Testar externamente
    echo ""
    echo -e "${YELLOW}[7] Testando acesso externo...${NC}"
    curl -v http://localhost:3011/health 2>&1 | grep -E "HTTP|Connected"
else
    echo -e "${RED}❌ API ainda não responde${NC}"
    echo ""
    echo "Verificando logs..."
    docker logs projeto-sass-api
fi

echo ""
echo -e "${GREEN}Reparo concluído!${NC}"
