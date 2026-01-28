#!/bin/bash

# Script para inicializar o projeto com bancos de dados no Docker

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║  Projeto SASS - Setup Local Development                       ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para imprimir mensagens
print_step() {
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

# 1. Verificar se Docker está instalado
print_step "Verificando instalação do Docker..."
if ! command -v docker &> /dev/null; then
    print_error "Docker não está instalado!"
    exit 1
fi
print_success "Docker encontrado"

# 2. Verificar se Docker Compose está instalado
print_step "Verificando instalação do Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose não está instalado!"
    exit 1
fi
print_success "Docker Compose encontrado"

# 3. Criar arquivo .env se não existir
print_step "Verificando arquivo .env..."
if [ ! -f .env ]; then
    print_warning ".env não encontrado, criando a partir de .env.example"
    cp .env.example .env
    print_success ".env criado (atualize com suas credenciais se necessário)"
else
    print_success ".env já existe"
fi

# 4. Criar arquivo .env no backend se não existir
print_step "Verificando arquivo backend/.env..."
if [ ! -f backend/.env ]; then
    print_warning "backend/.env não encontrado, criando a partir de backend/.env.example"
    cp backend/.env.example backend/.env
    print_success "backend/.env criado"
else
    print_success "backend/.env já existe"
fi

# 5. Iniciar bancos de dados
print_step "Iniciando MongoDB e Redis..."
docker compose -f docker-compose.dev.yml up -d mongo redis

# 6. Aguardar saúde dos serviços
print_step "Aguardando bancos de dados ficarem saudáveis..."
echo "   MongoDB: ", && docker compose -f docker-compose.dev.yml ps mongo
echo "   Redis: ", && docker compose -f docker-compose.dev.yml ps redis

# Aguardar MongoDB estar pronto
for i in {1..30}; do
    if docker exec projeto-sass-mongo mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        print_success "MongoDB está pronto"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "MongoDB não ficou pronto no tempo limite"
        exit 1
    fi
    echo -n "."
    sleep 1
done

# Aguardar Redis estar pronto
for i in {1..30}; do
    if docker exec projeto-sass-redis redis-cli -a changeme ping &> /dev/null; then
        print_success "Redis está pronto"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Redis não ficou pronto no tempo limite"
        exit 1
    fi
    echo -n "."
    sleep 1
done

echo ""

# 7. Instalar dependências
print_step "Verificando dependências do Node.js..."
if [ ! -d "node_modules" ]; then
    print_warning "node_modules não encontrado, instalando dependências..."
    npm install
    print_success "Dependências instaladas"
else
    print_success "Dependências já estão instaladas"
fi

# 8. Instalar dependências do frontend
print_step "Verificando dependências do frontend..."
if [ ! -d "frontend/node_modules" ]; then
    print_warning "frontend/node_modules não encontrado, instalando dependências..."
    cd frontend
    npm install
    cd ..
    print_success "Dependências do frontend instaladas"
else
    print_success "Dependências do frontend já estão instaladas"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║  Setup Completo! 🎉                                            ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Próximos passos:"
echo ""
print_step "Em um terminal, inicie o backend:"
echo "   npm run dev:backend"
echo ""
print_step "Em outro terminal, inicie o frontend:"
echo "   npm run dev:frontend"
echo ""
print_step "Ou inicie ambos simultaneamente:"
echo "   npm run dev"
echo ""
echo "Serviços disponíveis:"
echo "   • Backend:  http://localhost:3011"
echo "   • Frontend: http://localhost:5173"
echo "   • Health:   http://localhost:3011/health"
echo "   • API Docs: http://localhost:3011/api-docs"
echo "   • MongoDB:  localhost:27017 (admin/changeme)"
echo "   • Redis:    localhost:6379 (password: changeme)"
echo ""
echo "Para parar os bancos de dados:"
echo "   npm run db:stop"
echo ""
