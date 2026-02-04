#!/bin/bash
# Promover usuário a administrador
# Uso: ./promover-admin.sh email@dominio.com

if [ -z "$1" ]; then
    echo "❌ ERRO: Informe o email do usuário"
    echo "Uso: $0 email@dominio.com"
    exit 1
fi

EMAIL="$1"

echo "=== PROMOVER USUÁRIO A ADMINISTRADOR ==="
echo ""
echo "Email: $EMAIL"
echo ""

RESULT=$(docker exec vendata-mongo mongosh --authenticationDatabase admin -u admin -p SecureMongo2024Vendata --quiet --eval "
var user = db.getCollection('users').findOne({email: '$EMAIL'});
if (user) {
  db.getCollection('users').updateOne(
    {email: '$EMAIL'},
    {\$set: {role: 'admin', permissions: ['all']}}
  );
  print('OK');
} else {
  print('NOT_FOUND');
}
" projeto-sass 2>&1 | grep -v "^switched")

if [ "$RESULT" = "OK" ]; then
    echo "✅ SUCESSO: Usuário promovido a administrador!"
    echo ""
    docker exec vendata-mongo mongosh --authenticationDatabase admin -u admin -p SecureMongo2024Vendata --quiet --eval "
    var user = db.getCollection('users').findOne({email: '$EMAIL'});
    print('Email: ' + user.email);
    print('Nome: ' + user.firstName + ' ' + user.lastName);
    print('Cargo: ' + user.role);
    " projeto-sass 2>&1 | grep -v "^switched"
elif [ "$RESULT" = "NOT_FOUND" ]; then
    echo "❌ ERRO: Usuário não encontrado!"
else
    echo "❌ ERRO: $RESULT"
fi
