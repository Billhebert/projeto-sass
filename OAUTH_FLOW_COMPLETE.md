# OAuth 2.0 Flow com Mercado Livre - Guia Completo

## 📋 Visão Geral

Este documento descreve o fluxo completo de autenticação OAuth 2.0 com Mercado Livre, incluindo:
- Geração de URLs de autorização
- Troca de código por tokens
- Armazenamento seguro de credenciais
- Renovação automática de tokens

## 🔄 Fluxo OAuth Completo

### 1. Cliente Fornece Credenciais
O cliente fornece suas credenciais da aplicação Mercado Livre:

```json
{
  "client_id": "1706187223829083",
  "client_secret": "vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG",
  "redirect_uri": "https://www.vendata.com.br/auth/callback"
}
```

**Campo** | **Descrição**
---|---
`client_id` | ID único da aplicação no Mercado Livre (obtido em developers.mercadolibre.com)
`client_secret` | Chave secreta da aplicação (mantém segura!)
`redirect_uri` | URL para onde o Mercado Livre redireciona após autenticação

### 2. Frontend Requisita URL de Autorização

**Endpoint:** `POST /api/auth/ml-oauth-url`

**Request:**
```json
{
  "clientId": "1706187223829083",
  "clientSecret": "vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG",
  "redirectUri": "https://www.vendata.com.br/auth/callback"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://auth.mercadolibre.com/authorization?client_id=...&state=...",
    "state": "random_string_for_csrf_protection"
  }
}
```

**Fluxo no Frontend:**
```javascript
// 1. Usuário clica "Conectar com Mercado Livre"
// 2. Frontend salva credenciais em sessionStorage
sessionStorage.setItem('ml_oauth_config', JSON.stringify({
  clientId,
  clientSecret,
  redirectUri
}));

// 3. Frontend redireciona para o authUrl
window.location.href = authUrl;
```

### 3. Mercado Livre Redireciona com Código

Após autenticação, Mercado Livre redireciona para:
```
https://www.vendata.com.br/auth/callback?code=TG-697bd2e514e40900017d6586-1033763524&state=xyz
```

### 4. Frontend Troca Código por Tokens

**Endpoint:** `POST /api/auth/ml-token-exchange`

**Request:**
```json
{
  "code": "TG-697bd2e514e40900017d6586-1033763524",
  "clientId": "1706187223829083",
  "clientSecret": "vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG",
  "redirectUri": "https://www.vendata.com.br/auth/callback"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "APP_USR-1706187223829083-012917-d02bfa822bba4c73b40bf1b66a470d0b-1033763524",
    "refreshToken": "TG-697bd31fb6ed3f0001a1ba4b-1033763524",
    "expiresIn": 21600,
    "tokenType": "Bearer",
    "userId": 1033763524,
    "scope": "offline_access read write ...",
    "obtainedAt": "2024-01-29T12:00:00.000Z"
  }
}
```

**Token Lifecycle:**
- **Access Token**: Válido por 6 horas (21600 segundos)
- **Refresh Token**: Válido por 6 meses
- **Novo Refresh Token**: Cada refresh gera um novo refresh token (single-use)

### 5. Frontend Cria Conta com Tokens

**Endpoint:** `POST /api/ml-accounts`

**Request:**
```json
{
  "accessToken": "APP_USR-1706187223829083-012917-...",
  "refreshToken": "TG-697bd31fb6ed3f0001a1ba4b-...",
  "expiresIn": 21600,
  "clientId": "1706187223829083",
  "clientSecret": "vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG",
  "redirectUri": "https://www.vendata.com.br/auth/callback"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account added successfully",
  "data": {
    "id": "ml_1234567890_abcdef",
    "mlUserId": "1033763524",
    "nickname": "store_name",
    "email": "seller@example.com",
    "status": "active",
    "canAutoRefresh": true,
    "hasOAuthCredentials": true
  }
}
```

## 💾 Armazenamento de Dados

### MLAccount Model

