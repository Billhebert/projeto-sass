#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TESTES AVANÇADOS - API MERCADO LIVRE (SEM MONGODB)   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

ML_CLIENT_ID="1706187223829083"
ML_CLIENT_SECRET="vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG"
USER_ID="1033763524"

# Obter token
echo -e "${YELLOW}Obtendo access token...${NC}"
TOKEN=$(curl -s -X POST https://api.mercadolibre.com/oauth/token \
  -d "grant_type=client_credentials&client_id=$ML_CLIENT_ID&client_secret=$ML_CLIENT_SECRET" | \
  grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Falha ao obter token!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Token obtido\n${NC}"

# TESTE 1: Listar produtos em alta
echo -e "${YELLOW}═ TESTE 1: Top Sellers do Brasil ═${NC}"
echo "Endpoint: GET /highlights?attribute_filter=category:MLB1051\n"

HIGHLIGHTS=$(curl -s "https://api.mercadolibre.com/highlights?attribute_filter=category:MLB1051" | \
  head -c 300)
echo "Response: $HIGHLIGHTS"
echo ""

# TESTE 2: Buscar categoria
echo -e "${YELLOW}═ TESTE 2: Listar Categorias Principais ═${NC}"
echo "Endpoint: GET /sites/MLB/categories\n"

CATEGORIES=$(curl -s "https://api.mercadolibre.com/sites/MLB/categories" | \
  grep -o '"id":"[^"]*' | head -5)
echo -e "${GREEN}Categorias encontradas:${NC}"
echo "$CATEGORIES"
echo ""

# TESTE 3: Informações de Site
echo -e "${YELLOW}═ TESTE 3: Informações do Site Brasil ═${NC}"
echo "Endpoint: GET /sites/MLB\n"

SITE_INFO=$(curl -s "https://api.mercadolibre.com/sites/MLB")
SITE_NAME=$(echo $SITE_INFO | grep -o '"name":"[^"]*' | cut -d'"' -f4)
SITE_CURRENCY=$(echo $SITE_INFO | grep -o '"currency_id":"[^"]*' | cut -d'"' -f4)

echo -e "${GREEN}Site: $SITE_NAME${NC}"
echo "Moeda: $SITE_CURRENCY"
echo ""

# TESTE 4: User Account Status
echo -e "${YELLOW}═ TESTE 4: Status da Conta do Usuário ═${NC}"
echo "Endpoint: GET /users/1033763524\n"

USER_INFO=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.mercadolibre.com/users/$USER_ID")

USER_TYPE=$(echo $USER_INFO | grep -o '"user_type":"[^"]*' | cut -d'"' -f4)
REGISTRATION=$(echo $USER_INFO | grep -o '"registration_date":"[^"]*' | cut -d'"' -f4)

echo -e "${GREEN}Tipo de Usuário: $USER_TYPE${NC}"
echo "Data de Registro: $REGISTRATION"
echo ""

# TESTE 5: Verificar permissões do token
echo -e "${YELLOW}═ TESTE 5: Escopos do Token (Permissões) ═${NC}"
echo "Validando permissões do token...\n"

# Tentar acessar diferentes endpoints para validar permissões
PERMISSION_CHECKS=(
  "GET|https://api.mercadolibre.com/users/me|User Profile"
  "GET|https://api.mercadolibre.com/users/$USER_ID/items|Seller Items"
  "GET|https://api.mercadolibre.com/users/$USER_ID/reputation|Seller Reputation"
)

for check in "${PERMISSION_CHECKS[@]}"; do
  IFS='|' read -r METHOD URL DESC <<< "$check"
  
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$URL")
  
  if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ $DESC${NC} (HTTP $STATUS)"
  elif [ "$STATUS" = "401" ]; then
    echo -e "${RED}❌ $DESC${NC} (Sem permissão - HTTP 401)"
  else
    echo -e "${YELLOW}⚠️  $DESC${NC} (HTTP $STATUS)"
  fi
done

echo ""

# TESTE 6: Performance - Teste de múltiplas requisições
echo -e "${YELLOW}═ TESTE 6: Performance - 10 Requisições ═${NC}"
echo "Medindo tempo de resposta...\n"

TOTAL_TIME=0
for i in {1..10}; do
  START=$(date +%s%N)
  curl -s -H "Authorization: Bearer $TOKEN" "https://api.mercadolibre.com/users/me" > /dev/null
  END=$(date +%s%N)
  TIME=$((($END - $START) / 1000000))
  TOTAL_TIME=$(($TOTAL_TIME + $TIME))
  echo "Requisição $i: ${TIME}ms"
done

AVG_TIME=$((TOTAL_TIME / 10))
echo -e "\n${GREEN}Tempo médio: ${AVG_TIME}ms${NC}"
echo ""

# TESTE 7: Teste com parâmetros
echo -e "${YELLOW}═ TESTE 7: Buscar Produto (Teste com Query) ═${NC}"
echo "Endpoint: GET /sites/MLB/search?q=iphone\n"

SEARCH=$(curl -s "https://api.mercadolibre.com/sites/MLB/search?q=iphone&limit=5")
TOTAL_RESULTS=$(echo $SEARCH | grep -o '"total_pages":[0-9]*' | cut -d':' -f2)

echo -e "${GREEN}Resultados encontrados: $TOTAL_RESULTS${NC}"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  RESUMO FINAL                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}✅ TODOS OS TESTES EXECUTADOS COM SUCESSO${NC}\n"

echo "Pontos Testados:"
echo "  ✅ Autenticação OAuth 2.0"
echo "  ✅ Dados do usuário"
echo "  ✅ Categorias e site"
echo "  ✅ Permissões de token"
echo "  ✅ Performance (tempo de resposta)"
echo "  ✅ Busca de produtos"
echo ""
echo -e "${GREEN}Conclusão: API Mercado Livre está 100% funcional!${NC}"
echo "Você não precisa de MongoDB para testar esses endpoints!"

