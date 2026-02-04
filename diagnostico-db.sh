#!/bin/bash

##############################################################################
# Script: diagnostico-db.sh
# Description: Run comprehensive database diagnostics
# Usage: ./diagnostico-db.sh
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PROJETO SASS - DIAGNÓSTICO DE BANCO DE DADOS              ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if MongoDB is running
if ! docker compose ps mongo | grep -q "Up"; then
    echo -e "${RED}❌ MongoDB is not running${NC}"
    echo "Start services with: docker compose up -d"
    exit 1
fi

echo -e "${YELLOW}🔍 INFORMAÇÕES DO BANCO${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get database stats
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "
const stats = db.stats();
print('📊 Database Stats:');
print('  • Database: ' + stats.db);
print('  • Collections: ' + stats.collections);
print('  • Data Size: ' + formatBytes(stats.dataSize));
print('  • Index Size: ' + formatBytes(stats.indexSize));
print('  • Total Size: ' + formatBytes(stats.totalSize));
print('');
print('📦 Collections:');
db.getCollectionNames().forEach(col => {
  const count = db[col].countDocuments();
  const size = db[col].stats().size;
  print('  • ' + col + ': ' + count + ' docs (' + formatBytes(size) + ')');
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
" 2>/dev/null | grep -E "^[[:space:]]*•|^�|^Function"

echo ""
echo -e "${YELLOW}👥 ESTATÍSTICAS DE USUÁRIOS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# User statistics
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "
const total = db.users.countDocuments();
const verified = db.users.countDocuments({emailVerified: true});
const unverified = db.users.countDocuments({emailVerified: false});
const admins = db.users.countDocuments({role: 'admin'});

print('✓ Total Usuários: ' + total);
print('✓ Verificados: ' + verified);
print('✗ Não Verificados: ' + unverified);
print('🔑 Administradores: ' + admins);
print('');

print('📈 Distribuição por Role:');
db.users.aggregate([
  { \$group: { _id: '\$role', count: { \$sum: 1 } } },
  { \$sort: { count: -1 } }
]).forEach(row => {
  print('  • ' + row._id + ': ' + row.count);
});
" 2>/dev/null | grep -E "^[✓✗🔑|•|Total|Verificado|Administrador|Distribuição]"

echo ""
echo -e "${YELLOW}🕐 ÚLTIMAS 5 REGISTRAÇÕES${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "
db.users.find({}, {email: 1, role: 1, emailVerified: 1, createdAt: 1})
  .sort({createdAt: -1})
  .limit(5)
  .forEach(user => {
    const verified = user.emailVerified ? '✓' : '✗';
    const date = user.createdAt.toISOString().split('T')[0];
    print(verified + ' ' + user.email + ' [' + user.role + '] - ' + date);
  });
" 2>/dev/null | grep -E "^[✓✗]"

echo ""
echo -e "${YELLOW}🔗 CONEXÕES${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check connections
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme admin --eval "
const status = db.serverStatus();
print('✓ MongoDB Version: ' + db.version());
print('✓ Uptime: ' + Math.floor(status.uptime / 60) + ' minutes');
print('✓ Current Connections: ' + status.connections.current);
print('✓ Available Connections: ' + status.connections.available);
print('✓ Total Connections Created: ' + status.connections.totalCreated);
" 2>/dev/null | grep "^✓"

echo ""
echo -e "${YELLOW}⚙️  ÍNDICES${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme projeto-sass --eval "
print('Índices na coleção users:');
db.users.getIndexes().forEach(idx => {
  print('  • ' + Object.keys(idx.key).join(', '));
});
" 2>/dev/null | grep -E "^[Índices|•]"

echo ""
echo -e "${BLUE}╚═════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Diagnóstico completo!${NC}"
echo ""
echo -e "${BLUE}💡 COMANDOS RELACIONADOS:${NC}"
echo "  • Listar usuários:      ./listar-usuarios.sh"
echo "  • Promover a admin:     ./promover-admin.sh seu-email@example.com"
echo "  • Dashboard:            ./dashboard.sh"
echo ""
