# Troubleshooting - Deletar Contas Mercado Livre

## ✅ Teste Rápido

### 1. Verificar se as contas aparecem

```bash
# Use o debug endpoint para ver o userId e contas do usuário
curl http://localhost:3011/api/ml-accounts/debug/user-info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Resposta esperada:**
```json
{
  "debug": true,
  "userFromToken": {
    "userId": "user_id_from_token",
    "username": "seu_username"
  },
  "accountsFound": 2,
  "accounts": [
    {
      "id": "ml_1738088400000_abc123",
      "mlUserId": "1033763524",
      "nickname": "store_name",
      "email": "seller@example.com",
      "status": "active",
      "isPrimary": true
    }
  ]
}
```

### 2. Tentar deletar via cURL

```bash
curl -X DELETE http://localhost:3011/api/ml-accounts/ml_1738088400000_abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Account removed successfully",
  "data": {
    "accountId": "ml_1738088400000_abc123",
    "mlUserId": "1033763524"
  }
}
```

---

## 🔍 Se Não Funcionar

### Erro 1: "Account not found" (404)

**Possíveis Causas:**
1. ❌ `userId` no token não corresponde ao `userId` da conta
2. ❌ `accountId` está inválido ou não existe
3. ❌ Conta foi deletada por outro usuário

**Debug:**
```bash
# 1. Verificar userId do token
curl http://localhost:3011/api/ml-accounts/debug/user-info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.userFromToken.userId'

# 2. Listar todas as contas do usuário
curl http://localhost:3011/api/ml-accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.data.accounts[].id'

# 3. Comparar os IDs
# Se não bater, o token está inválido ou expirado
```

**Solução:**
- Re-fazer login para obter novo JWT token
- Copiar `accountId` exatamente do passo 2 acima

### Erro 2: "Unauthorized" (401)

**Possível Causa:**
- JWT token expirou ou é inválido

**Solução:**
1. Faça logout em `http://localhost:5173/`
2. Faça login novamente
3. Copie o novo token de `localStorage.authToken`
4. Tente deletar novamente

### Erro 3: "Internal Server Error" (500)

**Possíveis Causas:**
1. ❌ MongoDB não está rodando
2. ❌ Erro ao atualizar contador de contas
3. ❌ Erro ao reatribuir conta primária

**Debug:**
```bash
# Ver logs do backend
docker logs -f projeto-sass-backend

# Ou se rodar localmente:
# Terminal do npm start mostra logs automaticamente

# Procurar por:
# - DELETE_ML_ACCOUNT_ERROR
# - DELETE_ML_ACCOUNT_START
# - DELETE_ML_ACCOUNT_SUCCESS
```

---

## 🧪 Teste Completo (Passo a Passo)

### Passo 1: Obter JWT Token

```bash
# Registrar-se
curl -X POST http://localhost:3011/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }' | jq '.data.token'

# OU fazer login se já tiver conta
curl -X POST http://localhost:3011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }' | jq '.data.token'

# Copiar o token retornado
export JWT_TOKEN="seu_token_aqui"
```

### Passo 2: Criar uma Conta de Teste

```bash
# Você precisa ter um token Mercado Livre válido
# Se não tiver, siga OAUTH_TESTING_GUIDE.md para obter um

curl -X POST http://localhost:3011/api/ml-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "accessToken": "APP_USR-1706187223829083-012917-...",
    "refreshToken": "TG-697bd31fb6ed3f0001a1ba4b-...",
    "expiresIn": 21600,
    "clientId": "1706187223829083",
    "clientSecret": "vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG",
    "redirectUri": "http://localhost:5173/auth/callback"
  }' | jq '.data.id'

# Copiar o accountId retornado
export ACCOUNT_ID="ml_..."
```

### Passo 3: Verificar Conta Criada

```bash
curl -X GET http://localhost:3011/api/ml-accounts \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data.accounts'
```

**Resposta esperada:**
```json
{
  "accounts": [
    {
      "id": "ml_1738088400000_abc123",
      "mlUserId": "1033763524",
      "nickname": "store_name",
      "status": "active"
    }
  ],
  "total": 1
}
```

### Passo 4: Deletar Conta

