# Guia de Teste - OAuth Flow com Mercado Livre

## ⚙️ Preparação

### 1. Ter Credenciais Reais do Mercado Livre

Você precisa ter:
- **Client ID**: `1706187223829083`
- **Client Secret**: `vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG`
- **Redirect URI**: `https://www.vendata.com.br` (ou seu domínio local)

### 2. Iniciar Backend e Frontend

```bash
# Terminal 1 - Backend
cd backend
npm install
npm start
# Output: Server running on http://localhost:3011

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
# Output: Local: http://localhost:5173
```

### 3. Verificar Conexão com MongoDB

```bash
# Verifique que MongoDB está rodando
# Se usar Docker:
docker ps | grep mongo

# Ou localmente:
mongosh  # Se tiver MongoDB instalado
```

---

## 🧪 Teste 1: Gerar URL de Autorização

### Usando cURL

```bash
curl -X POST http://localhost:3011/api/auth/ml-oauth-url \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "1706187223829083",
    "clientSecret": "vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG",
    "redirectUri": "https://www.vendata.com.br/auth/callback"
  }'
```

### Resposta Esperada

```json
{
  "success": true,
  "data": {
    "authUrl": "https://auth.mercadolibre.com/authorization?client_id=1706187223829083&response_type=code&platform_id=MLB&redirect_uri=https%3A%2F%2Fwww.vendata.com.br%2Fauth%2Fcallback&state=abcdef123456...",
    "state": "abcdef123456..."
  }
}
```

### ✅ Validação
- Status HTTP: **200**
- `success`: **true**
- `data.authUrl` começa com **https://auth.mercadolibre.com**
- `data.state` é uma string hex com 64 caracteres

---

## 🧪 Teste 2: Troca de Código por Tokens

### Pré-requisito

Você precisa ter um código de autorização válido do Mercado Livre. Para obter:

1. Clique no `authUrl` do Teste 1
2. Faça login na sua conta Mercado Livre
3. Clique em "Autorizar"
4. Será redirecionado para: `https://www.vendata.com.br/auth/callback?code=TG-...&state=...`
5. Copie o código da URL

### Usando cURL

```bash
curl -X POST http://localhost:3011/api/auth/ml-token-exchange \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TG-697bd2e514e40100017d6586-1033763524",
    "clientId": "1706187223829083",
    "clientSecret": "vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG",
    "redirectUri": "https://www.vendata.com.br/auth/callback"
  }'
```

### Resposta Esperada

```json
{
  "success": true,
  "data": {
    "accessToken": "APP_USR-1706187223829083-012917-d02bfa822bba4c73b40bf1b66a470d0b-1033763524",
    "refreshToken": "TG-697bd31fb6ed3f0001a1ba4b-1033763524",
    "expiresIn": 21600,
    "tokenType": "Bearer",
    "userId": 1033763524,
    "scope": "offline_access read write urn:global:admin:info:/read-only ...",
    "obtainedAt": "2024-01-29T12:00:00.000Z"
  }
}
```

### ✅ Validação
- Status HTTP: **200**
- `success`: **true**
- `data.accessToken` começa com **APP_USR-**
- `data.refreshToken` começa com **TG-**
- `data.expiresIn`: **21600** (6 horas em segundos)
- `data.userId` é um número válido

---

## 🧪 Teste 3: Criar Conta com Tokens

### Pré-requisito

Você precisa ter um JWT token de autenticação. Para obter:

1. Registre-se em: `http://localhost:5173/register`
2. Faça login em: `http://localhost:5173/login`
3. Copie o JWT token do localStorage (DevTools Console):
   ```javascript
   console.log(localStorage.getItem('authToken'))
   ```

### Usando cURL

```bash
curl -X POST http://localhost:3011/api/ml-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "accessToken": "APP_USR-1706187223829083-012917-d02bfa822bba4c73b40bf1b66a470d0b-1033763524",
    "refreshToken": "TG-697bd31fb6ed3f0001a1ba4b-1033763524",
    "expiresIn": 21600,
    "clientId": "1706187223829083",
    "clientSecret": "vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG",
    "redirectUri": "https://www.vendata.com.br/auth/callback",
    "accountName": "Minha Loja Principal"
  }'
```

