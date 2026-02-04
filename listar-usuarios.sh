#!/bin/bash
# Listar todos os usuários cadastrados

echo "=== USUÁRIOS CADASTRADOS ==="
echo ""

docker exec vendata-mongo mongosh --authenticationDatabase admin -u admin -p SecureMongo2024Vendata --quiet --eval "
db.getCollection('users').find({}).forEach(function(user) {
  print('─────────────────────────────────────────');
  print('Email: ' + user.email);
  print('Nome: ' + user.firstName + ' ' + user.lastName);
  print('Status: ' + user.status);
  print('Email Verificado: ' + (user.emailVerified ? 'Sim' : 'Não'));
  print('Cargo: ' + user.role);
  print('Último Login: ' + (user.lastLogin ? user.lastLogin : 'Nunca'));
  print('Criado em: ' + user.createdAt);
});
" projeto-sass 2>&1 | grep -v "^switched" | grep -v "^  "

echo ""
echo "=== FIM DA LISTA ==="