```javascript
{
  // Tokens
  accessToken: String,          // Token de acesso (6 horas)
  refreshToken: String,         // Token para renovação (6 meses)
  tokenExpiresAt: Date,        // Quando o access token expira
  
  // OAuth Credentials
  clientId: String,            // App ID do cliente
  clientSecret: String,        // App Secret do cliente
  redirectUri: String,         // URI de redirecionamento
  
  // Tracking
  lastTokenRefresh: Date,
  nextTokenRefreshNeeded: Date,
  tokenRefreshStatus: String,  // 'pending', 'success', 'failed'
  tokenRefreshError: String
}
```

**IMPORTANTE:** `clientId` e `clientSecret` são salvos no banco de dados para permitir renovação automática. Eles são necessários para o refresh_token grant.

## 🔄 Renovação Automática de Tokens

### Background Job

O servidor executa um job a cada hora (`0 * * * *`) que:

1. **Encontra contas que precisam renovar:**
   ```javascript
   MLAccount.find({
     refreshToken: { $exists: true, $ne: null },
     clientId: { $exists: true, $ne: null },
     clientSecret: { $exists: true, $ne: null },
     status: { $in: ['active', 'paused'] },
     $or: [
       { nextTokenRefreshNeeded: { $lte: new Date() } },
       { lastTokenRefresh: null }
     ]
   })
   ```

2. **Renova cada token:**
   ```javascript
   // POST para Mercado Livre OAuth endpoint
   POST https://api.mercadolibre.com/oauth/token
   {
     "grant_type": "refresh_token",
     "client_id": account.clientId,
     "client_secret": account.clientSecret,
     "refresh_token": account.refreshToken
   }
   ```

3. **Resposta do Mercado Livre:**
   ```json
   {
     "access_token": "APP_USR-...-novo",
     "refresh_token": "TG-...-novo",
     "expires_in": 21600,
     "token_type": "Bearer",
     "user_id": 1033763524,
     "scope": "offline_access read write ..."
   }
   ```

4. **Salva novos tokens:**
   ```javascript
   account.accessToken = response.access_token;
   account.refreshToken = response.refresh_token;
   account.tokenExpiresAt = new Date(Date.now() + 21600 * 1000);
   account.lastTokenRefresh = new Date();
   account.nextTokenRefreshNeeded = new Date(tokenExpiresAt - 5 * 60 * 1000); // 5 min antes
   await account.save();
   ```

### Timing de Renovação

```
Token Obtido: 12:00
Expira: 18:00 (6 horas depois)
Próxima renovação marcada: 17:55 (5 minutos antes de expirar)

Job executa toda hora em :00
  - 13:00: Sem renovação (falta 5 horas)
  - 14:00: Sem renovação (falta 4 horas)
  - ...
  - 17:00: Sem renovação (falta 1 hora)
  - 18:00: RENOVA (token já expirou ou vai expirar em 5 min)
```

**Resultado:** Token sempre renovado antes de expirar, com margem de 5 minutos

## 📊 Estados da Renovação

```
tokenRefreshStatus pode ser:
- null: Nunca tentou renovar (token manual)
- 'pending': Aguardando renovação
- 'in_progress': Renovação em andamento
- 'success': Última renovação bem-sucedida
- 'failed': Última tentativa de renovação falhou
```

Se falhar, o job tenta novamente em 1 hora.

## 🔐 Segurança

### O que é Armazenado

✅ **SEGURO - Armazenado no banco de dados:**
- `clientId` - ID da aplicação (público em parte)
- `clientSecret` - Chave secreta (CRÍTICA - proteger!)
- `accessToken` - Token de acesso
- `refreshToken` - Token de renovação

❌ **NUNCA Enviado para Frontend:**
- Nenhum token é devolvido ao cliente em respostas normais
- Credenciais são usadas apenas no backend

### Proteção de Estado (CSRF)

A geração de URL inclui parâmetro `state`:
```javascript
const state = crypto.randomBytes(32).toString('hex');
const authUrl = `https://auth.mercadolibre.com/authorization?
  client_id=...&
  state=${state}&
  ...
`;
```

**TODO:** Validar estado no callback para proteger contra ataques CSRF

## 🧪 Testando o Fluxo

### 1. Com cURL - Gerar URL
```bash
curl -X POST http://localhost:3011/api/auth/ml-oauth-url \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "1706187223829083",
    "clientSecret": "vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG",
    "redirectUri": "https://www.vendata.com.br/auth/callback"
  }'
```

