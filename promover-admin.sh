#!/bin/bash

##############################################################################
# Script: promover-admin.sh
# Description: Promote a user to admin role
# Usage: ./promover-admin.sh email@example.com
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}❌ Usage: $0 email@example.com${NC}"
    echo ""
    echo "Example:"
    echo "  ./promover-admin.sh user@example.com"
    exit 1
fi

EMAIL="$1"

echo -e "${BLUE}╔═════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PROJETO SASS - PROMOVER USUÁRIO A ADMIN                   ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if MongoDB is running
if ! docker compose ps mongo | grep -q "Up"; then
    echo -e "${RED}❌ MongoDB is not running${NC}"
    echo "Start services with: docker compose up -d"
    exit 1
fi

# Check if user exists
USER_EXISTS=$(docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "db.users.countDocuments({email: '$EMAIL'})" 2>/dev/null | tail -1)

if [ "$USER_EXISTS" == "0" ]; then
    echo -e "${RED}❌ Usuário com email '$EMAIL' não encontrado${NC}"
    echo ""
    echo "Usuários registrados:"
    ./listar-usuarios.sh 2>/dev/null | grep "email" | head -10
    exit 1
fi

# Get current role
CURRENT_ROLE=$(docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "db.users.findOne({email: '$EMAIL'}).role" 2>/dev/null | grep -oE "'[^']+'" | sed "s/'//g" | tail -1)

echo -e "${YELLOW}📋 INFORMAÇÕES DO USUÁRIO${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Email:        ${GREEN}$EMAIL${NC}"
echo -e "Role Atual:   ${YELLOW}$CURRENT_ROLE${NC}"
echo -e "Role Novo:    ${GREEN}admin${NC}"
echo ""

# Confirm action
echo -e "${YELLOW}⚠️  Tem certeza que deseja promover este usuário a admin?${NC}"
read -p "Digite 'sim' para confirmar: " CONFIRM

if [ "$CONFIRM" != "sim" ]; then
    echo -e "${RED}❌ Operação cancelada${NC}"
    exit 1
fi

# Update user role
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "
db.users.updateOne(
  { email: '$EMAIL' },
  { \$set: { role: 'admin' } }
)
" 2>/dev/null > /dev/null

# Verify update
NEW_ROLE=$(docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "db.users.findOne({email: '$EMAIL'}).role" 2>/dev/null | grep -oE "'[^']+'" | sed "s/'//g" | tail -1)

if [ "$NEW_ROLE" == "admin" ]; then
    echo -e "${GREEN}✓ Usuário promovido a admin com sucesso!${NC}"
    echo ""
    echo -e "${BLUE}📊 NOVO STATUS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "Email:        ${GREEN}$EMAIL${NC}"
    echo -e "Role Anterior:  ${YELLOW}$CURRENT_ROLE${NC}"
    echo -e "Role Atual:     ${GREEN}$NEW_ROLE${NC}"
else
    echo -e "${RED}❌ Erro ao atualizar o usuário${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}💡 PRÓXIMAS AÇÕES:${NC}"
echo "  • O usuário pode acessar: http://localhost/admin"
echo "  • Listar todos os admins: ./listar-usuarios.sh"
echo "  • Revogar acesso admin:   ./promover-admin.sh $EMAIL (e escolher 'user')"
echo ""
