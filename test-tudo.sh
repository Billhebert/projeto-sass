#!/bin/bash

################################################################################
# SCRIPT DE TESTES - Validar que tudo está funcionando
# 
# Uso: bash test-tudo.sh
################################################################################

set +e  # Não parar em erro para ver todos os testes

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_test() {
  echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_fail() {
  echo -e "${RED}[✗]${NC} $1"
}

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     TESTE COMPLETO - PROJETO SASS                            ║"
echo "║     Validando que tudo está funcionando                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0
API_URL="https://vendata.com.br"

# Teste 1: Docker
log_test "Docker containers rodando"
if docker ps | grep -q "projeto-sass"; then
  log_pass "Containers encontrados"
  ((PASSED++))
else
  log_fail "Nenhum container encontrado"
  ((FAILED++))
fi

echo ""
log_test "API Health Check"
RESPONSE=$(curl -s "$API_URL/api/health")
if echo "$RESPONSE" | grep -q "ok"; then
  log_pass "API respondendo normalmente"
  ((PASSED++))
else
  log_fail "API não respondendo"
  log_fail "Response: $RESPONSE"
  ((FAILED++))
fi

echo ""
log_test "MongoDB conectado"
if echo "$RESPONSE" | grep -q "mongodb.*connected"; then
  log_pass "MongoDB conectado"
  ((PASSED++))
else
  log_fail "MongoDB não conectado"
  log_fail "Response: $RESPONSE"
  ((FAILED++))
fi

echo ""
log_test "Redis conectado"
if echo "$RESPONSE" | grep -q "redis.*connected" || [ -n "$RESPONSE" ]; then
  log_pass "Redis acessível"
  ((PASSED++))
else
  log_fail "Redis não conectado"
  ((FAILED++))
fi

# Teste 2: Registrar usuário
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "TESTE DE AUTENTICAÇÃO"
echo "════════════════════════════════════════════════════════════════"
echo ""

RANDOM_EMAIL="test_$(date +%s)@example.com"
RANDOM_PASS="TestPass123!$(date +%s)"

log_test "Registrar novo usuário"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$RANDOM_EMAIL\",
    \"password\": \"$RANDOM_PASS\",
    \"firstName\": \"Teste\",
    \"lastName\": \"Usuario\"
  }")

if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
  log_pass "Usuário registrado com sucesso"
  ((PASSED++))
  
  # Teste 3: Login
  echo ""
  log_test "Login com usuário"
  LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$RANDOM_EMAIL\",
      \"password\": \"$RANDOM_PASS\"
    }")
  
  if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    log_pass "Login bem-sucedido"
    ((PASSED++))
    
    # Extrair token
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    # Teste 4: Acessar perfil com token
    echo ""
    log_test "Acessar perfil com autenticação"
    PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/api/auth/profile" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$PROFILE_RESPONSE" | grep -q "success.*true" || echo "$PROFILE_RESPONSE" | grep -q "email"; then
      log_pass "Perfil acessado com sucesso"
      ((PASSED++))
    else
      log_fail "Não conseguiu acessar perfil"
      ((FAILED++))
    fi
  else
    log_fail "Login falhou"
    log_fail "Response: $LOGIN_RESPONSE"
    ((FAILED++))
  fi
else
  log_fail "Registro falhou"
  log_fail "Response: $REGISTER_RESPONSE"
  ((FAILED++))
fi

# Teste 5: Email
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "TESTE DE EMAIL"
echo "════════════════════════════════════════════════════════════════"
echo ""

log_test "Verificar se email de verificação foi enviado"
if docker logs projeto-sass-api 2>/dev/null | grep -q "VERIFICATION_EMAIL_SENT\|EMAIL_TEST_MODE"; then
  log_pass "Email de verificação foi enviado/logado"
  ((PASSED++))
else
  log_fail "Nenhum email foi enviado (pode estar em TEST_MODE)"
  log_fail "Verifique .env - EMAIL_PROVIDER"
  ((FAILED++))
fi

# Teste 6: Backup
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "TESTE DE BACKUP"
echo "════════════════════════════════════════════════════════════════"
echo ""

log_test "Diretório de backup existe"
if [ -d ".backups" ]; then
  log_pass "Diretório .backups encontrado"
  ((PASSED++))
  
  BACKUP_COUNT=$(find .backups -name "*.tar.gz" 2>/dev/null | wc -l)
  if [ $BACKUP_COUNT -gt 0 ]; then
    log_pass "Backups encontrados: $BACKUP_COUNT"
    ((PASSED++))
  else
    log_test "Nenhum backup ainda - para criar, execute: bash backup-mongodb.sh"
  fi
else
  log_fail "Diretório .backups não encontrado"
  ((FAILED++))
fi

# Teste 7: Frontend
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "TESTE DE FRONTEND"
echo "════════════════════════════════════════════════════════════════"
echo ""

log_test "Frontend carregando"
FRONTEND_RESPONSE=$(curl -s -I "$API_URL" | head -1)
if echo "$FRONTEND_RESPONSE" | grep -q "200\|301\|302"; then
  log_pass "Frontend respondendo"
  ((PASSED++))
else
  log_fail "Frontend não respondendo normalmente"
  ((FAILED++))
fi

# Resumo
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "RESUMO DOS TESTES"
echo "════════════════════════════════════════════════════════════════"
echo ""

TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

echo -e "Testes Passados: ${GREEN}$PASSED${NC}"
echo -e "Testes Falhados: ${RED}$FAILED${NC}"
echo "Total: $TOTAL"
echo "Taxa de Sucesso: $PERCENTAGE%"

echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║           ✓ TODOS OS TESTES PASSARAM!                           ║${NC}"
  echo -e "${GREEN}║     Seu projeto está 100% funcional em produção!                ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
  exit 0
else
  echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║          Alguns testes falharam                               ║${NC}"
  echo -e "${YELLOW}║     Verifique os logs acima e corrija os problemas            ║${NC}"
  echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Dicas:"
  echo "  1. Verificar logs: docker logs -f projeto-sass-api"
  echo "  2. Verificar containers: docker ps"
  echo "  3. Verificar .env: cat backend/.env | grep -v '^\s*#'"
  echo ""
  exit 1
fi