### 2. Com cURL - Trocar Código por Token
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

### 3. Com cURL - Criar Conta
```bash
curl -X POST http://localhost:3011/api/ml-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "accessToken": "APP_USR-...",
    "refreshToken": "TG-...",
    "expiresIn": 21600,
    "clientId": "1706187223829083",
    "clientSecret": "vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG",
    "redirectUri": "https://www.vendata.com.br/auth/callback"
  }'
```

## 🚨 Troubleshooting

### Token Refresh Falha

**Error:** `TOKEN_REFRESH_FAILED`

**Possíveis Causas:**
1. `clientSecret` inválido ou expirado
2. `refreshToken` já foi usado (não pode reutilizar)
3. Mercado Livre API indisponível
4. Conta desconectada no Mercado Livre

**Solução:**
- Verificar logs: `docker logs projeto-sass-backend`
- Re-autenticar pela interface

### Token não renova automaticamente

**Checklist:**
- [ ] Conta tem `refreshToken`? `db.ml_accounts.findOne({_id: ...})` - check `refreshToken` field
- [ ] Conta tem `clientId`? Check `clientId` field
- [ ] Conta tem `clientSecret`? Check `clientSecret` field
- [ ] Job está rodando? Check logs para `TOKEN_REFRESH_JOB_START`
- [ ] `nextTokenRefreshNeeded` foi marcada? Check date field

## 📝 Logs Disponíveis

### Backend Logs

```bash
# Ver logs do backend em tempo real
docker logs -f projeto-sass-backend

# Ou se rodar localmente:
npm start  # Terminal mostra logs automático
```

### Log Events

```javascript
// Geração de URL
action: 'OAUTH_URL_GENERATED'

// Troca de código
action: 'EXCHANGE_CODE_START'
action: 'EXCHANGE_CODE_SUCCESS'
action: 'EXCHANGE_CODE_ERROR'

// Criação de conta
action: 'ML_ACCOUNT_ADDED'
action: 'ADD_ML_ACCOUNT_ERROR'

// Renovação de token
action: 'TOKEN_REFRESH_JOB_START'
action: 'TOKEN_REFRESH_START'
action: 'TOKEN_REFRESH_SUCCESS'
action: 'TOKEN_REFRESH_FAILED'
```

## 🔗 Endpoints Relacionados

### Autenticação

```
POST /api/auth/ml-oauth-url          - Gerar URL de autorização
POST /api/auth/ml-token-exchange     - Trocar código por tokens
GET  /api/auth/ml-app-token          - Token server-to-server
```

### Contas

```
POST /api/ml-accounts                - Criar conta com tokens
GET  /api/ml-accounts                - Listar contas do usuário
GET  /api/ml-accounts/:accountId     - Detalhes da conta
PUT  /api/ml-accounts/:accountId     - Atualizar conta
DELETE /api/ml-accounts/:accountId   - Desconectar conta
GET  /api/ml-accounts/:accountId/token-info  - Status do token
```

## ✅ Checklist de Implementação

- [x] OAuth URL generation com credenciais do cliente
- [x] Token exchange com credenciais do cliente
- [x] Armazenamento de clientId e clientSecret no banco
- [x] Renovação automática usando credenciais do cliente
- [x] Logging estruturado de operações OAuth
- [x] Tratamento de erros robusto
- [ ] Validação de state parameter (CSRF protection)
- [ ] Token revocation ao desconectar conta
- [ ] Rate limiting para endpoints OAuth
- [ ] Audit trail completo de operações de token

## 🎯 Próximos Passos

1. **Implementar PKCE** - Adicionar camada extra de segurança (RFC 7636)
2. **Validar State** - Armazenar e validar state parameter server-side
3. **Token Revocation** - Revogar tokens quando usuário desconecta
4. **Audit Logging** - Registrar todas as operações de token em tabela de auditoria
5. **Monitoring** - Alertas para falhas de renovação de token

## 📚 Referências

- [Mercado Livre OAuth Documentation](https://developers.mercadolibre.com.br/pt_BR/autenticacao-e-autorizacao)
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [RFC 6750 - Bearer Token Usage](https://tools.ietf.org/html/rfc6750)
