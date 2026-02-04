#!/bin/bash
# Listar usuários aguardando aprovação

echo "=== USUÁRIOS AGUARDANDO APROVAÇÃO ==="
echo ""

TOKEN=$(grep "ADMIN_TOKEN" .env.production | cut -d'=' -f2)

RESPONSE=$(curl -s "https://api.vendata.com.br/api/admin/users/pending" \
  -H "X-Admin-Token: $TOKEN")

COUNT=$(echo $RESPONSE | jq -r '.data.count')

echo "Total de usuários pendentes: $COUNT"
echo ""

if [ "$COUNT" -gt 0 ]; then
  echo $RESPONSE | jq -r '.data.users[] | "📧 Email: \(.email)\n👤 Nome: \(.firstName) \(.lastName)\n📅 Criado em: \(.createdAt)\n🆔 ID: \(.id)\n"' 2>/dev/null || echo "$RESPONSE"
else
  echo "Nenhum usuário pendente."
fi
