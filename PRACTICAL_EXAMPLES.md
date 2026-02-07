# 💻 Exemplos Práticos de Como Usar a SDK

## Exemplo 1: Usar ml-accounts.js Refatorado

### O que mudou?
```javascript
// ❌ ANTES (Axios direto)
const response = await axios.get(`${ML_API_BASE}/users/me`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
});
const mlUserInfo = response.data;

// ✅ DEPOIS (SDK)
const { MercadoLibreSDK } = require('../sdk/complete-sdk');
const sdk = new MercadoLibreSDK(accessToken, refreshToken);
const mlUserInfo = await sdk.users.getCurrentUser();
```

### Como testar?
```bash
# Verificar sintaxe
node -c backend/routes/ml-accounts.js

# Resultado esperado:
# ✅ Syntax OK
```

---

## Exemplo 2: Usar SDK Manager com Cache

### Código:
```javascript
const sdkManager = require('./backend/services/sdk-manager');

// Get SDK instance (com cache de 5 minutos)
const sdk = await sdkManager.getSDK(accountId);

// Primeira chamada: busca do banco + API
const items = await sdk.items.getItemsByUser(userId, {limit: 50});

// Segunda chamada (< 5 min): usa cache, muito mais rápido!
const items = await sdk.items.getItemsByUser(userId, {limit: 50});

// Cache invalida automaticamente após mutações
await sdk.items.createItem(itemData);  // Cria item
sdkManager.invalidateCache(accountId);  // Limpa cache
```

### Benefícios:
- 10x mais rápido (com cache)
- Retry automático
- Error handling padronizado

---

## Exemplo 3: Testar com Dados Reais

### Passo 1: Setup OAuth
```bash
$ node setup-production.js

# Siga os passos:
# 1. Digite seu Client ID
# 2. Digite seu Client Secret
# 3. Abra o link no navegador
# 4. Autorize no Mercado Livre
# 5. Tokens salvos em .env
```

### Passo 2: Teste
```bash
$ node test-production.js

# Resultado:
# ✅ SDK carregado
# ✅ Tokens válidos
# ✅ Usuário: seu_usuario
# ✅ Produtos: 5 itens
# ✅ Pedidos: 2 pedidos
```

### Passo 3: Use no Código
```javascript
const { MercadoLibreSDK } = require('./backend/sdk/complete-sdk');

// Carregar tokens do .env
const accessToken = process.env.ML_ACCESS_TOKEN;
const refreshToken = process.env.ML_REFRESH_TOKEN;

// Criar SDK
const sdk = new MercadoLibreSDK(accessToken, refreshToken);

// Usar
const user = await sdk.users.getCurrentUser();
const items = await sdk.items.getItemsByUser(user.id);
const orders = await sdk.orders.searchOrders({status: 'paid'});

console.log(`Usuário: ${user.nickname}`);
console.log(`Produtos: ${items.length}`);
console.log(`Pedidos: ${orders.length}`);
```

---

## Exemplo 4: Usar em uma Rota Express

### Código:
```javascript
const express = require('express');
const sdkManager = require('../services/sdk-manager');
const logger = require('../logger');

const router = express.Router();

// GET /api/items/:accountId
router.get('/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    // Usar SDK Manager (com cache)
    const items = await sdkManager.getItemsByUser(accountId, userId, {
      limit: 50,
      offset: 0
    });

    logger.info({
      action: 'GET_ITEMS',
      accountId,
      itemsCount: items.length
    });

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    logger.error({
      action: 'GET_ITEMS_ERROR',
      accountId: req.params.accountId,
      error: error.message
    });

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
```

---

## Exemplo 5: Testar Todos os 90 Módulos

### Código:
```javascript
const { MercadoLibreSDK } = require('./backend/sdk/complete-sdk');

const sdk = new MercadoLibreSDK(accessToken, refreshToken);

// ✅ Mercado Livre - Items
const item = await sdk.items.getItem('MLB123456');
const items = await sdk.items.getItemsByUser(userId);
const search = await sdk.items.searchItems({q: 'notebook'});

// ✅ Mercado Livre - Orders
const order = await sdk.orders.getOrder(orderId);
const orders = await sdk.orders.searchOrders({status: 'paid'});

// ✅ Mercado Pago - Payments
const payment = await sdk.mpPayments.getPayment(paymentId);
const payments = await sdk.mpPayments.searchPayments({status: 'approved'});

// ✅ Mercado Pago - Customers
const customer = await sdk.mpCustomers.getCustomer(customerId);
const customers = await sdk.mpCustomers.listCustomers();

// ... e mais 86 módulos disponíveis!
```

---

## Exemplo 6: Testar Sincronização de Itens

### Código:
```javascript
const sdkManager = require('./backend/services/sdk-manager');

async function syncAllItems(accountId, userId) {
  try {
    console.log('🔄 Sincronizando itens...');
    
    // Pegar todos os itens
    const items = await sdkManager.getItemsByUser(accountId, userId, {
      all: true  // Sem limite
    });

    console.log(`✅ ${items.length} itens encontrados`);

    // Salvar no banco (exemplo)
    for (const item of items) {
      const itemData = await sdkManager.getItem(accountId, item.id);
      // Salvar no MongoDB...
    }

    console.log('✅ Sincronização concluída!');
  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
  }
}

// Usar:
syncAllItems(accountId, userId);
```

