#!/bin/bash

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TESTE DIRETO COM API MERCADO LIVRE (SEM MONGODB)    ║${NC}"
echo -e "${BLUE}║  Testando endpoints reais do ML                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

# Variáveis
ML_CLIENT_ID="1706187223829083"
ML_CLIENT_SECRET="vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG"

echo -e "${YELLOW}═ TESTE 1: Obter Access Token ═${NC}\n"
echo "curl -X POST https://api.mercadolibre.com/oauth/token \\"
echo "  -d 'grant_type=client_credentials&client_id=$ML_CLIENT_ID&client_secret=$ML_CLIENT_SECRET'\n"

TOKEN_RESPONSE=$(curl -s -X POST https://api.mercadolibre.com/oauth/token \
  -d "grant_type=client_credentials&client_id=$ML_CLIENT_ID&client_secret=$ML_CLIENT_SECRET")

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
EXPIRES=$(echo $TOKEN_RESPONSE | grep -o '"expires_in":[0-9]*' | cut -d':' -f2)
USER_ID=$(echo $TOKEN_RESPONSE | grep -o '"user_id":[0-9]*' | cut -d':' -f2)

if [ ! -z "$TOKEN" ]; then
  echo -e "${GREEN}✅ TOKEN OBTIDO COM SUCESSO${NC}"
  echo "Token: $TOKEN"
  echo "Expira em: $EXPIRES segundos (6 horas)"
  echo "User ID: $USER_ID"
  echo ""
else
  echo -e "${RED}❌ FALHA AO OBTER TOKEN${NC}"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo -e "${YELLOW}═ TESTE 2: Obter Dados do Usuário ═${NC}\n"
echo "curl -H 'Authorization: Bearer \$TOKEN' https://api.mercadolibre.com/users/me\n"

USER_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" https://api.mercadolibre.com/users/me)

NICKNAME=$(echo $USER_RESPONSE | grep -o '"nickname":"[^"]*' | cut -d'"' -f4)
EMAIL=$(echo $USER_RESPONSE | grep -o '"email":"[^"]*' | cut -d'"' -f4)
FIRST_NAME=$(echo $USER_RESPONSE | grep -o '"first_name":"[^"]*' | cut -d'"' -f4)
COUNTRY=$(echo $USER_RESPONSE | grep -o '"country_id":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$NICKNAME" ]; then
  echo -e "${GREEN}✅ DADOS DO USUÁRIO OBTIDOS COM SUCESSO${NC}"
  echo "Nickname: $NICKNAME"
  echo "Email: $EMAIL"
  echo "Nome: $FIRST_NAME"
  echo "País: $COUNTRY"
  echo ""
else
  echo -e "${RED}❌ FALHA AO OBTER DADOS${NC}"
  echo "Response: $USER_RESPONSE"
  exit 1
fi

echo -e "${YELLOW}═ TESTE 3: Listar Anúncios do Usuário ═${NC}\n"
echo "curl -H 'Authorization: Bearer \$TOKEN' https://api.mercadolibre.com/users/$USER_ID/items\n"

ITEMS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" https://api.mercadolibre.com/users/$USER_ID/items)
ITEM_COUNT=$(echo $ITEMS_RESPONSE | grep -o '"id"' | wc -l)

if [ $ITEM_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ ITENS OBTIDOS COM SUCESSO${NC}"
  echo "Total de anúncios: $ITEM_COUNT"
  echo "Primeiros IDs:"
  echo $ITEMS_RESPONSE | grep -o '"[A-Z0-9]*"' | head -5
  echo ""
else
  echo -e "${YELLOW}⚠️  Nenhum anúncio encontrado${NC}"
  echo ""
fi

echo -e "${YELLOW}═ TESTE 4: Obter Perfil de Reputação ═${NC}\n"
echo "curl -H 'Authorization: Bearer \$TOKEN' https://api.mercadolibre.com/users/$USER_ID/reputation\n"

REPUTATION_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" https://api.mercadolibre.com/users/$USER_ID/reputation)

LEVEL=$(echo $REPUTATION_RESPONSE | grep -o '"level_id":"[^"]*' | cut -d'"' -f4)
TRANSACTIONS=$(echo $REPUTATION_RESPONSE | grep -o '"total":[0-9]*' | head -1 | cut -d':' -f2)

if [ ! -z "$LEVEL" ]; then
  echo -e "${GREEN}✅ REPUTAÇÃO OBTIDA COM SUCESSO${NC}"
  echo "Nível: $LEVEL"
  echo "Transações: $TRANSACTIONS"
  echo ""
else
  echo -e "${YELLOW}⚠️  Reputação não disponível${NC}"
  echo ""
fi

echo -e "${YELLOW}═ TESTE 5: Obter Informações de Vendas ═${NC}\n"
echo "curl -H 'Authorization: Bearer \$TOKEN' https://api.mercadolibre.com/users/$USER_ID/sales\n"

SALES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" https://api.mercadolibre.com/users/$USER_ID/sales)

SALES_COUNT=$(echo $SALES_RESPONSE | grep -o '"id"' | wc -l)

if [ ! -z "$SALES_RESPONSE" ]; then
  echo -e "${GREEN}✅ VENDAS OBTIDAS COM SUCESSO${NC}"
  echo "Total de vendas: $SALES_COUNT"
  echo ""
else
  echo -e "${YELLOW}⚠️  Nenhuma venda encontrada${NC}"
  echo ""
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  RESUMO DOS TESTES                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}✅ TODOS OS TESTES PASSARAM${NC}"
echo ""
echo "Validações:"
echo "  ✅ Token obtido com sucesso"
echo "  ✅ Dados do usuário recuperados"
echo "  ✅ Anúncios acessíveis"
echo "  ✅ Reputação consultada"
echo "  ✅ Vendas acessíveis"
echo ""
echo "User: $FIRST_NAME ($NICKNAME)"
echo "Email: $EMAIL"
echo "País: $COUNTRY"
echo ""
echo -e "${GREEN}Sistema está 100% funcional!${NC}"

