#!/bin/bash

# ════════════════════════════════════════════════════════════════════════════
# 🔐 MERCADO LIVRE - EXTRATOR COMPLETO VIA CURL
# ════════════════════════════════════════════════════════════════════════════
# 
# Este script extrai TODOS os dados de uma conta Mercado Livre
# Saída: JSON completo em arquivo
#
# USO:
#   1. Configure os tokens abaixo
#   2. Execute: bash extract-ml-account.sh
#   3. Resultado: ml-account-data.json
#
# ════════════════════════════════════════════════════════════════════════════

# TOKENS - CONFIGURE AQUI OU VIA VARIÁVEIS DE AMBIENTE
# ════════════════════════════════════════════════════════════════════════════

# Opção 1: Digitar direto (menos seguro, mas funciona)
ML_ACCESS_TOKEN="${ML_ACCESS_TOKEN:-seu_access_token_aqui}"
ML_REFRESH_TOKEN="${ML_REFRESH_TOKEN:-seu_refresh_token_aqui}"

# Opção 2: Carregar do .env
if [ -f .env ]; then
  export $(cat .env | grep ML_ | xargs)
fi

# URLs base
ML_API="https://api.mercadolibre.com"
MP_API="https://api.mercadopago.com"

# Arquivo de output
OUTPUT_FILE="ml-account-data.json"
TEMP_FILE="/tmp/ml_data_$$_.json"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ════════════════════════════════════════════════════════════════════════════
# FUNÇÕES UTILITÁRIAS
# ════════════════════════════════════════════════════════════════════════════

# Função para fazer requisições seguras
call_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  local api_base=${4:-$ML_API}
  
  if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
    curl -s -X "$method" \
      -H "Authorization: Bearer $ML_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$api_base$endpoint"
  else
    curl -s -X "$method" \
      -H "Authorization: Bearer $ML_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      "$api_base$endpoint"
  fi
}

# Função para fazer requisições ao Mercado Pago
call_mp_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
    curl -s -X "$method" \
      -H "Authorization: Bearer $ML_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$MP_API$endpoint"
  else
    curl -s -X "$method" \
      -H "Authorization: Bearer $ML_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      "$MP_API$endpoint"
  fi
}

