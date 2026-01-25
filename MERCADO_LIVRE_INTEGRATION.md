# 🚀 Integração Completa com Mercado Livre - Plano de Ação

**Data**: 24 Janeiro 2026  
**Status**: Análise Completa Finalizada  
**Objetivo**: Integrar Dashboard SASS com múltiplas contas Mercado Livre

---

## 📊 Análise Executiva

### Projeto Atual
- Dashboard profissional de vendas com analytics avançado
- Suporte para múltiplos marketplaces
- Sistema de autenticação JWT com RBAC
- 4 níveis de usuários (Admin, Manager, Seller, Viewer)
- Estrutura pronta para integração com APIs

### Oportunidade
- Sincronizar **múltiplas contas Mercado Livre** em um único painel
- Coletar dados de **vendas, produtos, estoque e metricas** em tempo real
- Gerenciar **publicações, preços e promoções** via API
- Monitorar **saúde de vendedor** e **reputação**
- Integrar com **Mercado Envios** para gestão de envios

---

## 🔐 Autenticação Mercado Livre

### 1. OAuth 2.0 Flow (Recomendado)

**Para múltiplas contas, você precisa implementar:**

```javascript
// src/scripts/mercado-livre-auth.js
class MercadoLivreAuth {
  constructor() {
    this.CLIENT_ID = process.env.ML_CLIENT_ID;
    this.CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
    this.REDIRECT_URI = 'https://seu-dominio.com/auth/callback';
    this.API_BASE = 'https://api.mercadolibre.com';
    this.AUTH_BASE = 'https://auth.mercadolibre.com.br';
  }

  // Step 1: Gerar authorization URL
  getAuthorizationURL(state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      state: state, // CSRF protection
      scope: this.getScopes()
    });
    
    return `${this.AUTH_BASE}/authorization?${params.toString()}`;
  }

  // Step 2: Trocar code por access_token
  async exchangeCodeForToken(code) {
    try {
      const response = await fetch(`${this.API_BASE}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          code: code,
          redirect_uri: this.REDIRECT_URI
        })
      });

      if (!response.ok) throw new Error('Token exchange failed');
      
      const data = await response.json();
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        user_id: data.user_id
      };
    } catch (error) {
      console.error('Erro ao trocar código por token:', error);
      throw error;
    }
  }

  // Step 3: Renovar token quando expirar
  async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch(`${this.API_BASE}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          refresh_token: refreshToken
        })
      });

      if (!response.ok) throw new Error('Token refresh failed');
      
      const data = await response.json();
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_in: data.expires_in
      };
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      throw error;
    }
  }

  getScopes() {
    // Escopos necessários
    return 'read,write,offline_access';
  }
}
```

### 2. Armazenar Tokens Seguramente

```javascript
// src/scripts/secure-storage.js
class SecureTokenStorage {
  constructor() {
    this.ML_ACCOUNTS_KEY = 'ml_accounts_encrypted';
  }

  // Salvar account com tokens
  saveAccount(accountData) {
    try {
      const accounts = this.getAllAccounts();
      
      const newAccount = {
        id: accountData.user_id,
        nickname: accountData.nickname,
        access_token: accountData.access_token,
        refresh_token: accountData.refresh_token,
        expires_at: Date.now() + (accountData.expires_in * 1000),
        created_at: new Date().toISOString(),
        active: true
      };

      accounts.push(newAccount);
      localStorage.setItem(
        this.ML_ACCOUNTS_KEY, 
        JSON.stringify(accounts) // Em produção, usar criptografia
      );

      return newAccount;
    } catch (error) {
      console.error('Erro ao salvar account:', error);
      throw error;
    }
  }

  getAllAccounts() {
    const data = localStorage.getItem(this.ML_ACCOUNTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  getAccount(userId) {
    const accounts = this.getAllAccounts();
    return accounts.find(acc => acc.id === userId);
  }

  updateToken(userId, newToken, refreshToken) {
    const accounts = this.getAllAccounts();
    const accountIndex = accounts.findIndex(acc => acc.id === userId);
    
    if (accountIndex === -1) throw new Error('Account not found');
    
    accounts[accountIndex].access_token = newToken;
    accounts[accountIndex].refresh_token = refreshToken;
    accounts[accountIndex].expires_at = Date.now() + (3600 * 1000); // 1 hora
    
    localStorage.setItem(this.ML_ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  removeAccount(userId) {
    const accounts = this.getAllAccounts();
    const filtered = accounts.filter(acc => acc.id !== userId);
    localStorage.setItem(this.ML_ACCOUNTS_KEY, JSON.stringify(filtered));
  }
}
```

---

## 🛍️ Endpoints da API Mercado Livre

### A. Usuários e Contas

```javascript
// GET /users/{user_id} - Dados da conta
GET https://api.mercadolibre.com/users/{user_id}
Authorization: Bearer {access_token}

Response:
{
  "id": 206946886,
  "nickname": "VENDEDOR123",
  "first_name": "João",
  "last_name": "Silva",
  "email": "joao@example.com",
  "country_id": "BR",
  "registration_date": "2020-01-15T10:00:00Z",
  "seller_reputation": {
    "power_seller_status": "platinum",
    "level_id": "5_stars",
    "transactions": {
      "period": "historic",
      "total": 1000,
      "completed": 995,
      "canceled": 5
    }
  },
  "buyer_reputation": {...},
  "status": {
    "site_status": "active",
    "sell": { "allow": true },
    "buy": { "allow": true }
  }
}

// GET /users/me - Dados do usuário logado
GET https://api.mercadolibre.com/users/me
Authorization: Bearer {access_token}

Response: {...dados do usuário...}
```

### B. Produtos e Publicações

```javascript
// GET /users/{user_id}/items/search - Listar itens publicados
GET https://api.mercadolibre.com/users/{user_id}/items/search
Authorization: Bearer {access_token}

Response:
{
  "results": [
    {
      "id": "MLB2456789012",
      "title": "Smartphone XYZ",
      "sku": "PROD-001",
      "status": "active",
      "available_quantity": 50,
      "price": 999.90,
      "sold_quantity": 150,
      "condition": "new",
      "created_at": "2025-01-01T10:00:00Z"
    },
    // ... mais produtos
  ],
  "paging": {
    "total": 250,
    "offset": 0,
    "limit": 50
  }
}

// GET /items/{item_id} - Detalhes do produto
GET https://api.mercadolibre.com/items/{item_id}
Authorization: Bearer {access_token}

Response: {...detalhes completos...}

// PUT /items/{item_id} - Atualizar produto
PUT https://api.mercadolibre.com/items/{item_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "Novo título",
  "price": 1099.90,
  "available_quantity": 45,
  "description": "Nova descrição",
  "status": "paused|active|closed"
}

Response: {...item atualizado...}
```

### C. Vendas (Orders)

```javascript
// GET /orders/search/all - Buscar todas as vendas
GET https://api.mercadolibre.com/orders/search/all?seller_id={user_id}&order.status=paid
Authorization: Bearer {access_token}

Response:
{
  "orders": [
    {
      "id": 9876543210,
      "buyer_id": 123456789,
      "seller_id": 987654321,
      "date_created": "2025-01-20T14:30:00Z",
      "order_items": [{
        "item": {
          "id": "MLB123456",
          "title": "Produto",
          "sku": "PROD-001"
        },
        "quantity": 2,
        "unit_price": 99.90
      }],
      "order_status": "paid",
      "total_amount": 199.80,
      "payments": [{
        "id": 123456789,
        "transaction_amount": 199.80,
        "status": "approved",
        "payment_type_id": "credit_card"
      }],
      "shipping": {
        "id": 654321098,
        "status": "pending",
        "shipping_type": "me2",
        "cost": 30.00
      },
      "messages": {
        "unread": 0,
        "total": 2
      }
    },
    // ... mais vendas
  ],
  "paging": {...}
}

// GET /orders/{order_id} - Detalhes da venda
GET https://api.mercadolibre.com/orders/{order_id}
Authorization: Bearer {access_token}

// PUT /orders/{order_id} - Atualizar venda (status, etc)
PUT https://api.mercadolibre.com/orders/{order_id}
Authorization: Bearer {access_token}
```

### D. Envios (Shipments)

```javascript
// GET /shipments/{shipment_id} - Detalhes do envio
GET https://api.mercadolibre.com/shipments/{shipment_id}
Authorization: Bearer {access_token}

Response:
{
  "id": 654321098,
  "order_id": 9876543210,
  "status": "ready_to_ship",
  "status_history": [{
    "status": "pending",
    "date": "2025-01-20T14:30:00Z"
  }],
  "receiver_address": {...},
  "shipping_items": [{...}],
  "service_id": 1234,
  "cost": 30.00
}

// PUT /shipments/{shipment_id} - Marcar como enviado
PUT https://api.mercadolibre.com/shipments/{shipment_id}
Authorization: Bearer {access_token}

{
  "status": "shipped",
  "tracking": {
    "number": "AA123456789BR",
    "date": "2025-01-21T10:00:00Z"
  }
}
```

### E. Pagamentos

```javascript
// GET /users/{user_id}/payments/money - Saldo de vendedor
GET https://api.mercadolibre.com/users/{user_id}/payments/money
Authorization: Bearer {access_token}

Response:
{
  "total_amount": 5000.00,
  "available_amount": 4500.00,
  "pending_amount": 500.00,
  "transactions": [{...}]
}

// GET /collections/{collection_id} - Detalhes do pagamento
GET https://api.mercadolibre.com/collections/{collection_id}
Authorization: Bearer {access_token}
```

### F. Métricas e Tendências

```javascript
// GET /users/{user_id}/summary - Resumo do vendedor
GET https://api.mercadolibre.com/users/{user_id}/summary
Authorization: Bearer {access_token}

Response:
{
  "user_id": 206946886,
  "nickname": "VENDEDOR123",
  "listing_type_id": "gold_pro",
  "registration_date": "2020-01-15T10:00:00Z",
  "country_id": "BR",
  "social_media": {...},
  "seller_data": {
    "cancellation_rate": 0.5,
    "return_rate": 2.1,
    "reply_rate": 100.0
  },
  "seller_reputation": {...}
}

// GET /seller/{user_id}/sales_distribution - Distribuição de vendas
GET https://api.mercadolibre.com/seller/{user_id}/sales_distribution
Authorization: Bearer {access_token}

// GET /visits/items/{item_id} - Visitas ao produto
GET https://api.mercadolibre.com/visits/items/{item_id}
Authorization: Bearer {access_token}

Response:
{
  "unit_sold": 10,
  "unit_visited": 100,
  "visits": 100,
  "contact_arrived": 5
}
```

### G. Notificações (Webhooks)

```javascript
// POST /applications/{app_id}/subscriptions - Inscrever em eventos
POST https://api.mercadolibre.com/applications/{app_id}/subscriptions
Authorization: Bearer {access_token}

{
  "topic": "orders",
  "user_id": 206946886
}

// Eventos disponíveis:
// - orders (novas vendas, atualizações)
// - items (produtos publicados, atualizados)
// - shipments (envios criados, atualizados)
// - questions (novas perguntas)
// - messages (novas mensagens)
// - billing (pagamentos)
```

---

## 🔧 Implementação Passo a Passo

### FASE 1: Setup Inicial (1-2 dias)

#### 1.1 Criar Aplicação no Mercado Livre

```
1. Acesse: https://developers.mercadolibre.com.br/devcenter
2. Clique em "Criar uma aplicação"
3. Preencha:
   - Nome: "Dashboard SASS"
   - Nome curto: "dashboard-sass"
   - Descrição: "Gerenciador de vendas em múltiplos marketplaces"
   - Logo: Sua logo
   - URLs de redirecionamento: https://seu-dominio.com/auth/mercado-livre/callback
   
4. Escopos necessários:
   ✓ read (leitura de dados)
   ✓ write (escrita de produtos, preços)
   ✓ offline_access (renovação de token sem usuário online)

5. Tópicos para Webhooks:
   ✓ Orders
   ✓ Items
   ✓ Shipments
   ✓ Questions
   ✓ Messages
   
6. URL de notificações: https://seu-dominio.com/webhooks/mercado-livre

7. Copie e guarde:
   - CLIENT_ID
   - CLIENT_SECRET
```

#### 1.2 Configurar Variáveis de Ambiente

```bash
# .env
ML_CLIENT_ID=your_client_id_here
ML_CLIENT_SECRET=your_client_secret_here (NUNCA commitar!)
ML_REDIRECT_URI=https://seu-dominio.com/auth/mercado-livre/callback
ML_API_BASE=https://api.mercadolibre.com
ML_AUTH_BASE=https://auth.mercadolibre.com.br

# PRODUÇÃO
NODE_ENV=production
API_URL=https://seu-dominio.com/api
```

#### 1.3 Criar Estrutura de Pastas

```bash
src/scripts/
├── mercado-livre/
│   ├── auth.js              # Autenticação OAuth
│   ├── api-client.js        # Cliente HTTP com retry
│   ├── products.js          # Gerenciamento de produtos
│   ├── orders.js            # Gerenciamento de vendas
│   ├── shipments.js         # Gerenciamento de envios
│   ├── payments.js          # Gerenciamento de pagamentos
│   ├── metrics.js           # Métricas e análise
│   ├── webhooks.js          # Recebimento de notificações
│   └── sync-manager.js      # Sincronização de múltiplas contas
├── multi-account/
│   ├── account-manager.js   # Gerenciar múltiplas contas
│   ├── data-aggregator.js   # Agregar dados de todas as contas
│   └── account-switcher.js  # Switch entre contas
└── mercado-livre-auth.js    # Arquivo principal de auth
```

### FASE 2: Autenticação OAuth (2-3 dias)

#### 2.1 Página de Callback

```html
<!-- examples/auth/mercado-livre-callback.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Conectando com Mercado Livre...</title>
  <style>
    body { font-family: Arial; text-align: center; padding: 50px; }
    .loader { border: 5px solid #f3f3f3; border-top: 5px solid #3498db; 
              border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h2>Conectando sua conta Mercado Livre...</h2>
  <div class="loader"></div>
  <p id="status">Processando...</p>
  
  <script src="../../src/scripts/mercado-livre-auth.js"></script>
  <script src="../../src/scripts/secure-storage.js"></script>
  <script>
    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code) {
          throw new Error('Código não recebido. Usuário pode ter cancelado.');
        }

        document.getElementById('status').textContent = 'Trocando código por token...';
        
        const auth = new MercadoLivreAuth();
        const tokenData = await auth.exchangeCodeForToken(code);
        
        document.getElementById('status').textContent = 'Buscando dados da conta...';
        
        const userData = await auth.getUserInfo(tokenData.access_token);
        
        document.getElementById('status').textContent = 'Salvando conta...';
        
        const storage = new SecureTokenStorage();
        storage.saveAccount({
          user_id: userData.id,
          nickname: userData.nickname,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in
        });

        // Redirecionar para dashboard
        setTimeout(() => {
          window.location.href = '/examples/dashboard/index.html?success=true&account=' + userData.nickname;
        }, 2000);
        
      } catch (error) {
        console.error('Erro no callback:', error);
        document.getElementById('status').innerHTML = 
          `<span style="color: red;">Erro: ${error.message}</span><br><a href="/examples/dashboard/index.html">Voltar</a>`;
      }
    }

    handleCallback();
  </script>
</body>
</html>
```

#### 2.2 Componente de Conexão de Contas

```html
<!-- examples/settings/ml-accounts.html -->
<div class="ml-accounts-section">
  <h3>💰 Contas Mercado Livre Conectadas</h3>
  
  <div class="connected-accounts">
    <div id="accountsList" class="accounts-list">
      <!-- Preenchido dinamicamente -->
    </div>
  </div>

  <button id="addAccountBtn" class="btn btn-primary">
    + Conectar Nova Conta
  </button>

  <div id="accountDetails" class="account-details" style="display:none;">
    <h4 id="accountName"></h4>
    <dl>
      <dt>User ID:</dt><dd id="accountId"></dd>
      <dt>Status:</dt><dd id="accountStatus"></dd>
      <dt>Desde:</dt><dd id="accountCreated"></dd>
      <dt>Token Expira:</dt><dd id="tokenExpiry"></dd>
    </dl>
    <button id="disconnectBtn" class="btn btn-danger">Desconectar</button>
  </div>
</div>

<script src="../../src/scripts/mercado-livre-auth.js"></script>
<script src="../../src/scripts/secure-storage.js"></script>
<script>
  class MLAccountsManager {
    constructor() {
      this.auth = new MercadoLivreAuth();
      this.storage = new SecureTokenStorage();
      this.init();
    }

    async init() {
      document.getElementById('addAccountBtn').addEventListener('click', 
        () => this.connectNewAccount());
      
      this.displayAccounts();
    }

    connectNewAccount() {
      const state = this.generateState();
      sessionStorage.setItem('oauth_state', state);
      
      const authUrl = this.auth.getAuthorizationURL(state);
      window.location.href = authUrl;
    }

    displayAccounts() {
      const accounts = this.storage.getAllAccounts();
      const container = document.getElementById('accountsList');
      
      if (accounts.length === 0) {
        container.innerHTML = '<p>Nenhuma conta conectada</p>';
        return;
      }

      container.innerHTML = accounts.map(acc => `
        <div class="account-card" data-user-id="${acc.id}">
          <div class="account-header">
            <h5>${acc.nickname}</h5>
            <span class="badge ${acc.active ? 'badge-success' : 'badge-warning'}">
              ${acc.active ? 'Ativa' : 'Inativa'}
            </span>
          </div>
          <p>ID: ${acc.id}</p>
          <p>Conectada em: ${new Date(acc.created_at).toLocaleDateString('pt-BR')}</p>
          <p class="expires-info">Token expira em: ${this.formatExpiry(acc.expires_at)}</p>
          <button class="select-account-btn" data-user-id="${acc.id}">Selecionar</button>
        </div>
      `).join('');

      // Event listeners
      document.querySelectorAll('.select-account-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const userId = e.target.dataset.userId;
          this.selectAccount(userId);
        });
      });
    }

    selectAccount(userId) {
      const account = this.storage.getAccount(userId);
      if (!account) return;

      const details = document.getElementById('accountDetails');
      document.getElementById('accountName').textContent = account.nickname;
      document.getElementById('accountId').textContent = account.id;
      document.getElementById('accountStatus').textContent = account.active ? 'Ativa' : 'Inativa';
      document.getElementById('accountCreated').textContent = 
        new Date(account.created_at).toLocaleDateString('pt-BR');
      document.getElementById('tokenExpiry').textContent = this.formatExpiry(account.expires_at);

      document.getElementById('disconnectBtn').onclick = () => this.disconnectAccount(userId);
      details.style.display = 'block';
    }

    disconnectAccount(userId) {
      if (confirm('Tem certeza? Esta conta será desconectada permanentemente.')) {
        this.storage.removeAccount(userId);
        this.displayAccounts();
        document.getElementById('accountDetails').style.display = 'none';
      }
    }

    formatExpiry(timestamp) {
      const date = new Date(timestamp);
      const now = Date.now();
      const diff = timestamp - now;
      
      if (diff < 0) return '⚠️ Expirado - renove agora';
      if (diff < 3600000) return '⚠️ Expira em menos de 1 hora';
      
      return date.toLocaleString('pt-BR');
    }

    generateState() {
      return Math.random().toString(36).substring(7);
    }
  }

  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new MLAccountsManager());
  } else {
    new MLAccountsManager();
  }
</script>
```

### FASE 3: Sincronização de Dados (3-4 dias)

#### 3.1 Cliente API com Retry Automático

```javascript
// src/scripts/mercado-livre/api-client.js
class MLAPIClient {
  constructor(accessToken, userId) {
    this.accessToken = accessToken;
    this.userId = userId;
    this.baseURL = 'https://api.mercadolibre.com';
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.requestTimeout = 15000;
  }

  async request(method, endpoint, data = null) {
    let lastError;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this._makeRequest(method, endpoint, data);
      } catch (error) {
        lastError = error;
        
        // Não retry em certos erros
        if (error.status === 401) throw new Error('Token expirado - faça login novamente');
        if (error.status === 403) throw new Error('Sem permissão para este endpoint');
        if (error.status === 404) throw new Error('Recurso não encontrado');
        
        // Aguardar antes de retry
        if (attempt < this.maxRetries - 1) {
          await this._delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }
    
    throw lastError;
  }

  async _makeRequest(method, endpoint, data = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const url = `${this.baseURL}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Métodos convenientes
  async getUser() {
    return this.request('GET', `/users/${this.userId}`);
  }

  async getUserSummary() {
    return this.request('GET', `/users/${this.userId}/summary`);
  }

  async getItems(limit = 50, offset = 0) {
    return this.request('GET', 
      `/users/${this.userId}/items/search?limit=${limit}&offset=${offset}`);
  }

  async getItem(itemId) {
    return this.request('GET', `/items/${itemId}`);
  }

  async getOrders(filters = {}) {
    const params = new URLSearchParams({
      seller_id: this.userId,
      ...filters
    });
    return this.request('GET', `/orders/search/all?${params.toString()}`);
  }

  async getOrder(orderId) {
    return this.request('GET', `/orders/${orderId}`);
  }

  async updateItemPrice(itemId, newPrice) {
    return this.request('PUT', `/items/${itemId}`, {
      price: newPrice
    });
  }

  async updateItemStock(itemId, quantity) {
    return this.request('PUT', `/items/${itemId}`, {
      available_quantity: quantity
    });
  }
}
```

#### 3.2 Sincronizador de Contas Múltiplas

```javascript
// src/scripts/multi-account/sync-manager.js
class MLSyncManager {
  constructor() {
    this.storage = new SecureTokenStorage();
    this.auth = new MercadoLivreAuth();
    this.clients = new Map(); // userId -> MLAPIClient
    this.syncState = new Map(); // userId -> syncStatus
    this.init();
  }

