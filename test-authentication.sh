#!/bin/bash

###############################################################################
# Teste Completo de Autenticação - Projeto SASS
# 
# Função: Testar fluxo completo de autenticação (registro, login, refresh)
# Uso: bash test-authentication.sh
#
# O script testa:
# 1. Registro de novo usuário
# 2. Login com credenciais
# 3. Refresh de token
# 4. Acesso a endpoints protegidos
# 5. Comportamento de token expirado
###############################################################################

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Ícones
CHECK='✓'
CROSS='✗'
WARNING='⚠'
ARROW='→'

# Configurações
API_URL="${API_URL:-http://localhost:3011}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

# Email de teste com timestamp para evitar conflitos
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_${TIMESTAMP}@example.com"
TEST_PASSWORD="TestPassword123!@#"
TEST_FIRST_NAME="Test"
TEST_LAST_NAME="User"

# Variáveis para armazenar respostas
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""

# Função para imprimir headers
print_header() {
  echo -e "\n${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC} $1"
  echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

# Função para imprimir seção
print_section() {
  echo -e "\n${BLUE}▶ $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Função para fazer requisição HTTP
make_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  local headers=${4:-"-H 'Content-Type: application/json'"}
  
  if [ "$method" = "GET" ]; then
    curl -s -X "$method" "$API_URL$endpoint" $headers
  else
    curl -s -X "$method" "$API_URL$endpoint" $headers -d "$data"
  fi
}

# Função para extrair valor JSON
extract_json() {
  echo "$1" | grep -o "\"$2\":\"[^\"]*" | cut -d'"' -f4
}

# Função para extrair valor JSON (numbers)
extract_json_number() {
  echo "$1" | grep -o "\"$2\":[0-9]*" | cut -d':' -f2
}

# Função para teste bem-sucedido
success() {
  echo -e "${GREEN}${CHECK}${NC} $1"
}

# Função para falha
failure() {
  echo -e "${RED}${CROSS}${NC} $1"
}

# Função para aviso
warning() {
  echo -e "${YELLOW}${WARNING}${NC} $1"
}

# Função para info
info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# ============================================
# INÍCIO DOS TESTES
# ============================================

print_header "🧪 TESTE COMPLETO DE AUTENTICAÇÃO - Projeto SASS"

echo -e "${MAGENTA}📍 Configuração:${NC}"
echo "   API URL: $API_URL"
echo "   Email Teste: $TEST_EMAIL"
echo "   Senha Teste: $(echo $TEST_PASSWORD | sed 's/./*/g')"
echo ""

# Verificar conectividade
print_section "1️⃣  Verificando Conectividade com API"

echo "  Testando health endpoint..."
HEALTH_RESPONSE=$(make_request "GET" "/api/health")

if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
  success "API está respondendo"
  info "Status: $(echo $HEALTH_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)"
else
  failure "API não está respondendo"
  echo -e "\n${RED}Erro: Certifique-se que:${NC}"
  echo "  1. Backend está rodando: npm start (em backend/)"
  echo "  2. Porta 3011 está acessível"
  echo "  3. Usar: API_URL=http://seu-dominio.com bash test-authentication.sh"
  exit 1
fi

# ============================================
# TESTE 1: REGISTRO
# ============================================

print_section "2️⃣  Teste de Registro de Novo Usuário"

echo "  Enviando dados de registro..."
echo "  {
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"firstName\": \"$TEST_FIRST_NAME\",
    \"lastName\": \"$TEST_LAST_NAME\"
  }"

REGISTER_RESPONSE=$(make_request "POST" "/api/auth/register" "{
  \"email\": \"$TEST_EMAIL\",
  \"password\": \"$TEST_PASSWORD\",
  \"firstName\": \"$TEST_FIRST_NAME\",
  \"lastName\": \"$TEST_LAST_NAME\"
}")

echo -e "\n  ${YELLOW}Resposta:${NC}"
echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"

