# 🚀 Quick Start - Mercado Livre Integration

## PASSO A PASSO EM 5 MINUTOS

### 1️⃣ Criar Aplicação (5 minutos)

```
1. Acesse: https://developers.mercadolibre.com.br/devcenter
2. Clique em "Criar uma aplicação"
3. Preencha:
   Nome: Dashboard SASS
   Nome curto: dashboard-sass
   Descrição: Gerenciador de vendas em múltiplos marketplaces
   
4. Escopos:
   ✓ read (GET requests)
   ✓ write (PUT/POST requests)
   ✓ offline_access (renovar sem usuário online)

5. Webhooks (deixar para depois):
   ✓ Orders
   ✓ Items
   ✓ Shipments
   
6. Copie:
   - CLIENT_ID: _______________
   - CLIENT_SECRET: _______________
```

### 2️⃣ Configurar Projeto (2 minutos)

```bash
# Crie arquivo .env na raiz do projeto
echo 'ML_CLIENT_ID=seu_client_id_aqui' > .env
echo 'ML_CLIENT_SECRET=seu_client_secret_aqui' >> .env
echo 'ML_REDIRECT_URI=https://seu-dominio.com/auth/mercado-livre/callback' >> .env

# Adicione ao .gitignore (NÃO versioná-lo!)
echo '.env' >> .gitignore
```

### 3️⃣ Implementar Autenticação (30 minutos)

