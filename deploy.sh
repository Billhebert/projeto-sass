#!/bin/bash

# Vendata Deploy Script
# Usage: ./deploy.sh [production|staging]

set -e

ENV=${1:-production}
PROJECT_DIR="/root/projeto/projeto-sass"

echo "🚀 Iniciando deploy do Vendata - Ambiente: $ENV"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_warn "Este script deve ser executado como root (sudo)"
fi

# Navigate to project directory
cd $PROJECT_DIR

# 1. Pull latest code
log_info "Atualizando código do repositório..."
git pull origin main

# 2. Install dependencies
log_info "Instalando dependências..."
npm install

# 3. Build API
log_info "Compilando API..."
npm run build --workspace=apps/api

# 4. Build Frontend
log_info "Compilando Frontend..."
npm run build --workspace=apps/web

# 5. Run database migrations
log_info "Executando migrações do banco de dados..."
npm run prisma:migrate:deploy --workspace=apps/api

# 6. Create logs directory
log_info "Criando diretório de logs..."
mkdir -p logs

# 7. Restart applications with PM2
log_info "Reiniciando aplicações com PM2..."
pm2 delete all || true
pm2 start ecosystem.config.json
pm2 save

# 8. Reload Nginx
log_info "Recarregando Nginx..."
nginx -t && systemctl reload nginx

# 9. Show status
log_info "Status das aplicações:"
pm2 status

echo ""
log_info "✅ Deploy concluído com sucesso!"
echo ""
log_info "URLs:"
log_info "  - Frontend: https://vendata.com.br"
log_info "  - API: https://vendata.com.br/api"
log_info "  - Health: https://vendata.com.br/health"
echo ""
log_info "Logs:"
log_info "  - PM2: pm2 logs"
log_info "  - Nginx: tail -f /var/log/nginx/vendata-*.log"