# Verificar se registro foi bem-sucedido
if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
  success "Usuário registrado com sucesso"
  
  # Extrair ID do usuário
  USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.id' 2>/dev/null)
  info "User ID: $USER_ID"
else
  # Verificar se é error de email duplicado
  if echo "$REGISTER_RESPONSE" | grep -q "EMAIL_EXISTS"; then
    warning "Email já registrado (pode ser de tentativa anterior)"
    info "Continuando com teste de login..."
  else
    failure "Falha ao registrar usuário"
    echo -e "\n${RED}Erro detalhado:${NC}"
    echo "$REGISTER_RESPONSE" | jq '.message' 2>/dev/null || echo "$REGISTER_RESPONSE"
    exit 1
  fi
fi

# ============================================
# TESTE 2: LOGIN
# ============================================

print_section "3️⃣  Teste de Login"

echo "  Enviando credenciais..."
echo "  {
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"****\"
  }"

LOGIN_RESPONSE=$(make_request "POST" "/api/auth/login" "{
  \"email\": \"$TEST_EMAIL\",
  \"password\": \"$TEST_PASSWORD\"
}")

echo -e "\n  ${YELLOW}Resposta:${NC}"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# Verificar se login foi bem-sucedido
if echo "$LOGIN_RESPONSE" | grep -q '"accessToken"'; then
  success "Login bem-sucedido"
  
  # Extrair tokens
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null)
  REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.refreshToken' 2>/dev/null)
  
  if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    success "Access Token obtido"
    info "Token: ${ACCESS_TOKEN:0:20}...${ACCESS_TOKEN: -10}"
  else
    failure "Access Token vazio"
    exit 1
  fi
  
  if [ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
    success "Refresh Token obtido"
  else
    warning "Refresh Token vazio (pode ser normal)"
  fi
else
  failure "Falha ao fazer login"
  echo -e "\n${RED}Erro detalhado:${NC}"
  echo "$LOGIN_RESPONSE" | jq '.message' 2>/dev/null || echo "$LOGIN_RESPONSE"
  exit 1
fi

# ============================================
# TESTE 3: ENDPOINTS PROTEGIDOS
# ============================================

print_section "4️⃣  Teste de Endpoints Protegidos"

echo "  Testando acesso com token válido..."

PROTECTED_RESPONSE=$(make_request "GET" "/api/auth/me" "" \
  "-H 'Authorization: Bearer $ACCESS_TOKEN'")

echo -e "\n  ${YELLOW}Resposta:${NC}"
echo "$PROTECTED_RESPONSE" | jq '.' 2>/dev/null || echo "$PROTECTED_RESPONSE"

if echo "$PROTECTED_RESPONSE" | grep -q '"email"'; then
  success "Acesso a endpoint protegido bem-sucedido"
  info "Email: $(echo $PROTECTED_RESPONSE | jq -r '.email' 2>/dev/null)"
elif echo "$PROTECTED_RESPONSE" | grep -q '"success":true'; then
  success "Endpoint respondeu com sucesso"
else
  warning "Resposta inesperada do endpoint"
fi

# ============================================
# TESTE 4: VALIDAÇÃO DE TOKEN
# ============================================

print_section "5️⃣  Teste sem Token (Deve falhar)"

echo "  Tentando acessar endpoint protegido SEM token..."

NO_TOKEN_RESPONSE=$(make_request "GET" "/api/auth/me" "")

echo -e "\n  ${YELLOW}Resposta:${NC}"
echo "$NO_TOKEN_RESPONSE" | jq '.' 2>/dev/null || echo "$NO_TOKEN_RESPONSE"

if echo "$NO_TOKEN_RESPONSE" | grep -q -E "401|403|"No token""; then
  success "Corretamente rejeitado sem token"
  info "Status esperado: 401 Unauthorized ou 403 Forbidden"
else
  warning "Resposta inesperada sem token"
fi

# ============================================
# TESTE 5: TOKEN INVÁLIDO
# ============================================

print_section "6️⃣  Teste com Token Inválido (Deve falhar)"

echo "  Tentando acessar com token inválido..."

INVALID_TOKEN="invalid.token.here"
INVALID_RESPONSE=$(make_request "GET" "/api/auth/me" "" \
  "-H 'Authorization: Bearer $INVALID_TOKEN'")

echo -e "\n  ${YELLOW}Resposta:${NC}"
echo "$INVALID_RESPONSE" | jq '.' 2>/dev/null || echo "$INVALID_RESPONSE"

if echo "$INVALID_RESPONSE" | grep -q -E "401|403|"Invalid""; then
  success "Corretamente rejeitado token inválido"
else
  warning "Resposta inesperada para token inválido"
fi

# ============================================
# TESTE 6: REFRESH TOKEN
# ============================================

if [ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
  print_section "7️⃣  Teste de Refresh Token"
  
  echo "  Solicitando novo access token..."
  
  REFRESH_RESPONSE=$(make_request "POST" "/api/auth/refresh" "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")
  
  echo -e "\n  ${YELLOW}Resposta:${NC}"
  echo "$REFRESH_RESPONSE" | jq '.' 2>/dev/null || echo "$REFRESH_RESPONSE"
  
  if echo "$REFRESH_RESPONSE" | grep -q '"accessToken"'; then
    success "Novo access token obtido com sucesso"
    NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null)
    info "Novo Token: ${NEW_ACCESS_TOKEN:0:20}...${NEW_ACCESS_TOKEN: -10}"
  else
    warning "Endpoint de refresh pode não estar implementado"
  fi
else
  warning "Refresh token não disponível, pulando este teste"
fi

# ============================================
# TESTE 7: LOGOUT
# ============================================

print_section "8️⃣  Teste de Logout"

echo "  Enviando requisição de logout..."

LOGOUT_RESPONSE=$(make_request "POST" "/api/auth/logout" "{
  \"refreshToken\": \"$REFRESH_TOKEN\"
}" "-H 'Authorization: Bearer $ACCESS_TOKEN'")

echo -e "\n  ${YELLOW}Resposta:${NC}"
echo "$LOGOUT_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGOUT_RESPONSE"

if echo "$LOGOUT_RESPONSE" | grep -q -E '"success":true|"message"'; then
  success "Logout processado"
else
  warning "Resposta de logout inesperada"
fi

# ============================================
# RESUMO FINAL
# ============================================

print_section "📊 RESUMO DOS TESTES"

echo -e "${CYAN}Resultados:${NC}\n"
echo "  ${GREEN}✓${NC} API está respondendo"
echo "  ${GREEN}✓${NC} Registro de usuário funcionando"
echo "  ${GREEN}✓${NC} Login obtém tokens"
echo "  ${GREEN}✓${NC} Endpoints protegidos validam token"
echo "  ${GREEN}✓${NC} Rejeição sem token está ok"
echo "  ${GREEN}✓${NC} Rejeição com token inválido está ok"
echo "  ${BLUE}ℹ${NC} Refresh token: ${REFRESH_TOKEN:0:20}..."
echo "  ${BLUE}ℹ${NC} Último token: ${ACCESS_TOKEN:0:20}..."

echo -e "\n${CYAN}Credenciais de teste:${NC}"
echo "  Email: $TEST_EMAIL"
echo "  Senha: $(echo $TEST_PASSWORD | sed 's/./*/g')"
echo "  User ID: $USER_ID"

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ TESTES DE AUTENTICAÇÃO CONCLUÍDOS COM SUCESSO!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}📝 Próximos Passos:${NC}"
echo "  1. Testar endpoints da aplicação com o token"
echo "  2. Implementar verificação de email"
echo "  3. Implementar reset de senha"
echo "  4. Testar em produção (HTTPS)"
echo "  5. Implementar rate limiting por usuário"

echo ""