  async init() {
    const accounts = this.storage.getAllAccounts();
    
    for (const account of accounts) {
      if (await this._isTokenValid(account)) {
        this.clients.set(account.id, new MLAPIClient(account.access_token, account.id));
      } else {
        // Token expirado, renovar
        try {
          const newToken = await this.auth.refreshAccessToken(account.refresh_token);
          this.storage.updateToken(account.id, newToken.access_token, newToken.refresh_token);
          this.clients.set(account.id, new MLAPIClient(newToken.access_token, account.id));
        } catch (error) {
          console.warn(`Não foi possível renovar token para ${account.nickname}:`, error);
          this.syncState.set(account.id, { status: 'error', message: error.message });
        }
      }
    }
  }

  async _isTokenValid(account) {
    return account.expires_at > Date.now();
  }

  async syncAllAccounts() {
    const results = new Map();

    for (const [userId, client] of this.clients) {
      this.syncState.set(userId, { status: 'syncing', progress: 0 });
      
      try {
        const data = await this.syncAccount(userId, client);
        results.set(userId, { status: 'success', data });
        this.syncState.set(userId, { status: 'success', lastSync: new Date() });
      } catch (error) {
        console.error(`Erro ao sincronizar conta ${userId}:`, error);
        results.set(userId, { status: 'error', error: error.message });
        this.syncState.set(userId, { status: 'error', message: error.message });
      }
    }

    return results;
  }

