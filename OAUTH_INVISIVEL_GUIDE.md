# OAuth Invisível com Mercado Livre - Guia Completo

## Visão Geral

Este guia documenta a implementação do OAuth invisível com Mercado Livre, permitindo que usuários conectem suas contas ML de forma automática e segura.

## Arquitetura

### Componentes Criados

| Arquivo                                    | Descrição                             |
| ------------------------------------------ | ------------------------------------- |
| `backend/services/ml-oauth.js`             | Serviço de OAuth com ML               |
| `backend/routes/ml-accounts.js`            | Rotas atualizadas com endpoints OAuth |
| `frontend/src/components/MLConnection.jsx` | Componente React de conexão           |
| `frontend/src/pages/MLAccounts.jsx`        | Página de gerenciamento de contas     |
| `backend/jobs/token-refresh.js`            | Job de renovação automática de tokens |

### Endpoints da API

| Método | Endpoint                       | Descrição                                |
| ------ | ------------------------------ | ---------------------------------------- |
| POST   | `/api/ml-accounts/connect`     | Inicia OAuth, retorna URL de autorização |
| GET    | `/api/ml-accounts/callback`    | Callback do ML após autorização          |
| GET    | `/api/ml-accounts`             | Lista contas do usuário                  |
| DELETE | `/api/ml-accounts/:id`         | Remove conta                             |
| POST   | `/api/ml-accounts/:id/refresh` | Renova token manualmente                 |

## Configuração

### Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# Mercado Livre OAuth
ML_APP_CLIENT_ID=seu_client_id_aqui
ML_APP_CLIENT_SECRET=seu_client_secret_aqui
ML_APP_REDIRECT_URI=http://localhost:3011/api/ml-accounts/callback
```

### Configuração no Mercado Livre Developer

1. Acesse [Mercado Livre Developers](https://developers.mercadolivre.com.br/)
2. Vá em "Minhas Apps" e selecione sua aplicação
3. Configure a **Redirect URI** para: `http://localhost:3011/api/ml-accounts/callback`
4. Em produção, altere para seu domínio real

## Fluxo OAuth 2.0

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO OAUTH INVISÍVEL                          │
└─────────────────────────────────────────────────────────────────────────┘

1. USUÁRIO CLICA EM "CONECTAR"
   ┌─────────────────┐
   │  Frontend       │
   │  POST /connect   │
   └────────┬────────┘
            │
            ▼
2. BACKEND GERA URL AUTORIZAÇÃO
   ┌─────────────────────────┐
   │  ML Auth URL:          │
   │  https://auth.mercad...│
   │  ?response_type=code   │
   │  &client_id=...        │
   │  &redirect_uri=...    │
   │  &state=...            │
   └────────┬──────────────┘
            │
            ▼
3. REDIRECIONA PARA ML
   ┌─────────────────────────┐
   │  Página de login ML    │
   │  Usuário faz login     │
   │  Concede permissão     │
   └────────┬───────────────┘
            │
            ▼
4. ML REDIRECIONA PARA CALLBACK
   ┌─────────────────────────────────────┐
   │  GET /callback?code=xxx&state=yyy   │
   │                                     │
   │  Backend troca code por tokens       │
   │  Salva tokens no MongoDB           │
   │  Redireciona para frontend         │
   └────────┬────────────────────────────┘
            │
            ▼
5. FRONTEND ATUALIZA
   ┌─────────────────────────┐
   │  Exibe conta conectada  │
   │  Token renovará auto    │
   └─────────────────────────┘
```

## Uso

### Frontend - Conectar Nova Conta

```jsx
import MLConnection from "./components/MLConnection";

function App() {
  const handleConnectionComplete = (result) => {
    console.log("Conta conectada:", result);
    // Atualizar lista de contas
  };

  return (
    <MLConnection
      accounts={accounts}
      onConnectionComplete={handleConnectionComplete}
    />
  );
}
```

### Backend - Iniciar OAuth

```bash
# Retorna URL de autorização
POST /api/ml-accounts/connect
Authorization: Bearer <jwt_token>

# Response:
{
  "success": true,
  "data": {
    "authorizationUrl": "https://auth.mercadolibre.com.br/authorization?...",
    "expiresIn": 600
  }
}
```

## Renovação Automática de Tokens

O sistema renova tokens automaticamente:

- **Frequência**: A cada 5 minutos
- **Condição**: Quando faltam 30 minutos para expirar
- **Credenciais**: Usa `ML_CLIENT_ID` e `ML_CLIENT_SECRET` do `.env`

```javascript
// No job token-refresh.js
schedule.scheduleJob("*/5 * * * *", tokenRefreshJob);
```

## Estados da Conta

| Status    | Descrição                          |
| --------- | ---------------------------------- |
| `active`  | Conta conectada e funcionando      |
| `paused`  | Sincronização pausada pelo usuário |
| `expired` | Token expirado, precisa reconectar |
| `error`   | Erro na conexão ou renovação       |

## Indicadores Visuais

O componente `MLConnection` exibe:

- **Status do Token**: Verde (bom), Amarelo (expira em breve), Vermelho (expirado)
- **Renovação Automática**: Badge indicando se token renova automaticamente
- **última Sync**: Data/hora da última sincronização

## Solução de Problemas

### Token Expirado

Se o token expirou:

1. Clique em "Renovar Token" manualmente, ou
2. Reconecte a conta usando OAuth novamente

### Erro "No OAuth Credentials"

Verifique se as variáveis estão no `.env`:

```bash
ML_APP_CLIENT_ID=...
ML_APP_CLIENT_SECRET=...
ML_APP_REDIRECT_URI=...
```

### Callback Não Funciona

1. Verifique se a URL de callback está configurada no Mercado Livre
2. Confirme que o domínio/porta está correto no `.env`
3. Verifique logs do backend: `logs/pino-*.log`

## Segurança

- **CSRF Protection**: Parâmetro `state` aleatório em cada requisição
- **Tokens Criptografados**: Não armazenados em texto plano
- **HTTPS Obrigatório**: Em produção, use HTTPS
- **Validação de State**: Verifica userId antes de processar

## Produção

Para deploy em produção:

1. Configure as variáveis de ambiente no servidor
2. Atualize a `ML_APP_REDIRECT_URI` para seu domínio HTTPS
3. Configure SSL/TLS corretamente
4. Monitore logs de OAuth para erros

```env
# Produção
ML_APP_CLIENT_ID=seu_client_id_producao
ML_APP_CLIENT_SECRET=seu_client_secret_producao
ML_APP_REDIRECT_URI=https://seudominio.com/api/ml-accounts/callback
FRONTEND_URL=https://seudominio.com
```