### Resposta Esperada

```json
{
  "success": true,
  "message": "Account added successfully",
  "data": {
    "id": "ml_1738088400000_abcdef123456",
    "userId": "user_id_here",
    "mlUserId": "1033763524",
    "nickname": "store_name",
    "email": "seller@example.com",
    "accountName": "Minha Loja Principal",
    "status": "active",
    "isPrimary": true,
    "syncEnabled": true,
    "cachedData": {
      "products": 0,
      "orders": 0,
      "issues": 0
    },
    "canAutoRefresh": true,
    "hasOAuthCredentials": true
  }
}
```

### ✅ Validação
- Status HTTP: **201**
- `success`: **true**
- `data.id` começa com **ml_**
- `data.status`: **active**
- `data.canAutoRefresh`: **true** (porque temos refresh token + client credentials)
- `data.hasOAuthCredentials`: **true**

---

## 🧪 Teste 4: Verificar Conta Criada

### Usando cURL

```bash
curl -X GET http://localhost:3011/api/ml-accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Resposta Esperada

```json
{
  "success": true,
  "data": [
    {
      "id": "ml_1738088400000_abcdef123456",
      "mlUserId": "1033763524",
      "nickname": "store_name",
      "email": "seller@example.com",
      "accountName": "Minha Loja Principal",
      "status": "active",
      "isPrimary": true,
      "syncEnabled": true,
      "cachedData": {
        "products": 0,
        "orders": 0,
        "issues": 0
      },
      "canAutoRefresh": true,
      "hasOAuthCredentials": true
    }
  ]
}
```

### ✅ Validação
- Status HTTP: **200**
- Array contém a conta criada
- `canAutoRefresh` está **true**

---

## 🧪 Teste 5: Verificar Status do Token

### Usando cURL

```bash
curl -X GET http://localhost:3011/api/ml-accounts/ml_1738088400000_abcdef123456/token-info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Resposta Esperada

```json
{
  "success": true,
  "data": {
    "tokenValid": true,
    "expiresAt": "2024-01-29T18:00:00.000Z",
    "expiresIn": 21555,
    "canAutoRefresh": true,
    "hasRefreshToken": true,
    "lastRefresh": null,
    "nextRefreshNeeded": "2024-01-29T17:55:00.000Z"
  }
}
```

### ✅ Validação
- Status HTTP: **200**
- `data.tokenValid`: **true**
- `data.canAutoRefresh`: **true**
- `data.hasRefreshToken`: **true**
- `data.expiresIn`: Um número positivo < 21600

---

## 🔄 Teste 6: Renovação Automática de Token

### Setup
1. Complete o Teste 3 (criar conta)
2. Aguarde o job de renovação (executa a cada hora em :00)
3. Ou teste manualmente

### Manual - Forçar Renovação

```bash
# Via endpoint (se existir - adicionar se necessário)
curl -X POST http://localhost:3011/api/ml-accounts/ml_1738088400000_abcdef123456/refresh-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Verificar via MongoDB

```bash
# Terminal
mongosh

# Dentro do mongosh
use seu_database_nome
db.ml_accounts.findOne({_id: "ml_1738088400000_abcdef123456"})

# Observar campos:
# - accessToken (será diferente se renovado)
# - refreshToken (será diferente se renovado)
# - tokenExpiresAt (será atualizado)
# - lastTokenRefresh (será preenchido)
```

### ✅ Validação
- `lastTokenRefresh` será atualizado para agora
- `tokenExpiresAt` será 6 horas no futuro
- `accessToken` e `refreshToken` serão diferentes

---

## 📊 Teste 7: Verificar Logs

### Logs do Backend

```bash
# Em tempo real
docker logs -f projeto-sass-backend