  async syncAccount(userId, client) {
    const data = {
      userId,
      user: await client.getUser(),
      summary: await client.getUserSummary(),
      items: await this._syncItems(client),
      orders: await this._syncOrders(client),
      metrics: await this._calculateMetrics(userId),
      syncedAt: new Date().toISOString()
    };

    // Salvar em localStorage/DB
    this._saveAccountData(userId, data);
    return data;
  }

  async _syncItems(client) {
    const items = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      const result = await client.getItems(limit, offset);
      if (!result.results || result.results.length === 0) break;
      
      items.push(...result.results);
      offset += limit;
    }

    return items;
  }

  async _syncOrders(client) {
    // Buscar últimas 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await client.getOrders({
      'order.date_created.from': thirtyDaysAgo.toISOString(),
      'order.date_created.to': new Date().toISOString()
    });

    return orders.orders || [];
  }

  async _calculateMetrics(userId) {
    // Calcular métricas baseado nos dados sincronizados
    const accountData = this._getAccountData(userId);
    
    return {
      totalProducts: accountData.items?.length || 0,
      totalSales: accountData.orders?.length || 0,
      totalRevenue: (accountData.orders || [])
        .reduce((sum, order) => sum + (order.total_amount || 0), 0),
      reputationScore: accountData.user?.seller_reputation?.level_id,
      sellerStatus: accountData.user?.seller_reputation?.power_seller_status
    };
  }

  _saveAccountData(userId, data) {
    const key = `ml_account_data_${userId}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getAccountData(userId) {
    const key = `ml_account_data_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  }

  getSyncStatus(userId) {
    return this.syncState.get(userId) || { status: 'pending' };
  }
}
```

### FASE 4: Visualização no Dashboard (2-3 dias)

#### 4.1 Painel Agregado de Contas

```javascript
// src/scripts/dashboard-ml.js
class DashboardML {
  constructor() {
    this.syncManager = new MLSyncManager();
    this.accountManager = new AccountManager();
    this.init();
  }

