#!/bin/bash
# Aprovar usuário

if [ -z "$1" ]; then
    echo "❌ ERRO: Informe o email do usuário"
    echo "Uso: $0 email@dominio.com"
    exit 1
fi

EMAIL="$1"

echo "=== APROVAR USUÁRIO ==="
echo ""
echo "Email: $EMAIL"
echo ""

TOKEN=$(grep "ADMIN_TOKEN" .env.production | cut -d'=' -f2)

# Buscar usuário
USER_ID=$(docker exec vendata-mongo mongosh --authenticationDatabase admin -u admin -p SecureMongo2024Vendata --quiet --eval "db.getCollection('users').findOne({email: '$EMAIL'})._id" projeto-sass 2>&1 | grep -o "ObjectId('[^']*')" | sed "s/ObjectId('//;s/'//")

if [ -z "$USER_ID" ]; then
    echo "❌ ERRO: Usuário não encontrado!"
    exit 1
fi

echo "ID do usuário: $USER_ID"
echo ""

RESULT=$(curl -s -X POST "https://api.vendata.com.br/api/admin/users/$USER_ID/approve" \
  -H "X-Admin-Token: $TOKEN")

if echo $RESULT | jq -r '.success' 2>/dev/null | grep -q "true"; then
    echo "✅ SUCESSO!"
    echo "$RESULT" | jq -r '.message'
else
    echo "❌ ERRO!"
    echo "$RESULT" | jq -r '.error'
fi
