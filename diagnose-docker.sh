#!/bin/bash

# Script de Diagnóstico - Erro de Conexão Recusada na API
# Uso: bash diagnose-docker.sh

echo "======================================"
echo "   DIAGNÓSTICO DE ERRO NA API"
echo "   erro: net::ERR_CONNECTION_REFUSED"
echo "======================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar se Docker está rodando
echo -e "${YELLOW}[1] Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado!${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Docker encontrado${NC}"
fi

echo ""

# 2. Verificar containers rodando
echo -e "${YELLOW}[2] Verificando containers em execução...${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""

# 3. Verificar container específico da API
echo -e "${YELLOW}[3] Verificando container 'projeto-sass-api'...${NC}"
if docker ps | grep -q "projeto-sass-api"; then
    echo -e "${GREEN}✓ Container está RODANDO${NC}"
    
    # Pega ID do container
    CONTAINER_ID=$(docker ps -q -f name=projeto-sass-api)
    
    # Verifica se está saudável
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_ID 2>/dev/null)
    if [ ! -z "$HEALTH" ]; then
        echo "Status de saúde: $HEALTH"
    fi
else
    echo -e "${RED}❌ Container NÃO está rodando!${NC}"
    echo "Tentando iniciar containers..."
    docker-compose up -d
fi

echo ""

# 4. Verificar logs do container
echo -e "${YELLOW}[4] Últimas linhas dos logs da API...${NC}"
docker logs --tail=20 projeto-sass-api

echo ""

# 5. Testar conectividade interna
echo -e "${YELLOW}[5] Testando conectividade interna (de dentro do container nginx)...${NC}"
if docker exec projeto-sass-nginx curl -s -f http://api:3011/health &> /dev/null; then
    echo -e "${GREEN}✓ API respondendo internamente${NC}"
else
    echo -e "${RED}❌ API NÃO respondendo internamente${NC}"
    echo "Testando conexão raw..."
    docker exec projeto-sass-nginx nc -zv api 3011 2>&1
fi

echo ""

# 6. Verificar variáveis de ambiente
echo -e "${YELLOW}[6] Verificando variáveis de ambiente do container...${NC}"
docker exec projeto-sass-api env | grep -E "PORT|NODE_ENV|MONGODB|REDIS" || echo "Sem vars de env"

echo ""

# 7. Verificar banco de dados
echo -e "${YELLOW}[7] Testando conexão com MongoDB...${NC}"
if docker exec projeto-sass-mongo mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
    echo -e "${GREEN}✓ MongoDB respondendo${NC}"
else
    echo -e "${RED}❌ MongoDB NÃO respondendo${NC}"
fi

echo ""

# 8. Verificar redis
echo -e "${YELLOW}[8] Testando conexão com Redis...${NC}"
if docker exec projeto-sass-redis redis-cli -a changeme ping &> /dev/null; then
    echo -e "${GREEN}✓ Redis respondendo${NC}"
else
    echo -e "${RED}❌ Redis NÃO respondendo${NC}"
fi

echo ""

# 9. Verificar Docker network
echo -e "${YELLOW}[9] Verificando rede Docker...${NC}"
docker network inspect projeto-sass_internal | grep -A 5 '"Containers"'

echo ""

# 10. Resumo
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "${YELLOW}   RESUMO DO DIAGNÓSTICO${NC}"
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo ""
echo "Se a API não está respondendo, tente:"
echo ""
echo -e "${YELLOW}1. Verificar se há erros nos logs:${NC}"
echo "   docker logs -f projeto-sass-api"
echo ""
echo -e "${YELLOW}2. Reiniciar todos os containers:${NC}"
echo "   docker-compose restart"
echo ""
echo -e "${YELLOW}3. Reconstruir a imagem do backend:${NC}"
echo "   docker-compose up -d --build api"
echo ""
echo -e "${YELLOW}4. Se tudo falhar, reiniciar tudo:${NC}"
echo "   docker-compose down && docker-compose up -d"
echo ""
