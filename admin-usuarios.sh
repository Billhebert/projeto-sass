#!/bin/bash
# Painel de Administracao de Usuarios

TOKEN=$(grep "ADMIN_TOKEN" .env.production | cut -d'=' -f2)

case "$1" in
  listar-pendentes|pending)
    echo "=== USUARIOS AGUARDANDO APROVACAO ==="
    RESPONSE=$(curl -s "https://api.vendata.com.br/api/admin/users/pending" \
      -H "X-Admin-Token: $TOKEN")
    COUNT=$(echo $RESPONSE | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
    echo ""
    echo "Total: $COUNT"
    echo ""
    if [ -n "$COUNT" ] && [ "$COUNT" -gt 0 ]; then
      echo "$RESPONSE" | grep -o '"email":"[^"]*"' | sed 's/"email":"//;s/"//g' | while read email; do
        nome=$(echo "$RESPONSE" | grep -A2 "$email" | grep -o '"firstName":"[^"]*"' | sed 's/"firstName":"//;s/"//g' | head -1)
        sobrenome=$(echo "$RESPONSE" | grep -A3 "$email" | grep -o '"lastName":"[^"]*"' | sed 's/"lastName":"//;s/"//g' | head -1)
        criado=$(echo "$RESPONSE" | grep -A5 "$email" | grep -o '"createdAt":"[^"]*"' | sed 's/"createdAt":"//;s/"//g' | head -1 | cut -d'T' -f1)
        echo "----------------------------------------"
        echo "Email: $email"
        echo "Nome: $nome $sobrenome"
        echo "Criado: $criado"
        echo ""
      done
    else
      echo "Nenhum usuario pendente."
    fi
    ;;
  
  listar|todos)
    echo "=== TODOS OS USUARIOS ==="
    curl -s "https://api.vendata.com.br/api/admin/users" \
      -H "X-Admin-Token: $TOKEN" | grep -o '"email":"[^"]*"' | sed 's/"email":"//;s/"//g' | while read email; do
      status=$(echo "$RESPONSE" | grep -A2 "$email" | grep -o '"status":"[^"]*"' | sed 's/"status":"//;s/"//g' | head -1)
      verificado=$(echo "$RESPONSE" | grep -A3 "$email" | grep -o '"emailVerified":[^,}]*' | head -1)
      nome=$(echo "$RESPONSE" | grep -A4 "$email" | grep -o '"firstName":"[^"]*"' | sed 's/"firstName":"//;s/"//g' | head -1)
      echo "----------------------------------------"
      echo "Email: $email"
      echo "Nome: $nome"
      echo "Status: $status | Verificado: $verificado"
    done
    ;;
  
  aprovar)
    if [ -z "$2" ]; then
      echo "Uso: $0 aprovar email@dominio.com"
      exit 1
    fi
    EMAIL="$2"
    USER_ID=$(docker exec vendata-mongo mongosh --authenticationDatabase admin -u admin -p SecureMongo2024Vendata --quiet --eval "db.getCollection('users').findOne({email: '$EMAIL'})._id" projeto-sass 2>&1 | grep -o "ObjectId('[^']*')" | sed "s/ObjectId('//;s/'//")
    
    if [ -z "$USER_ID" ]; then
      echo "ERRO: Usuario nao encontrado!"
      exit 1
    fi
    
    echo "Aprovando usuario: $EMAIL (ID: $USER_ID)..."
    RESULT=$(curl -s -X POST "https://api.vendata.com.br/api/admin/users/$USER_ID/approve" \
      -H "X-Admin-Token: $TOKEN")
    
    echo "$RESULT" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"//g'
    ;;
  
  rejeitar)
    if [ -z "$2" ]; then
      echo "Uso: $0 rejeitar email@dominio.com"
      exit 1
    fi
    EMAIL="$2"
    USER_ID=$(docker exec vendata-mongo mongosh --authenticationDatabase admin -u admin -p SecureMongo2024Vendata --quiet --eval "db.getCollection('users').findOne({email: '$EMAIL'})._id" projeto-sass 2>&1 | grep -o "ObjectId('[^']*')" | sed "s/ObjectId('//;s/'//")
    
    if [ -z "$USER_ID" ]; then
      echo "ERRO: Usuario nao encontrado!"
      exit 1
    fi
    
    echo "Rejeitando usuario: $EMAIL..."
    RESULT=$(curl -s -X POST "https://api.vendata.com.br/api/admin/users/$USER_ID/reject" \
      -H "X-Admin-Token: $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"reason":"Rejeitado pelo administrador"}')
    
    echo "$RESULT" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"//g'
    ;;
  
  admin)
    if [ -z "$2" ]; then
      echo "Uso: $0 admin email@dominio.com"
      exit 1
    fi
    EMAIL="$2"
    USER_ID=$(docker exec vendata-mongo mongosh --authenticationDatabase admin -u admin -p SecureMongo2024Vendata --quiet --eval "db.getCollection('users').findOne({email: '$EMAIL'})._id" projeto-sass 2>&1 | grep -o "ObjectId('[^']*')" | sed "s/ObjectId('//;s/'//")
    
    RESULT=$(curl -s -X POST "https://api.vendata.com.br/api/admin/users/$USER_ID/make-admin" \
      -H "X-Admin-Token: $TOKEN")
    
    echo "$RESULT" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"//g'
    ;;
  
  status)
    if [ -z "$2" ]; then
      echo "Uso: $0 status email@dominio.com"
      exit 1
    fi
    EMAIL="$2"
    VERIFIED=$(docker exec vendata-mongo mongosh --authenticationDatabase admin -u admin -p SecureMongo2024Vendata --quiet --eval "db.getCollection('users').findOne({email: '$EMAIL'}).emailVerified" projeto-sass 2>&1)
    
    if [ "$VERIFIED" = "true" ]; then
      echo "Status: APROVADO"
    else
      echo "Status: AGUARDANDO APROVACAO"
    fi
    ;;
  
  *)
    echo "================================"
    echo "   PAINEL DE ADMINISTRACAO"
    echo "================================"
    echo ""
    echo "  ./admin-usuarios.sh listar-pendentes  - Lista usuarios aguardando aprovacao"
    echo "  ./admin-usuarios.sh listar            - Lista todos os usuarios"
    echo "  ./admin-usuarios.sh aprovar email     - Aprova um usuario"
    echo "  ./admin-usuarios.sh rejeitar email   - Rejeita/remove um usuario"
    echo "  ./admin-usuarios.sh admin email      - Torna usuario administrador"
    echo "  ./admin-usuarios.sh status email     - Verifica status do usuario"
    echo ""
    ;;
esac