```bash
curl -X DELETE http://localhost:3011/api/ml-accounts/$ACCOUNT_ID \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Account removed successfully",
  "data": {
    "accountId": "ml_1738088400000_abc123",
    "mlUserId": "1033763524"
  }
}
```

### Passo 5: Verificar Que Foi Deletada

```bash
curl -X GET http://localhost:3011/api/ml-accounts \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data.accounts'
```

**Resposta esperada:**
```json
{
  "accounts": [],
  "total": 0
}
```

---

## 🎯 Deletar via Frontend

### Na Página de Contas

1. Ir para `http://localhost:5173/accounts`
2. Procurar por "Deletar" botão de cor vermelha
3. Clicar no botão "Deletar"
4. Confirmar a deleção na caixa de diálogo
5. Ver mensagem "Conta deletada com sucesso!"
6. Conta desaparece da lista

### Se Não Funcionar no Frontend

**Checklist:**
- [ ] Você fez login?
- [ ] Há contas listadas?
- [ ] Botão "Deletar" está visível?
- [ ] Caixa de confirmação apareceu?
- [ ] Erro aparece no topo da página?

**Se há erro:**
1. Abrir DevTools (F12)
2. Ir para aba "Console"
3. Procurar mensagens de erro vermelhas
4. Copiar a mensagem de erro
5. Seguir o Erro X acima baseado na mensagem

---

## 📊 Ver no MongoDB

### Verificar se Conta Foi Deletada

```bash
# Terminal
mongosh

# Dentro do mongosh
use seu_database_nome

# Ver todas as contas
db.ml_accounts.find().pretty()

# Ver contas de um usuário específico
db.ml_accounts.find({userId: "seu_user_id"}).pretty()

# Contar total de contas
db.ml_accounts.countDocuments()
```

---

## 🔧 Se Ainda Não Funcionar

### 1. Limpar e Recomeçar

```bash
# Deletar conta do banco manualmente
mongosh

use seu_database_nome

# Ver a conta
db.ml_accounts.findOne({mlUserId: "1033763524"})

# Deletar
db.ml_accounts.deleteOne({mlUserId: "1033763524"})

# Confirmar
db.ml_accounts.find().pretty()
```

### 2. Verificar Logs

```bash
# Backend logs
docker logs projeto-sass-backend | grep DELETE

# Procurar por:
# DELETE_ML_ACCOUNT_START
# DELETE_ML_ACCOUNT_SUCCESS
# DELETE_ML_ACCOUNT_ERROR
# DELETE_ML_ACCOUNT_NOT_FOUND
```

### 3. Reiniciar Backend

```bash
# Se usar Docker
docker-compose restart backend

# Se rodar localmente
# Ctrl+C no terminal do npm start
# npm start
```

### 4. Verificar Autenticação

```bash
# Seu JWT token está válido?
curl http://localhost:3011/api/auth/verify \
  -H "Authorization: Bearer $JWT_TOKEN"

# Resposta esperada:
# {"success": true, "user": {...}}

# Se não funcionar, re-fazer login
```

---

## 💡 Dicas

1. **Use o debug endpoint sempre:**
   ```bash
   curl http://localhost:3011/api/ml-accounts/debug/user-info \
     -H "Authorization: Bearer $JWT_TOKEN"
   ```

2. **Mantenha os IDs exatos:**
   ```bash
   # Copiar IDs com jq para evitar erros de digitação
   curl ... | jq '.data.accounts[0].id'
   ```

3. **Teste via cURL antes de usar Frontend:**
   - Menos distrações
   - Respostas mais claras
   - Mais fácil debugar

4. **Guarde o accountId quando criar:**
   ```bash
   export ACCOUNT_ID=$(curl ... | jq -r '.data.id')
   ```

---

## 📞 Contactar Suporte

Se nada acima funcionar:

1. Verificar logs:
   ```bash
   docker logs projeto-sass-backend > backend.log
   ```

2. Coletar informações:
   - Status do backend (rodando?)
   - MongoDB conectado?
   - JWT token válido?
   - accountId correto?
   - userId correto?

3. Compartilhar:
   - Os comandos que rodou
   - As respostas exatas
   - Os logs do backend