  async init() {
    // Sincronizar dados ao carregar
    await this.syncManager.syncAllAccounts();
    
    // Renderizar dashboard
    this.renderAccountSelector();
    this.renderAggregatedMetrics();
    this.renderAccountComparison();
    
    // Auto-sync a cada 5 minutos
    setInterval(() => this.syncManager.syncAllAccounts(), 5 * 60 * 1000);
  }

  renderAccountSelector() {
    const accounts = this.accountManager.getAllAccounts();
    const html = `
      <div class="account-selector">
        <label>Visualizar dados de:</label>
        <select id="accountSelect">
          <option value="all">📊 Todas as contas</option>
          ${accounts.map(acc => `
            <option value="${acc.id}">${acc.nickname}</option>
          `).join('')}
        </select>
      </div>
    `;
    
    document.getElementById('accountSelectorContainer').innerHTML = html;
    
    document.getElementById('accountSelect').addEventListener('change', (e) => {
      this.filterByAccount(e.target.value);
    });
  }

  renderAggregatedMetrics() {
    const allData = this.accountManager.getAllAccounts()
      .map(acc => this.syncManager._getAccountData(acc.id));

    const totals = {
      products: allData.reduce((sum, d) => sum + (d.items?.length || 0), 0),
      sales: allData.reduce((sum, d) => sum + (d.orders?.length || 0), 0),
      revenue: allData.reduce((sum, d) => 
        sum + d.orders?.reduce((s, o) => s + (o.total_amount || 0), 0) || 0, 0
      )
    };

    const html = `
      <div class="metrics-grid">
        <div class="metric-card">
          <h4>📦 Produtos Totais</h4>
          <p class="metric-value">${totals.products}</p>
        </div>
        <div class="metric-card">
          <h4>🛍️ Vendas (30d)</h4>
          <p class="metric-value">${totals.sales}</p>
        </div>
        <div class="metric-card">
          <h4>💰 Faturamento (30d)</h4>
          <p class="metric-value">R$ ${totals.revenue.toFixed(2)}</p>
        </div>
      </div>
    `;

    document.getElementById('metricsContainer').innerHTML = html;
  }

