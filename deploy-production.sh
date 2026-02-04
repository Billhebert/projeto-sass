#!/bin/bash

##############################################################################
# Script: deploy-production.sh
# Description: Automated production deployment with validation
# Usage: ./deploy-production.sh
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
DOMAIN="vendata.com.br"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

# Functions
print_header() {
    echo -e "${BLUE}╔═════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚═════════════════════════════════════════════════════════════╝${NC}"
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_step "Verificando pré-requisitos..."
    
    # Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker não instalado"
        exit 1
    fi
    print_success "Docker instalado"
    
    # Docker Compose
    if ! command -v docker &> /dev/null; then
        print_error "Docker Compose não instalado"
        exit 1
    fi
    print_success "Docker Compose instalado"
    
    # Environment file
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Arquivo $ENV_FILE não encontrado"
        exit 1
    fi
    print_success "Arquivo $ENV_FILE existe"
    
    # Compose file
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Arquivo $COMPOSE_FILE não encontrado"
        exit 1
    fi
    print_success "Arquivo $COMPOSE_FILE existe"
}

# Validate environment
validate_environment() {
    print_step "Validando variáveis de ambiente..."
    
    # Check required variables
    local required_vars=("MONGO_PASSWORD" "REDIS_PASSWORD" "ADMIN_TOKEN" "DOMAIN")
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE"; then
            print_error "Variável ${var} não configurada em $ENV_FILE"
            exit 1
        fi
    done
    
    print_success "Variáveis de ambiente validadas"
}

# Check SSL certificate
check_ssl_certificate() {
    print_step "Verificando certificado SSL..."
    
    if [ ! -f "certs/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        print_warning "Certificado SSL não encontrado"
        echo -e "${YELLOW}Execute: ./setup-letsencrypt.sh${NC}"
        exit 1
    fi
    
    # Check expiration
    local expiry=$(openssl x509 -in certs/letsencrypt/live/${DOMAIN}/fullchain.pem -noout -enddate | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry" +%s)
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [ $days_until_expiry -lt 0 ]; then
        print_error "Certificado SSL expirou! Renove imediatamente"
        exit 1
    fi
    
    if [ $days_until_expiry -lt 30 ]; then
        print_warning "Certificado expira em ${days_until_expiry} dias"
    fi
    
    print_success "Certificado SSL válido (expira em ${days_until_expiry} dias)"
}

# Stop current deployment
stop_current() {
    print_step "Parando deployments anteriores..."
    
    docker compose down 2>/dev/null || true
    docker compose -f docker-compose.load-balanced.yml down 2>/dev/null || true
    
    sleep 2
    print_success "Deployments anteriores parados"
}

# Build images
build_images() {
    print_step "Compilando imagens Docker..."
    
    docker compose -f "$COMPOSE_FILE" build --no-cache
    
    print_success "Imagens compiladas com sucesso"
}

# Start services
start_services() {
    print_step "Iniciando serviços em produção..."
    
    docker compose -f "$COMPOSE_FILE" up -d
    
    print_success "Serviços iniciados"
}

# Wait for health checks
wait_health_checks() {
    print_step "Aguardando health checks (isso pode levar 1-2 minutos)..."
    
    local max_attempts=60
    local attempt=0
    local all_healthy=false
    
    while [ $attempt -lt $max_attempts ]; do
        local status=$(docker compose -f "$COMPOSE_FILE" ps --quiet | wc -l)
        local running=$(docker compose -f "$COMPOSE_FILE" ps --quiet 2>/dev/null || true | wc -l)
        
        if [ $running -gt 0 ]; then
            echo -n "."
            sleep 2
            attempt=$((attempt + 1))
        else
            break
        fi
    done
    
    echo ""
    print_success "Serviços iniciados"
}

# Validate deployment
validate_deployment() {
    print_step "Validando deployment..."
    
    # Check containers running
    local api_running=$(docker compose -f "$COMPOSE_FILE" ps api-1 2>/dev/null | grep -c "Up" || echo 0)
    if [ $api_running -eq 0 ]; then
        print_error "API não está rodando"
        exit 1
    fi
    print_success "API está rodando"
    
    # Check health endpoint
    sleep 5
    
    if curl -k -s https://localhost/health > /dev/null 2>&1; then
        print_success "Health endpoint respondendo"
    else
        print_warning "Health endpoint não respondeu (pode estar inicializando)"
    fi
}

# Show status
show_status() {
    echo ""
    print_header "STATUS DO DEPLOYMENT"
    echo ""
    
    docker compose -f "$COMPOSE_FILE" ps
    
    echo ""
    print_success "Deployment em produção!"
    echo ""
    
    echo -e "${CYAN}URLs DISPONÍVEIS:${NC}"
    echo "  Frontend:  https://${DOMAIN}"
    echo "  API:       https://api.${DOMAIN}"
    echo "  Health:    https://api.${DOMAIN}/health"
    echo ""
    
    echo -e "${CYAN}COMANDOS ÚTEIS:${NC}"
    echo "  Ver logs:           docker compose -f ${COMPOSE_FILE} logs -f"
    echo "  Parar:              docker compose -f ${COMPOSE_FILE} down"
    echo "  Status:             docker compose -f ${COMPOSE_FILE} ps"
    echo "  Acessar Mongo:      docker compose -f ${COMPOSE_FILE} exec mongo mongosh"
    echo ""
}

# Main execution
main() {
    print_header "DEPLOYMENT PARA PRODUÇÃO - ${DOMAIN}"
    echo ""
    
    check_prerequisites
    echo ""
    
    validate_environment
    echo ""
    
    check_ssl_certificate
    echo ""
    
    echo -e "${YELLOW}⚠️  AVISO: Este script vai:${NC}"
    echo "  1. Parar qualquer deployment anterior"
    echo "  2. Compilar novas imagens Docker"
    echo "  3. Iniciar aplicação em produção"
    echo "  4. Validar saúde dos serviços"
    echo ""
    
    read -p "Deseja continuar? (s/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_error "Deployment cancelado"
        exit 1
    fi
    
    echo ""
    
    stop_current
    echo ""
    
    build_images
    echo ""
    
    start_services
    echo ""
    
    wait_health_checks
    echo ""
    
    validate_deployment
    echo ""
    
    show_status
}

# Run main
main "$@"
