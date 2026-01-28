#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PROJETO SASS - Teste Completo de Integração              ║${NC}"
echo -e "${BLUE}║  Data: $(date '+%d/%m/%Y %H:%M:%S')                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

BASE_URL="http://localhost:3000"
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
  local test_name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local expected_status=$5
  local headers=$6
  
  echo -e "${BLUE}→ Testando: $test_name${NC}"
  
  if [ -z "$headers" ]; then
    headers="-H 'Content-Type: application/json'"
  fi
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" $headers)
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" -H "Content-Type: application/json" $headers -d "$data")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}  ✓ PASSOU${NC} (HTTP $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}  ✗ FALHOU${NC} (Esperado: $expected_status, Recebido: $http_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  
  echo "  Resposta: $(echo "$body" | head -c 200)..."
  echo ""
}

# Aguardar servidor iniciar
echo -e "${BLUE}Aguardando servidor iniciar...${NC}\n"
for i in {1..10}; do
  if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Servidor pronto!${NC}\n"
    break
  fi
  echo "Tentativa $i..."
  sleep 2
done

# Teste 1: Health Check
echo -e "${BLUE}═════ TESTE 1: HEALTH CHECK ═════${NC}"
run_test "Health endpoint" "GET" "/health" "" "200"
echo ""

# Teste 2: Registrar usuário
echo -e "${BLUE}═════ TESTE 2: REGISTRO DE USUÁRIO ═════${NC}"
USER_DATA='{"email":"testuser@example.com","password":"SecurePass123","firstName":"Test","lastName":"User"}'
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "$USER_DATA")
echo -e "Resposta: $(echo $REGISTER_RESPONSE | jq . 2>/dev/null || echo $REGISTER_RESPONSE)"
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.token' 2>/dev/null)
echo -e "Token: $TOKEN\n"

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
  TESTS_PASSED=$((TESTS_PASSED + 1))
  echo -e "${GREEN}✓ Usuário registrado com sucesso${NC}\n"
else
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo -e "${RED}✗ Falha ao registrar usuário${NC}\n"
fi

# Teste 3: Login
echo -e "${BLUE}═════ TESTE 3: LOGIN ═════${NC}"
LOGIN_DATA='{"email":"testuser@example.com","password":"SecurePass123"}'
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA")
echo -e "Resposta: $(echo $LOGIN_RESPONSE | jq . 2>/dev/null || echo $LOGIN_RESPONSE)"
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token' 2>/dev/null)
echo -e "Token: $TOKEN\n"

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
  TESTS_PASSED=$((TESTS_PASSED + 1))
  echo -e "${GREEN}✓ Login realizado com sucesso${NC}\n"
else
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo -e "${RED}✗ Falha no login${NC}\n"
fi

# Teste 4: Listar contas ML (com autenticação)
echo -e "${BLUE}═════ TESTE 4: LISTAR CONTAS ML ═════${NC}"
if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  AUTH_HEADER="-H 'Authorization: Bearer $TOKEN'"
  response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/ml-accounts" -H "Authorization: Bearer $TOKEN")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  echo -e "HTTP Status: $http_code"
  echo -e "Resposta: $(echo "$body" | jq . 2>/dev/null || echo "$body" | head -c 200)"
  echo ""
else
  echo -e "${RED}✗ Token não disponível${NC}\n"
fi

# Teste 5: Adicionar conta ML
echo -e "${BLUE}═════ TESTE 5: ADICIONAR CONTA ML ═════${NC}"
ML_ACCOUNT_DATA='{"accessToken":"APP_USR-1706187223829083-012723-a166d6fc7f319139c20dc1e13d6f2c22-1033763524"}'
if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ml-accounts" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$ML_ACCOUNT_DATA")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  echo -e "HTTP Status: $http_code"
  echo -e "Resposta: $(echo "$body" | jq . 2>/dev/null || echo "$body" | head -c 300)"
  echo ""
else
  echo -e "${RED}✗ Token não disponível${NC}\n"
fi

# Resumo
echo -e "${BLUE}═════ RESUMO DOS TESTES ═════${NC}"
echo -e "Testes Passados: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Testes Falhados: ${RED}$TESTS_FAILED${NC}"
echo -e "Total: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ TODOS OS TESTES PASSARAM!${NC}"
else
  echo -e "${RED}✗ Alguns testes falharam${NC}"
fi
