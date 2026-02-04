#!/bin/bash

##############################################################################
# Script: listar-usuarios.sh
# Description: List all registered users in the Projeto SASS database
# Usage: ./listar-usuarios.sh [filter]
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if MongoDB is running
if ! docker compose ps mongo | grep -q "Up"; then
    echo -e "${RED}❌ MongoDB is not running${NC}"
    echo "Start services with: docker compose up -d"
    exit 1
fi

echo -e "${BLUE}╔═════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PROJETO SASS - USUÁRIOS REGISTRADOS                       ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get total user count
TOTAL_USERS=$(docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "db.users.countDocuments()" 2>/dev/null | tail -1)

# Get verified count
VERIFIED=$(docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "db.users.countDocuments({emailVerified: true})" 2>/dev/null | tail -1)

# Get unverified count
UNVERIFIED=$(docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "db.users.countDocuments({emailVerified: false})" 2>/dev/null | tail -1)

# Get admin count
ADMINS=$(docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "db.users.countDocuments({role: 'admin'})" 2>/dev/null | tail -1)

# Get moderator count
MODERATORS=$(docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "db.users.countDocuments({role: 'moderator'})" 2>/dev/null | tail -1)

echo -e "${YELLOW}📊 ESTATÍSTICAS GERAIS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "👤 Total de Usuários:     ${GREEN}$TOTAL_USERS${NC}"
echo -e "✓ Verificados:            ${GREEN}$VERIFIED${NC}"
echo -e "✗ Não Verificados:        ${YELLOW}$UNVERIFIED${NC}"
echo -e "🔑 Administradores:       ${GREEN}$ADMINS${NC}"
echo -e "👥 Moderadores:           ${GREEN}$MODERATORS${NC}"
echo ""

# Get user distribution by role
echo -e "${YELLOW}📈 DISTRIBUIÇÃO POR ROLE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "
db.users.aggregate([
  { \$group: { _id: '\$role', count: { \$sum: 1 } } },
  { \$sort: { count: -1 } }
]).pretty()
" 2>/dev/null | grep -E "^[[:space:]]*_id|^[[:space:]]*count|^[[:space:]]*\{|^[[:space:]]*\}|^[[:space:]]*[a-z]" | head -20

echo ""
echo -e "${YELLOW}📋 LISTA COMPLETA DE USUÁRIOS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Display all users with formatted output
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "
db.users.find({}, {_id: 1, email: 1, role: 1, emailVerified: 1, createdAt: 1})
  .sort({createdAt: -1})
  .pretty()
" 2>/dev/null | grep -E "^\{|email|role|emailVerified|createdAt|_id|^\}"

echo ""
echo -e "${BLUE}╚═════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}💡 DICAS:${NC}"
echo "  • Promover a admin:    ./promover-admin.sh seu-email@example.com"
echo "  • Ver diagnóstico DB:  ./diagnostico-db.sh"
echo "  • Acessar Mongo Express: http://localhost:8081"
echo ""