```javascript
// src/scripts/mercado-livre/auth.js

class MercadoLivreAuth {
  constructor() {
    this.CLIENT_ID = 'seu_client_id';
    this.CLIENT_SECRET = 'seu_client_secret'; // ⚠️ Nunca no frontend!
    this.REDIRECT_URI = 'https://seu-dominio.com/auth/callback';
    this.API_BASE = 'https://api.mercadolibre.com';
    this.AUTH_BASE = 'https://auth.mercadolibre.com.br';
  }

  // Gerar link de autorização
  getAuthURL(state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      state: state
    });
    return `${this.AUTH_BASE}/authorization?${params}`;
  }

  // Trocar código por token (fazer no BACKEND, não frontend)
  async exchangeCodeForToken(code) {
    // IMPORTANTE: Este método deve estar no seu backend Node.js/Python/PHP
    // Nunca exponha CLIENT_SECRET no frontend!
    
    const response = await fetch(`${this.API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        code: code,
        redirect_uri: this.REDIRECT_URI
      })
    });

    return response.json();
  }

  // Renovar token
  async refreshToken(refreshToken) {
    const response = await fetch(`${this.API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        refresh_token: refreshToken
      })
    });

    return response.json();
  }
}

// Uso
const auth = new MercadoLivreAuth();
const authURL = auth.getAuthURL('state123');
window.location.href = authURL; // Redireciona para login do ML
```

### 4️⃣ Criar Cliente API (20 minutos)

```javascript
// src/scripts/mercado-livre/api-client.js

class MLAPIClient {
  constructor(accessToken, userId) {
    this.accessToken = accessToken;
    this.userId = userId;
    this.baseURL = 'https://api.mercadolibre.com';
  }

  async request(method, endpoint, data = null) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : null
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Métodos convenientes
  async getUser() {
    return this.request('GET', `/users/${this.userId}`);
  }

  async getItems() {
    return this.request('GET', `/users/${this.userId}/items/search`);
  }

  async getOrders() {
    return this.request('GET', `/orders/search/all?seller_id=${this.userId}`);
  }

  async getOrder(orderId) {
    return this.request('GET', `/orders/${orderId}`);
  }

  async updateItemPrice(itemId, price) {
    return this.request('PUT', `/items/${itemId}`, { price });
  }
}

// Uso
const client = new MLAPIClient('seu_access_token', 206946886);
const user = await client.getUser();
console.log('Dados do vendedor:', user);
```

### 5️⃣ Armazenar Tokens Seguramente (20 minutos)

```javascript
// src/scripts/mercado-livre/secure-storage.js

class SecureTokenStorage {
  saveAccount(accountData) {
    const accounts = this.getAllAccounts();
    
    const account = {
      id: accountData.user_id,
      nickname: accountData.nickname,
      access_token: this.encrypt(accountData.access_token),
      refresh_token: this.encrypt(accountData.refresh_token),
      expires_at: Date.now() + (accountData.expires_in * 1000),
      created_at: new Date().toISOString()
    };

    accounts.push(account);
    localStorage.setItem('ml_accounts', JSON.stringify(accounts));
    return account;
  }

  getAccount(userId) {
    const accounts = this.getAllAccounts();
    const account = accounts.find(a => a.id === userId);
    if (account) {
      account.access_token = this.decrypt(account.access_token);
      account.refresh_token = this.decrypt(account.refresh_token);
    }
    return account;
  }

  getAllAccounts() {
    return JSON.parse(localStorage.getItem('ml_accounts') || '[]');
  }

  encrypt(token) {
    // Implementação simplificada (usar crypto.subtle em produção)
    return btoa(token); // Base64 encode (não é seguro! Use crypto.subtle)
  }

  decrypt(token) {
    return atob(token); // Base64 decode
  }

  removeAccount(userId) {
    const accounts = this.getAllAccounts();
    const filtered = accounts.filter(a => a.id !== userId);
    localStorage.setItem('ml_accounts', JSON.stringify(filtered));
  }
}

// Uso
const storage = new SecureTokenStorage();
storage.saveAccount({
  user_id: 206946886,
  nickname: 'VENDEDOR123',
  access_token: 'abc123...',
  refresh_token: 'xyz789...',
  expires_in: 3600
});

// Recuperar depois
const account = storage.getAccount(206946886);
console.log('Token armazenado:', account.access_token);
```

### 6️⃣ Integrar no Dashboard (30 minutos)

```html
<!-- examples/settings/ml-accounts.html -->

<div class="ml-panel">
  <h3>💰 Minhas Contas Mercado Livre</h3>
  
  <button onclick="connectNewAccount()">+ Conectar Conta</button>
  
  <div id="accountsList">
    <!-- Preenchido dinamicamente -->
  </div>
</div>

<script>
  const storage = new SecureTokenStorage();

  function displayAccounts() {
    const accounts = storage.getAllAccounts();
    const html = accounts.map(acc => `
      <div class="account-card">
        <h4>${acc.nickname}</h4>
        <p>ID: ${acc.id}</p>
        <p>Conectada em: ${new Date(acc.created_at).toLocaleDateString()}</p>
        <button onclick="disconnectAccount(${acc.id})">Desconectar</button>
      </div>
    `).join('');
    
    document.getElementById('accountsList').innerHTML = html;
  }

  function connectNewAccount() {
    const auth = new MercadoLivreAuth();
    window.location.href = auth.getAuthURL('state123');
  }

  function disconnectAccount(userId) {
    if (confirm('Desconectar esta conta?')) {
      storage.removeAccount(userId);
      displayAccounts();
    }
  }

  // Inicial
  displayAccounts();
</script>
```

### 7️⃣ Testar (5 minutos)

```javascript
// No console do navegador
const storage = new SecureTokenStorage();
const accounts = storage.getAllAccounts();
console.log('Contas conectadas:', accounts);

// Fazer requisição com client
const client = new MLAPIClient(accounts[0].access_token, accounts[0].id);
client.getUser().then(user => {
  console.log('✓ Dados do vendedor:', user);
}).catch(error => {
  console.error('✗ Erro:', error);
});
```

---

## FLUXO VISUAL

```
Usuário clica "Conectar Mercado Livre"
        ↓
Redireciona para auth.mercadolibre.com.br
        ↓
Usuário faz login (se necessário)
        ↓
Autoriza escopos (read, write, offline_access)
        ↓
Retorna para seu callback com código de autorização
        ↓
Frontend chama backend para trocar código por token
        ↓
Backend retorna access_token + refresh_token
        ↓
Frontend armazena tokens (criptografados) em localStorage
        ↓
Requisições futuras usam: Authorization: Bearer {token}
        ↓
Quando expira, renovar com refresh_token
```

---

## ENDPOINTS MAIS USADOS

```javascript
// Dados do vendedor
GET /users/{user_id}
Authorization: Bearer {access_token}

// Seus produtos
GET /users/{user_id}/items/search
Authorization: Bearer {access_token}

// Suas vendas
GET /orders/search/all?seller_id={user_id}
Authorization: Bearer {access_token}

// Detalhes de venda
GET /orders/{order_id}
Authorization: Bearer {access_token}

// Atualizar preço
PUT /items/{item_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{ "price": 999.90 }

// Atualizar estoque
PUT /items/{item_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{ "available_quantity": 50 }
```

---

## ESTRUTURA DE PASTAS

```
projeto-sass/
├─ src/scripts/
│  └─ mercado-livre/
│     ├─ auth.js                 ✅ Você criou
│     ├─ api-client.js           ✅ Você criou
│     └─ secure-storage.js       ✅ Você criou
│
├─ examples/
│  ├─ auth/
│  │  └─ mercado-livre-callback.html
│  └─ settings/
│     └─ ml-accounts.html        ✅ Você criou
│
├─ .env                          ✅ Você criou (.gitignore)
├─ MERCADO_LIVRE_INTEGRATION.md  📖 Leia
├─ RESUMO_EXECUTIVO.md           📖 Leia
└─ IMPLEMENTACAO_CHECKLIST.md    ✅ Acompanhe
```

---

## SEGURANÇA - NUNCA ESQUEÇA!

```javascript
// ✅ CERTO
const clientSecret = process.env.ML_CLIENT_SECRET; // ← Backend only!

// ❌ ERRADO
const clientSecret = 'abc123xyz789...'; // ← Frontend = INSEGURO!
console.log(token); // ← Nunca logue tokens
localStorage.setItem('token', token); // ← Criptografe!
```

---

## PRÓXIMAS IMPLEMENTAÇÕES

- [ ] Sincronizador de múltiplas contas
- [ ] Dashboard com dados agregados
- [ ] Atualizar preços/estoque
- [ ] Webhooks para tempo real
- [ ] Backend com Node.js/Express
- [ ] Database para armazenar histórico

---

## DOCUMENTAÇÃO COMPLETA

Leia **MERCADO_LIVRE_INTEGRATION.md** para:
- Todas as classes prontas para copiar/colar
- Todos os endpoints da API explicados
- Tratamento de erros
- Testes unitários
- Troubleshooting
- Segurança avançada

---

## SUPORTE

- 📚 Docs ML: https://developers.mercadolibre.com.br/pt_br/api-docs-pt-br
- 🔐 OAuth: https://developers.mercadolibre.com.br/pt_br/autenticacao-e-autorizacao
- 🔔 Webhooks: https://developers.mercadolibre.com.br/pt_br/produto-receba-notificacoes

---

**Tempo estimado**: 2-3 horas para ter a autenticação funcionando  
**Complexidade**: Intermediária (JWT + OAuth)  
**Dependências**: Zero (vanilla JavaScript)