# Ou se rodar localmente, veja o terminal onde npm start está rodando
```

### O que procurar

```
[INFO] OAUTH_URL_GENERATED
[INFO] EXCHANGE_CODE_START
[INFO] EXCHANGE_CODE_SUCCESS
[INFO] ML_ACCOUNT_ADDED
[INFO] TOKEN_REFRESH_JOB_START
[INFO] TOKEN_REFRESH_START
[INFO] TOKEN_REFRESH_SUCCESS
```

### Erros Comuns

```
[ERROR] EXCHANGE_CODE_ERROR: Invalid client_secret
[ERROR] TOKEN_REFRESH_FAILED: No client credentials available
[ERROR] GET_ML_USER_INFO_ERROR: Invalid access token
```

---

## 🎯 Teste Integrado (Frontend)

### Fluxo Completo via UI

1. **Ir para** `http://localhost:5173/accounts`
2. **Clicar em** "Conectar com Mercado Livre"
3. **Preencher**:
   - Client ID: `1706187223829083`
   - Client Secret: `vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG`
   - Redirect URI: `http://localhost:5173/auth/callback`
4. **Clicar** "Gerar URL de Autorização"
5. **Clicar** "Conectar com Mercado Livre"
6. **Autorizar** na página do Mercado Livre
7. **Ver** sucesso em `http://localhost:5173/auth/callback`
8. **Ser redirecionado** para `/accounts`
9. **Ver** a conta listada com "🔄 Auto-refresh ativo"

### ✅ Validação
- Conta aparece na lista
- Status token mostra "Auto-refresh ativo"
- Nenhum erro no console

---

## 🚨 Troubleshooting

### Erro: "Invalid client_secret"

```
message: "Failed to exchange code for token"
mlError: "invalid_request"
mlErrorDescription: "Invalid client_secret"
```

**Solução:**
- Verifique se `clientSecret` está correto
- Se alterar a secret, gere uma nova no developers.mercadolibre.com

### Erro: "Invalid redirect_uri"

```
message: "Failed to exchange code for token"
mlError: "invalid_request"
mlErrorDescription: "Invalid redirect_uri"
```

**Solução:**
- Verifique se `redirectUri` matches exatamente o cadastrado no app Mercado Livre
- Cuidado com http vs https

### Erro: "Invalid authorization code"

```
message: "Failed to exchange code for token"
mlError: "invalid_request"
mlErrorDescription: "Invalid authorization code"
```

**Solução:**
- O código expirou (válido por ~10 minutos)
- Gere um novo código iniciando o flow de novo

### Token não renova automaticamente

**Checklist:**
1. Conta foi criada com `clientId`? → `db.ml_accounts.findOne()` → check `clientId`
2. Conta foi criada com `clientSecret`? → check `clientSecret`
3. Conta tem `refreshToken`? → check `refreshToken`
4. Backend está rodando? → `docker ps` ou `npm start`
5. Job está rodando? → Procure `TOKEN_REFRESH_JOB_START` nos logs
6. `nextTokenRefreshNeeded` já passou? → Check data no MongoDB

---

## 📝 Documentação Relacionada

- [OAUTH_FLOW_COMPLETE.md](./OAUTH_FLOW_COMPLETE.md) - Fluxo técnico completo
- [TOKEN_REFRESH_GUIDE.md](./TOKEN_REFRESH_GUIDE.md) - Guia de renovação automática
- [QUICK_START_NEXT_SESSION.md](./QUICK_START_NEXT_SESSION.md) - Quick start para próxima sessão

---

## 💡 Dicas de Desenvolvimento

### Usar Postman/Insomnia

Em vez de cURL, pode usar aplicações como Postman:

1. Criar novo Request
2. Method: POST
3. URL: `http://localhost:3011/api/auth/ml-oauth-url`
4. Headers: `Content-Type: application/json`
5. Body:
   ```json
   {
     "clientId": "1706187223829083",
     "clientSecret": "vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG",
     "redirectUri": "https://www.vendata.com.br/auth/callback"
   }
   ```
6. Click Send

### Debug via Console do Navegador

```javascript
// Ver tokens salvos
console.log(sessionStorage.getItem('ml_oauth_config'))

// Ver JWT
console.log(localStorage.getItem('authToken'))

// Fazer requisição
fetch('http://localhost:3011/api/ml-accounts', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json()).then(console.log)
```

### Ver Banco de Dados

```bash
# Conectar ao MongoDB
mongosh

# Listar databases
show dbs

# Usar database
use seu_database_nome

# Ver coleções
show collections

# Ver contas
db.ml_accounts.find().pretty()

# Ver uma conta específica
db.ml_accounts.findOne({mlUserId: "1033763524"})

# Contar contas
db.ml_accounts.countDocuments()
```