  renderAccountComparison() {
    const accounts = this.accountManager.getAllAccounts();
    
    const data = accounts.map(acc => {
      const accountData = this.syncManager._getAccountData(acc.id);
      return {
        nickname: acc.nickname,
        products: accountData.items?.length || 0,
        sales: accountData.orders?.length || 0,
        revenue: accountData.orders?.reduce((s, o) => s + (o.total_amount || 0), 0) || 0
      };
    });

    // Renderizar tabela comparativa
    const html = `
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Conta</th>
            <th>Produtos</th>
            <th>Vendas</th>
            <th>Faturamento</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td>${row.nickname}</td>
              <td>${row.products}</td>
              <td>${row.sales}</td>
              <td>R$ ${row.revenue.toFixed(2)}</td>
              <td>${this._getStatusBadge(accounts.find(a => a.nickname === row.nickname).id)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.getElementById('comparisonContainer').innerHTML = html;
  }

  _getStatusBadge(userId) {
    const status = this.syncManager.getSyncStatus(userId);
    const badges = {
      'syncing': '<span class="badge badge-info">⟳ Sincronizando...</span>',
      'success': '<span class="badge badge-success">✓ Sincronizado</span>',
      'error': '<span class="badge badge-danger">✗ Erro</span>',
      'pending': '<span class="badge badge-warning">⏳ Pendente</span>'
    };
    return badges[status.status] || badges.pending;
  }

  filterByAccount(accountId) {
    // Implementar filtro por conta
    if (accountId === 'all') {
      this.renderAggregatedMetrics();
      this.renderAccountComparison();
    } else {
      this.renderAccountData(accountId);
    }
  }
}
```

### FASE 5: Webhooks e Sincronização em Tempo Real (2-3 dias)

#### 5.1 Handler de Webhooks

```javascript
// backend/webhooks/mercado-livre.js (Node.js/Express)
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Verificar autenticidade do webhook
function verifyWebhookSignature(body, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return hash === signature;
}

// Tipos de eventos
const WebhookHandlers = {
  'orders': handleOrdersEvent,
  'items': handleItemsEvent,
  'shipments': handleShipmentsEvent,
  'questions': handleQuestionsEvent,
  'messages': handleMessagesEvent
};

async function handleOrdersEvent(data) {
  const { topic, user_id, resource } = data;
  
  // Buscar detalhes da venda
  const orderId = resource.split('/')[1];
  
  // Atualizar no banco de dados
  console.log(`Nova venda: ${orderId} para usuário ${user_id}`);
  
  // Notificar clientes via WebSocket
  notifyClients({
    type: 'order_updated',
    orderId,
    userId: user_id,
    timestamp: new Date()
  });
}

async function handleItemsEvent(data) {
  const { topic, user_id, resource } = data;
  const itemId = resource.split('/')[1];
  
  console.log(`Item atualizado: ${itemId} para usuário ${user_id}`);
  
  notifyClients({
    type: 'item_updated',
    itemId,
    userId: user_id,
    timestamp: new Date()
  });
}

async function handleShipmentsEvent(data) {
  const { topic, user_id, resource } = data;
  const shipmentId = resource.split('/')[1];
  
  console.log(`Envio atualizado: ${shipmentId} para usuário ${user_id}`);
  
  notifyClients({
    type: 'shipment_updated',
    shipmentId,
    userId: user_id,
    timestamp: new Date()
  });
}

router.post('/mercado-livre', (req, res) => {
  // Verificar signature
  const signature = req.headers['x-mercadolibre-signature'];
  const rawBody = req.rawBody; // Middleware que guarda body raw
  
  if (!verifyWebhookSignature(rawBody, signature, process.env.ML_CLIENT_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { topic, user_id, resource, attempts } = req.body;

  // Processar evento
  const handler = WebhookHandlers[topic];
  if (handler) {
    handler({ topic, user_id, resource, attempts })
      .catch(error => console.error(`Erro ao processar ${topic}:`, error));
  }

  // Responder imediatamente para evitar retry
  res.status(200).json({ received: true });
});

module.exports = router;
```

---

## 📋 Checklist de Implementação

### Fase 1: Setup (Semana 1)
- [ ] Criar aplicação no DevCenter do Mercado Livre
- [ ] Configurar variáveis de ambiente (.env)
- [ ] Estruturar pastas do projeto
- [ ] Implementar classe MercadoLivreAuth
- [ ] Implementar classe SecureTokenStorage

### Fase 2: Autenticação (Semana 1-2)
- [ ] Criar página de callback OAuth
- [ ] Implementar fluxo de autorização
- [ ] Criar página de gerenciamento de contas
- [ ] Testar conexão com conta de teste
- [ ] Implementar renovação de tokens

### Fase 3: Sincronização (Semana 2-3)
- [ ] Implementar MLAPIClient com retry
- [ ] Implementar MLSyncManager
- [ ] Sincronizar produtos
- [ ] Sincronizar vendas
- [ ] Sincronizar métricas
- [ ] Testes com múltiplas contas

### Fase 4: Dashboard (Semana 3-4)
- [ ] Integrar dados no dashboard
- [ ] Criar seletor de contas
- [ ] Renderizar métricas agregadas
- [ ] Comparação entre contas
- [ ] Filtros e buscas

### Fase 5: Webhooks (Semana 4)
- [ ] Implementar handler de webhooks
- [ ] WebSocket para notificações tempo real
- [ ] Auto-sincronização ao receber webhook
- [ ] Testes de webhook

### Fase 6: Funcionalidades Avançadas (Semana 5)
- [ ] Atualizar preços via API
- [ ] Atualizar estoque via API
- [ ] Gerenciar envios
- [ ] Responder perguntas
- [ ] Enviar mensagens

### Fase 7: Deploy (Semana 5-6)
- [ ] Configurar HTTPS (obrigatório para OAuth)
- [ ] Testar em ambiente de produção
- [ ] Documentação para usuários
- [ ] Treinamento de equipe
- [ ] Monitoramento de erros (Sentry, etc)

---

## 🔒 Segurança

### Boas Práticas

```javascript
// ✅ FAZER
1. Nunca expor CLIENT_SECRET no frontend
2. Usar HTTPS em produção
3. Criptografar tokens em localStorage
4. Validar e sanitizar todos os inputs
5. Implementar rate limiting
6. Usar CSRF tokens
7. Renovar tokens regularmente
8. Fazer logout ao erro 401

// ❌ NÃO FAZER
1. console.log(accessToken)
2. Armazenar token em plain text
3. Exposur CLIENT_SECRET em .env versionado
4. Confiar em validação apenas no frontend
5. Usar http em produção
6. Fazer requestscom dados sensíveis no URL
```

### Criptografia de Tokens

```javascript
// src/scripts/crypto-storage.js
class CryptoTokenStorage {
  // Usando SubtleCrypto da Web (não requer npm)
  async encryptToken(token, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
      ),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    // Combinar salt + iv + encrypted
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined)); // Base64 encode
  }

  async decryptToken(encryptedData, password) {
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(c => c.charCodeAt(0))
    );

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const encoder = new TextEncoder();
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
      ),
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }
}
```

---

## 🧪 Testes

```javascript
// tests/mercado-livre.test.js
describe('Mercado Livre Integration', () => {
  let auth;
  let storage;

  beforeEach(() => {
    auth = new MercadoLivreAuth();
    storage = new SecureTokenStorage();
  });

  describe('OAuth Flow', () => {
    test('Deve gerar URL de autorização correta', () => {
      const url = auth.getAuthorizationURL('test-state');
      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=' + auth.CLIENT_ID);
    });

    test('Deve trocar código por token', async () => {
      // Mock fetch
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            expires_in: 3600,
            user_id: 123456
          })
        })
      );

      const result = await auth.exchangeCodeForToken('test-code');
      expect(result.access_token).toBe('test-token');
    });
  });

  describe('Account Storage', () => {
    test('Deve salvar conta', () => {
      storage.saveAccount({
        user_id: 123,
        nickname: 'testuser',
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600
      });

      const accounts = storage.getAllAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].nickname).toBe('testuser');
    });

    test('Deve atualizar token', () => {
      storage.saveAccount({
        user_id: 123,
        nickname: 'test',
        access_token: 'old-token',
        refresh_token: 'old-refresh',
        expires_in: 3600
      });

      storage.updateToken(123, 'new-token', 'new-refresh');
      const account = storage.getAccount(123);
      expect(account.access_token).toBe('new-token');
    });
  });

  describe('API Client', () => {
    test('Deve fazer requisição com retry', async () => {
      const client = new MLAPIClient('test-token', 123);
      let attempts = 0;

      global.fetch = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'test' })
        });
      });

      const result = await client.getUser();
      expect(attempts).toBe(3);
      expect(result.id).toBe('test');
    });
  });
});
```

---

## 📊 Estrutura de Dados no Dashboard

```javascript
// Como os dados serão armazenados/sincronizados
const mlAccountsStructure = {
  accounts: [
    {
      id: 206946886,
      nickname: 'VENDEDOR123',
      email: 'vendedor@example.com',
      access_token: 'encrypted_token',
      refresh_token: 'encrypted_refresh',
      expires_at: 1706025600000,
      connected_at: '2026-01-24T10:00:00Z',
      active: true,
      
      // Dados sincronizados
      summary: {
        total_listings: 250,
        active_listings: 245,
        sold_quantity: 1500,
        total_reviews: 4.8,
        cancellation_rate: 0.5,
        return_rate: 2.1
      },

      products: [
        {
          id: 'MLB123456789',
          sku: 'PROD-001',
          title: 'Smartphone',
          price: 999.90,
          available_quantity: 50,
          sold_quantity: 150,
          status: 'active',
          last_updated: '2026-01-24T15:30:00Z'
        }
      ],

      orders: [
        {
          id: 9876543210,
          date: '2026-01-20T14:30:00Z',
          items: [
            {
              id: 'MLB123456789',
              title: 'Smartphone',
              quantity: 1,
              price: 999.90
            }
          ],
          total_amount: 1029.90,
          buyer_id: 123456789,
          status: 'paid',
          payment: 'credit_card'
        }
      ],

      metrics: {
        total_revenue_30days: 50000.00,
        average_order_value: 299.90,
        conversion_rate: 3.5,
        last_sync: '2026-01-24T16:45:00Z'
      }
    },
    // ... mais contas
  ],

  // Dados agregados
  aggregated: {
    total_products: 500,
    total_sales_30days: 200,
    total_revenue: 100000.00,
    average_rating: 4.7,
    total_accounts: 3
  }
};
```

---

## 🚨 Troubleshooting Comum

| Problema | Causa | Solução |
|----------|-------|---------|
| Token expirado | Fluxo normal | Implementar refresh automático |
| 401 Unauthorized | Token inválido | Renovar token ou fazer login novamente |
| 403 Forbidden | Falta de permissão | Verificar escopos na app |
| 429 Rate Limit | Muitas requisições | Implementar queue e throttling |
| Webhook não recebido | URL errada ou HTTPS | Verificar URL e certificado SSL |
| CORS error | Frontend vs Backend | Usar proxy backend ou CORS headers |

---

## 📝 Próximos Passos

1. **Imediato**: Criar aplicação no DevCenter
2. **Curto Prazo**: Implementar OAuth + armazenamento seguro
3. **Médio Prazo**: Sincronizar dados (produtos, vendas)
4. **Longo Prazo**: Webhooks, atualizações em tempo real
5. **Futuro**: Integração com Mercado Pago, automações

---

## 📞 Links Úteis

- **DevCenter**: https://developers.mercadolibre.com.br/devcenter
- **Documentação API**: https://developers.mercadolibre.com.br/pt_br/api-docs-pt-br
- **OAuth**: https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
- **Webhooks**: https://developers.mercadolibre.com.br/pt_br/produto-receba-notificacoes
- **Forum**: https://developers.mercadolibre.com.br/pt_br/forum

---

**Status**: ✅ Documentação Completa  
**Última Atualização**: 24 Jan 2026  
**Próxima Revisão**: 28 Jan 2026
