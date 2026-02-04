#!/bin/bash

clear

echo "╔═════════════════════════════════════════════════════════════════╗"
echo "║           PROJETO SASS - DASHBOARD                             ║"
echo "║           $(date '+%d/%m/%Y %H:%M:%S')                          ║"
echo "╚═════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Status dos serviços
echo "🔹 STATUS DOS SERVIÇOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose ps --format "table {{.Names}}\t{{.Status}}" | sed 's/projeto-sass-//'
echo ""

# 2. Informações do Banco
echo "🔹 BANCO DE DADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme --quiet <<MONGO 2>/dev/null
use("projeto-sass");
const users = db.users.countDocuments({});
const verified = db.users.countDocuments({ emailVerified: true });
const admins = db.users.countDocuments({ role: "admin" });
console.log("👤 Total de Usuários: " + users);
console.log("✓ Verificados: " + verified);
console.log("🔑 Administradores: " + admins);
MONGO
echo ""

# 3. API Status
echo "🔹 API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HEALTH=$(curl -s http://localhost:3011/health 2>/dev/null)
if [ ! -z "$HEALTH" ]; then
  echo "✓ Health: OK"
  echo "$HEALTH" | grep -q '"mongodb":{"connected":true}' && echo "✓ MongoDB: Conectado" || echo "✗ MongoDB: Desconectado"
else
  echo "✗ API não respondendo"
fi
echo ""

# 4. URLs de acesso
echo "🔹 ACESSOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Frontend: http://localhost:5173"
echo "📊 Mongo Express: http://localhost:8081"
echo "🔌 API: http://localhost:3011"
echo "⚙️  Admin Panel: http://localhost/admin"
echo ""

# 5. Últimos usuários
echo "🔹 ÚLTIMOS 3 USUÁRIOS REGISTRADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose exec -T mongo mongosh --authenticationDatabase admin -u admin -p changeme --quiet <<MONGO 2>/dev/null
use("projeto-sass");
db.users.find({}, { email: 1, createdAt: 1, role: 1, emailVerified: 1 })
  .sort({ createdAt: -1 })
  .limit(3)
  .forEach((u, i) => {
    const role = u.role || "user";
    const verified = u.emailVerified ? "✓" : "✗";
    console.log((i+1) + ". " + u.email + " [" + role + "] " + verified);
  });
MONGO
echo ""

# 6. Comandos úteis
echo "🔹 COMANDOS ÚTEIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Ver todos os usuários:    ./listar-usuarios.sh"
echo "🔑 Promover a admin:         ./promover-admin.sh seu-email@example.com"
echo "🔍 Diagnóstico DB:           ./diagnostico-db.sh"
echo "🐳 Logs API:                 docker compose logs api -f"
echo "🛑 Parar serviços:           docker compose down"
echo "▶️  Iniciar serviços:         docker compose up -d"
echo ""

echo "╚═════════════════════════════════════════════════════════════════╝"