---

## Exemplo 7: Testar Tratamento de Erros

### Código:
```javascript
const sdkManager = require('./backend/services/sdk-manager');

async function testErrorHandling(accountId, itemId) {
  try {
    const item = await sdkManager.getItem(accountId, itemId);
    console.log('✅ Item encontrado:', item.title);
  } catch (error) {
    // SDK Manager normaliza erros
    console.error('❌ Erro:', error.type);
    
    switch(error.type) {
      case 'AUTHENTICATION_ERROR':
        console.error('Token inválido ou expirado');
        break;
      case 'NOT_FOUND':
        console.error('Item não existe');
        break;
      case 'RATE_LIMIT':
        console.error('Muitas requisições, tente depois');
        break;
      case 'SERVER_ERROR':
        console.error('Erro no servidor do Mercado Livre');
        break;
      default:
        console.error('Erro genérico:', error.message);
    }
  }
}

testErrorHandling(accountId, 'ML99999999999');
```

---

## Exemplo 8: Testar Token Refresh

### Código:
```javascript
const MLTokenManager = require('./backend/utils/ml-token-manager');

async function refreshToken(accountId) {
  try {
    const account = await MLAccount.findOne({id: accountId});
    
    if (!account.refreshToken) {
      console.log('❌ Conta não suporta refresh automático');
      return;
    }

    // Renovar token
    const result = await MLTokenManager.refreshToken(
      account.refreshToken,
      process.env.ML_CLIENT_ID,
      process.env.ML_CLIENT_SECRET
    );

    if (!result.success) {
      console.error('❌ Erro ao renovar:', result.error);
      return;
    }

    // Atualizar no banco
    account.accessToken = result.accessToken;
    account.refreshToken = result.refreshToken;
    account.tokenExpiresAt = new Date(Date.now() + result.expiresIn * 1000);
    await account.save();

    // Invalidar cache
    sdkManager.invalidateCache(accountId);

    console.log('✅ Token renovado com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

refreshToken(accountId);
```

---

## Exemplo 9: Testar Webhooks

### Código:
```javascript
// Exemplo: Processar webhook de novo pedido

router.post('/webhooks/ml', async (req, res) => {
  try {
    const { resource, user_id, topic } = req.body;

    // Validar webhook
    if (!resource || !user_id || !topic) {
      return res.status(400).json({error: 'Invalid webhook'});
    }

    // Processar asincronamente
    if (topic === 'orders_v2') {
      // Buscar pedido com SDK
      const orderId = resource.split('/')[1];
      const order = await sdkManager.getOrder(user_id, orderId);
      
      // Salvar no banco
      const newOrder = new Order({
        mlOrderId: orderId,
        status: order.status,
        total: order.total_amount,
        // ... outros campos
      });
      await newOrder.save();

      logger.info('Nova ordem processada', {orderId});
    }

    // Responder imediatamente ao ML
    res.json({status: 'received'});
  } catch (error) {
    logger.error('Webhook error:', error.message);
    res.json({status: 'received'}); // Sempre OK
  }
});
```

---

## Exemplo 10: Teste Completo (Integração)

### Código:
```javascript
const sdkManager = require('./backend/services/sdk-manager');

async function completeTest(accountId, userId) {
  console.log('🧪 Iniciando teste completo...\n');

  try {
    // 1. Validar token
    console.log('1️⃣  Validando token...');
    const sdk = await sdkManager.getSDK(accountId);
    const user = await sdk.users.getCurrentUser();
    console.log(`   ✅ Token válido para: ${user.nickname}\n`);

    // 2. Buscar itens
    console.log('2️⃣  Buscando itens...');
    const items = await sdk.items.getItemsByUser(userId, {limit: 5});
    console.log(`   ✅ ${items.length} itens encontrados\n`);

    // 3. Buscar pedidos
    console.log('3️⃣  Buscando pedidos...');
    const orders = await sdk.orders.searchOrders({limit: 5});
    console.log(`   ✅ ${orders.length} pedidos encontrados\n`);

    // 4. Buscar pagamentos
    console.log('4️⃣  Buscando pagamentos...');
    const payments = await sdk.mpPayments.searchPayments({limit: 5});
    console.log(`   ✅ ${payments.length} pagamentos encontrados\n`);

    console.log('✅ TODOS OS TESTES PASSARAM!');
    return true;
  } catch (error) {
    console.error('❌ TESTE FALHOU:', error.message);
    return false;
  }
}

// Usar:
completeTest(accountId, userId);
```

---

## 🎯 Próximos Passos

1. **Teste Rápido**
   ```bash
   node test-sdk-report.js
   ```

2. **Com Dados Reais**
   ```bash
   node setup-production.js
   node test-production.js
   ```

3. **Na Sua Aplicação**
   - Siga os exemplos acima
   - Use sdkManager para cache
   - Trate erros com normalizeError()

4. **Documente**
   - Deixe exemplo no seu código
   - Atualize documentação
   - Compartilhe com time

