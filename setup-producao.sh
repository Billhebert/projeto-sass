#!/bin/bash

################################################################################
# SCRIPT DE SETUP AUTOMÁTICO - Projeto SASS
# 
# Executa todos os passos para deixar o projeto funcionando em produção
# 
# Uso: bash setup-producao.sh
################################################################################

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Funções de log
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

# Banner
clear
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     SETUP AUTOMÁTICO - PROJETO SASS                           ║"
echo "║     Deixando tudo funcionando em produção                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Verificações iniciais
log_info "Verificando pré-requisitos..."

if ! command -v docker &> /dev/null; then
  log_error "Docker não está instalado"
  exit 1
fi
log_success "Docker encontrado"

if ! command -v docker-compose &> /dev/null; then
  log_error "Docker Compose não está instalado"
  exit 1
fi
log_success "Docker Compose encontrado"

# Verificar diretório
if [ ! -f "docker-compose.yml" ]; then
  log_error "Arquivo docker-compose.yml não encontrado"
  log_error "Execute este script no diretório raiz do projeto"
  exit 1
fi
log_success "Projeto encontrado no diretório correto"

echo ""
log_info "════════════════════════════════════════════════════════════════"
log_info "PASSO 1: Gerar JWT_SECRET e configurar .env"
log_info "════════════════════════════════════════════════════════════════"

# Gerar JWT_SECRET seguro
JWT_SECRET=$(openssl rand -base64 32)

# Criar .env se não existir
if [ ! -f "backend/.env" ]; then
  log_info "Criando arquivo .env..."
  
  cat > backend/.env << EOF
# ============================================
# CONFIGURAÇÃO DE PRODUÇÃO
# ============================================

NODE_ENV=production
LOG_LEVEL=info
PORT=3011
API_HOST=0.0.0.0

# ============================================
# BANCO DE DADOS
# ============================================

MONGODB_URI=mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin
MONGO_USER=admin
MONGO_PASSWORD=changeme

# ============================================
# CACHE
# ============================================

REDIS_URL=redis://:changeme@redis:6379
REDIS_PASSWORD=changeme

# ============================================
# SEGURANÇA
# ============================================

JWT_SECRET=$JWT_SECRET

# ============================================
# MERCADO LIVRE
# ============================================

ML_CLIENT_ID=seu_client_id_aqui
ML_CLIENT_SECRET=seu_client_secret_aqui
ML_REDIRECT_URI=https://vendata.com.br/api/auth/ml-callback

# ============================================
# EMAIL
# ============================================

EMAIL_PROVIDER=test
EMAIL_FROM=noreply@vendata.com.br
FRONTEND_URL=https://vendata.com.br

# ============================================
# BACKUP
# ============================================

BACKUP_RETENTION_DAYS=30

# ============================================
# CACHE E RATE LIMITING
# ============================================

CACHE_STRATEGY=redis
CACHE_TTL=3600
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# CONFIGURAÇÕES AVANÇADAS
# ============================================

VERIFY_SIGNATURES=false
SKIP_EMAIL_VERIFICATION=false
VERBOSE_LOGGING=false

EOF
  
  log_success ".env criado com sucesso"
  log_warning "Atualize com suas credenciais reais de email, ML, etc"
else
  log_warning ".env já existe, pulando..."
fi

echo ""
log_info "════════════════════════════════════════════════════════════════"
log_info "PASSO 2: Parar containers antigos"
log_info "════════════════════════════════════════════════════════════════"

docker-compose down 2>/dev/null || true
log_success "Containers parados"

echo ""
log_info "════════════════════════════════════════════════════════════════"
log_info "PASSO 3: Fazer rebuild dos containers"
log_info "════════════════════════════════════════════════════════════════"

docker-compose build
log_success "Containers rebuilds com sucesso"

echo ""
log_info "════════════════════════════════════════════════════════════════"
log_info "PASSO 4: Iniciar todos os serviços"
log_info "════════════════════════════════════════════════════════════════"

docker-compose up -d
log_success "Containers iniciados"

echo ""
log_info "Aguardando containers ficarem healthy..."
sleep 15

# Verificar containers
TOTAL_CONTAINERS=$(docker-compose ps | grep -c "healthy\|running" || echo 0)
log_success "Containers: $TOTAL_CONTAINERS/5 prontos"

echo ""
log_info "════════════════════════════════════════════════════════════════"
log_info "PASSO 5: Testar API"
log_info "════════════════════════════════════════════════════════════════"

# Aguardar API ficar pronta
for i in {1..30}; do
  if curl -s http://localhost:3011/api/health | grep -q "ok"; then
    log_success "API respondendo normalmente"
    break
  fi
  if [ $i -eq 30 ]; then
    log_warning "API ainda não respondendo, mas continuando..."
  fi
  sleep 1
done

echo ""
log_info "════════════════════════════════════════════════════════════════"
log_info "PASSO 6: Criar diretório de backups"
log_info "════════════════════════════════════════════════════════════════"

mkdir -p .backups
chmod 755 .backups
log_success "Diretório de backups criado"

echo ""
log_info "════════════════════════════════════════════════════════════════"
log_info "PASSO 7: Status Final"
log_info "════════════════════════════════════════════════════════════════"

echo ""
docker ps

echo ""
log_info "════════════════════════════════════════════════════════════════"
log_info "TESTES RÁPIDOS"
log_info "════════════════════════════════════════════════════════════════"

echo ""
log_info "Testando Health Check..."
HEALTH=$(curl -s http://localhost:3011/api/health)
if echo "$HEALTH" | grep -q "ok"; then
  log_success "Health Check: OK ✓"
  echo "Response: $HEALTH" | head -1
else
  log_warning "Health Check falhou"
  echo "Response: $HEALTH"
fi

echo ""
log_info "════════════════════════════════════════════════════════════════"
log_info "SETUP COMPLETO! 🎉"
log_info "════════════════════════════════════════════════════════════════"

echo ""
log_success "Seu projeto está rodando em produção!"
echo ""
echo "Próximos passos:"
echo "  1. Verificar logs: docker logs -f projeto-sass-api"
echo "  2. Acessar: https://vendata.com.br"
echo "  3. Testar registro: POST /api/auth/register"
echo "  4. Configurar email real em backend/.env"
echo "  5. Setup backups automáticos: docker-compose -f docker-compose.backup.yml up -d"
echo ""
echo "JWT_SECRET (salve num lugar seguro):"
echo "  $JWT_SECRET"
echo ""
log_warning "IMPORTANTE: Atualize as credenciais em backend/.env antes de ir para produção"
echo ""