# Print status
print_status() {
  echo -e "${BLUE}▶${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# ════════════════════════════════════════════════════════════════════════════
# VALIDAÇÃO DE TOKENS
# ════════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔐 MERCADO LIVRE - EXTRATOR COMPLETO${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

print_status "Validando tokens..."

# Testar token
USER_RESPONSE=$(call_api "GET" "/users/me")

if echo "$USER_RESPONSE" | grep -q "error"; then
  print_error "Token inválido ou expirado!"
  echo "$USER_RESPONSE"
  exit 1
fi

USER_ID=$(echo "$USER_RESPONSE" | jq -r '.id' 2>/dev/null)
USER_NICKNAME=$(echo "$USER_RESPONSE" | jq -r '.nickname' 2>/dev/null)

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
  print_error "Não conseguiu extrair ID do usuário"
  echo "$USER_RESPONSE"
  exit 1
fi

print_success "Token válido para usuário: $USER_NICKNAME (ID: $USER_ID)\n"

# ════════════════════════════════════════════════════════════════════════════
# INICIAR JSON ESTRUTURADO
# ════════════════════════════════════════════════════════════════════════════

echo "{" > "$TEMP_FILE"
echo "  \"exportDate\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$TEMP_FILE"
echo "  \"account\": {" >> "$TEMP_FILE"

# ════════════════════════════════════════════════════════════════════════════
# 1. INFORMAÇÕES DO USUÁRIO
# ════════════════════════════════════════════════════════════════════════════

print_status "Extraindo informações do usuário..."

echo "$USER_RESPONSE" | jq '.' >> "$TEMP_FILE"
echo "," >> "$TEMP_FILE"

print_success "Usuário extraído\n"

# ════════════════════════════════════════════════════════════════════════════
# 2. ITENS / PRODUTOS
# ════════════════════════════════════════════════════════════════════════════

print_status "Extraindo itens do usuário..."

echo "  \"items\": {" >> "$TEMP_FILE"
echo "    \"summary\": {}," >> "$TEMP_FILE"
echo "    \"list\": [" >> "$TEMP_FILE"

ITEMS_RESPONSE=$(call_api "GET" "/users/$USER_ID/items/search?limit=50")
ITEMS_IDS=$(echo "$ITEMS_RESPONSE" | jq -r '.results[]' 2>/dev/null)

ITEM_COUNT=0
for ITEM_ID in $ITEMS_IDS; do
  ITEM_DETAIL=$(call_api "GET" "/items/$ITEM_ID")
  
  if [ $ITEM_COUNT -gt 0 ]; then
    echo "," >> "$TEMP_FILE"
  fi
  
  echo "$ITEM_DETAIL" | jq '.' >> "$TEMP_FILE"
  ITEM_COUNT=$((ITEM_COUNT + 1))
done

echo "    ]" >> "$TEMP_FILE"
echo "  }," >> "$TEMP_FILE"

print_success "Total de itens: $ITEM_COUNT\n"

# ════════════════════════════════════════════════════════════════════════════
# 3. PEDIDOS / ORDERS
# ════════════════════════════════════════════════════════════════════════════

print_status "Extraindo pedidos..."

echo "  \"orders\": [" >> "$TEMP_FILE"

ORDERS_RESPONSE=$(call_api "GET" "/orders/search?seller=$USER_ID&limit=50")
ORDER_IDS=$(echo "$ORDERS_RESPONSE" | jq -r '.results[]?.id' 2>/dev/null)

ORDER_COUNT=0
for ORDER_ID in $ORDER_IDS; do
  ORDER_DETAIL=$(call_api "GET" "/orders/$ORDER_ID")
  
  if [ $ORDER_COUNT -gt 0 ]; then
    echo "," >> "$TEMP_FILE"
  fi
  
  echo "$ORDER_DETAIL" | jq '.' >> "$TEMP_FILE"
  ORDER_COUNT=$((ORDER_COUNT + 1))
done

echo "  ]," >> "$TEMP_FILE"

print_success "Total de pedidos: $ORDER_COUNT\n"

# ════════════════════════════════════════════════════════════════════════════
# 4. VENDAS / MERCHANT ORDERS
# ════════════════════════════════════════════════════════════════════════════

print_status "Extraindo histórico de vendas..."

echo "  \"sales\": [" >> "$TEMP_FILE"

SALES_RESPONSE=$(call_api "GET" "/users/$USER_ID/orders/search?limit=50")
SALES_IDS=$(echo "$SALES_RESPONSE" | jq -r '.results[]?.id' 2>/dev/null)

SALES_COUNT=0
for SALE_ID in $SALES_IDS; do
  SALE_DETAIL=$(call_api "GET" "/merchant_orders/$SALE_ID")
  
  if [ $SALES_COUNT -gt 0 ]; then
    echo "," >> "$TEMP_FILE"
  fi
  
  echo "$SALE_DETAIL" | jq '.' >> "$TEMP_FILE"
  SALES_COUNT=$((SALES_COUNT + 1))
done

echo "  ]," >> "$TEMP_FILE"

print_success "Total de vendas: $SALES_COUNT\n"

# ════════════════════════════════════════════════════════════════════════════
# 5. PAGAMENTOS
# ════════════════════════════════════════════════════════════════════════════

print_status "Extraindo pagamentos..."

echo "  \"payments\": [" >> "$TEMP_FILE"

PAYMENTS_RESPONSE=$(call_api "GET" "/v1/payments/search?limit=50" "" "$MP_API")
PAYMENT_IDS=$(echo "$PAYMENTS_RESPONSE" | jq -r '.results[]?.id' 2>/dev/null)

PAYMENT_COUNT=0
for PAYMENT_ID in $PAYMENT_IDS; do
  if [ $PAYMENT_COUNT -gt 0 ]; then
    echo "," >> "$TEMP_FILE"
  fi
  
  PAYMENT_DETAIL=$(call_mp_api "GET" "/v1/payments/$PAYMENT_ID")
  echo "$PAYMENT_DETAIL" | jq '.' >> "$TEMP_FILE"
  PAYMENT_COUNT=$((PAYMENT_COUNT + 1))
done

echo "  ]," >> "$TEMP_FILE"

print_success "Total de pagamentos: $PAYMENT_COUNT\n"

# ════════════════════════════════════════════════════════════════════════════
# 6. SHIPMENTS
# ════════════════════════════════════════════════════════════════════════════

print_status "Extraindo shipments..."

echo "  \"shipments\": [" >> "$TEMP_FILE"

SHIPMENTS_RESPONSE=$(call_api "GET" "/users/$USER_ID/shipments/search?limit=50")
SHIPMENT_IDS=$(echo "$SHIPMENTS_RESPONSE" | jq -r '.results[]?.id' 2>/dev/null)

SHIPMENT_COUNT=0
for SHIPMENT_ID in $SHIPMENT_IDS; do
  if [ $SHIPMENT_COUNT -gt 0 ]; then
    echo "," >> "$TEMP_FILE"
  fi
  
  SHIPMENT_DETAIL=$(call_api "GET" "/shipments/$SHIPMENT_ID")
  echo "$SHIPMENT_DETAIL" | jq '.' >> "$TEMP_FILE"
  SHIPMENT_COUNT=$((SHIPMENT_COUNT + 1))
done

echo "  ]," >> "$TEMP_FILE"

print_success "Total de shipments: $SHIPMENT_COUNT\n"

# ════════════════════════════════════════════════════════════════════════════
# 7. ESTATÍSTICAS
# ════════════════════════════════════════════════════════════════════════════

print_status "Extraindo estatísticas..."

echo "  \"statistics\": {" >> "$TEMP_FILE"

# Reputação
REPUTATION=$(call_api "GET" "/users/$USER_ID/reputation")
echo "    \"reputation\": " >> "$TEMP_FILE"
echo "$REPUTATION" | jq '.' >> "$TEMP_FILE"
echo "," >> "$TEMP_FILE"

# Visitas
VISITS=$(call_api "GET" "/users/$USER_ID/user_visits/month")
echo "    \"visits\": " >> "$TEMP_FILE"
echo "$VISITS" | jq '.' >> "$TEMP_FILE"

echo "  }," >> "$TEMP_FILE"

print_success "Estatísticas extraídas\n"

# ════════════════════════════════════════════════════════════════════════════
# 8. RESUMO
# ════════════════════════════════════════════════════════════════════════════

print_status "Gerando resumo..."

echo "  \"summary\": {" >> "$TEMP_FILE"
echo "    \"totalItems\": $ITEM_COUNT," >> "$TEMP_FILE"
echo "    \"totalOrders\": $ORDER_COUNT," >> "$TEMP_FILE"
echo "    \"totalSales\": $SALES_COUNT," >> "$TEMP_FILE"
echo "    \"totalPayments\": $PAYMENT_COUNT," >> "$TEMP_FILE"
echo "    \"totalShipments\": $SHIPMENT_COUNT," >> "$TEMP_FILE"
echo "    \"userId\": \"$USER_ID\"," >> "$TEMP_FILE"
echo "    \"userNickname\": \"$USER_NICKNAME\"" >> "$TEMP_FILE"
echo "  }" >> "$TEMP_FILE"

echo "  }" >> "$TEMP_FILE"
echo "}" >> "$TEMP_FILE"

# ════════════════════════════════════════════════════════════════════════════
# FINALIZAR
# ════════════════════════════════════════════════════════════════════════════

# Validar JSON
if jq empty "$TEMP_FILE" 2>/dev/null; then
  mv "$TEMP_FILE" "$OUTPUT_FILE"
  print_success "JSON válido e completo!"
else
  print_error "JSON inválido!"
  exit 1
fi

# ════════════════════════════════════════════════════════════════════════════
# RESUMO FINAL
# ════════════════════════════════════════════════════════════════════════════

echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ EXTRAÇÃO COMPLETA!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "📊 ${BLUE}RESUMO DOS DADOS EXTRAÍDOS${NC}:"
echo -e "  • Itens: ${YELLOW}$ITEM_COUNT${NC}"
echo -e "  • Pedidos: ${YELLOW}$ORDER_COUNT${NC}"
echo -e "  • Vendas: ${YELLOW}$SALES_COUNT${NC}"
echo -e "  • Pagamentos: ${YELLOW}$PAYMENT_COUNT${NC}"
echo -e "  • Shipments: ${YELLOW}$SHIPMENT_COUNT${NC}"
echo -e "  • Usuário: ${YELLOW}$USER_NICKNAME${NC}\n"

echo -e "📁 ${GREEN}Arquivo salvo em: $OUTPUT_FILE${NC}\n"

echo -e "📋 ${BLUE}Como usar o arquivo:${NC}"
echo -e "  • Ver completo: jq '.' $OUTPUT_FILE"
echo -e "  • Ver items: jq '.account.items' $OUTPUT_FILE"
echo -e "  • Ver pedidos: jq '.account.orders' $OUTPUT_FILE"
echo -e "  • Ver resumo: jq '.summary' $OUTPUT_FILE\n"

print_success "Pronto!"
