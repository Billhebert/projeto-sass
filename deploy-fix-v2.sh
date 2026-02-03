#!/bin/bash

# Script de Deploy - Correção de Erro de Conexão
# Execute na VPS: bash deploy-fix-v2.sh
# Compatível com Docker Compose v2 (docker compose em vez de docker-compose)

echo "======================================"
echo "   DEPLOY - CORRIGINDO ERRO DE API"
echo "   (Docker Compose v2)"
echo "======================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar se está na pasta correta
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Arquivo docker-compose.yml não encontrado!${NC}"
    echo "Execute este script na pasta raiz do projeto"
    exit 1
fi

# Verificar qual versão do docker-compose está disponível
echo -e "${BLUE}🔍 Passo 0: Verificando versão do Docker...${NC}"
echo ""
docker --version
echo ""

if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ Encontrado: docker-compose (v1)${NC}"
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ Encontrado: docker compose (v2)${NC}"
    COMPOSE_CMD="docker compose"
else
    echo -e "${RED}❌ Docker Compose não encontrado!${NC}"
    exit 1
fi

echo ""

echo -e "${BLUE}📋 Passo 1: Verificando status atual${NC}"
echo ""
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo -e "${BLUE}⏹️  Passo 2: Parando containers antigos${NC}"
$COMPOSE_CMD down --remove-orphans

echo ""
echo -e "${BLUE}⏳ Aguardando 5 segundos...${NC}"
sleep 5

echo ""
echo -e "${BLUE}🔨 Passo 3: Reconstruindo imagens${NC}"
$COMPOSE_CMD build --no-cache api nginx

echo ""
echo -e "${BLUE}🚀 Passo 4: Iniciando containers${NC}"
$COMPOSE_CMD up -d --build

echo ""
echo -e "${BLUE}⏳ Passo 5: Aguardando inicialização (40 segundos)${NC}"
for i in {40..1}; do
    echo -ne "\r   Aguardando... ${i}s        "
    sleep 1
done
echo -ne "\r                          \r"

echo ""
echo -e "${BLUE}📊 Passo 6: Verificando status dos containers${NC}"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo -e "${BLUE}🔍 Passo 7: Testando conectividade interna${NC}"
echo ""

if docker exec projeto-sass-nginx curl -s -f http://api:3011/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API está respondendo internamente!${NC}"
else
    echo -e "${YELLOW}⚠️  API ainda não respondendo. Aguardando mais...${NC}"
    sleep 15
    if docker exec projeto-sass-nginx curl -s -f http://api:3011/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API agora está respondendo!${NC}"
    else
        echo -e "${RED}❌ API não respondeu. Verificar logs...${NC}"
    fi
fi

echo ""
echo -e "${BLUE}📋 Passo 8: Exibindo últimos logs da API${NC}"
echo ""
docker logs --tail=30 projeto-sass-api
echo ""

echo -e "${BLUE}✨ Passo 9: Verificando variáveis de ambiente${NC}"
echo ""
docker exec projeto-sass-api env | grep -E "^(NODE_ENV|PORT|API_HOST|MONGODB|REDIS|JWT)" | sort
echo ""

echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}📝 PRÓXIMOS PASSOS:${NC}"
echo ""
echo "1️⃣  Verifique se está funcionando:"
echo "    ${BLUE}curl -v https://seu-dominio.com/api/health${NC}"
echo ""
echo "2️⃣  Se tiver erros, veja logs completos:"
echo "    ${BLUE}docker logs -f projeto-sass-api${NC}"
echo ""
echo "3️⃣  Teste no navegador:"
echo "    ${BLUE}https://seu-dominio.com${NC}"
echo ""

echo -e "${YELLOW}🚨 TROUBLESHOOTING:${NC}"
echo ""
echo "Se a API não responde:"
echo ""
echo "  📋 Ver logs: ${BLUE}docker logs projeto-sass-api${NC}"
echo "  🔄 Reiniciar: ${BLUE}$COMPOSE_CMD restart api${NC}"
echo "  🧹 Limpar: ${BLUE}$COMPOSE_CMD down -v && $COMPOSE_CMD up -d${NC}"
echo ""

echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo ""
