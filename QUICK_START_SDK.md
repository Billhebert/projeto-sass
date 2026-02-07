# 🚀 QUICK START - SDK MERCADO LIVRE

## Instalação Rápida

A SDK já está instalada! Basta importar:

```javascript
const { MercadoLibreSDK } = require('./backend/sdk/complete-sdk');
```

## Uso Básico

### 1️⃣ Criar Instância com Token

```javascript
const sdk = new MercadoLibreSDK(
  'seu_access_token_aqui',
  'seu_refresh_token_aqui' // opcional
);
```

### 2️⃣ Usar Qualquer Módulo dos 90+ Disponíveis

```javascript
// Mercado Livre
const items = await sdk.items.getItemsByUser(userId);
const orders = await sdk.orders.getOrdersByUser(userId);
const user = await sdk.users.getUserInfo(userId);

// Mercado Pago
sdk.setMPAccessToken('seu_mp_token');
const payments = await sdk.mpPayments.list();
const customers = await sdk.mpCustomers.list();
```

### 3️⃣ SDK Manager (Recomendado)

```javascript
const sdkManager = require('./backend/services/sdk-manager');

// Carrega SDK com cache (5 minutos)
const sdk = await sdkManager.getSDK(accountId);

// Use como normal
const items = await sdk.items.getItemsByUser(userId);

// Invalidar cache quando tokens mudarem
sdkManager.invalidateCache(accountId);
```

## Exemplos Práticos

### Buscar Todos os Itens de um Vendedor

```javascript
const sdk = new MercadoLibreSDK(accessToken);

// Página 1
const response = await sdk.items.getItemsByUser(userId, {
  limit: 100,
  offset: 0,
  sort: 'id'
});

console.log(`Total de itens: ${response.data.paging.total}`);
console.log(`Itens nesta página: ${response.data.results.length}`);

// Iterar por todas as páginas
for (const itemId of response.data.results) {
  const item = await sdk.items.getItem(itemId);
  console.log(item.data.title);
}
```

### Processar Pagamento (Mercado Pago)

```javascript
const sdk = new MercadoLibreSDK(mlToken);
sdk.setMPAccessToken(mpToken);

const payment = await sdk.mpPayments.create({
  transaction_amount: 100.50,
  description: 'Compra de produtos',
  payment_method_id: 'visa',
  installments: 1,
  payer: {
    email: 'comprador@email.com'
  },
  card_token: 'token_do_cartao'
});

console.log('Pagamento criado:', payment.data.id);
```

### Criar Item

```javascript
const sdk = new MercadoLibreSDK(accessToken);

const item = await sdk.items.createItem({
  title: 'Produto Incrível',
  category_id: 'MLB5672',
  price: 250.00,
  currency_id: 'BRL',
  available_quantity: 100,
  buying_mode: 'buy_it_now',
  listing_type_id: 'gold_pro',
  attributes: [
    {
      id: '88',
      value_id: '2230284'
    }
  ]
});

console.log('Item criado:', item.data.id);
```

### Listar Pedidos

```javascript
const sdk = new MercadoLibreSDK(accessToken);

const orders = await sdk.orders.getOrdersByUser(userId, {
  limit: 50,
  offset: 0,
  sort: 'date_desc'
});

for (const order of orders.data.results) {
  console.log(`Pedido ${order.id}:`);
  console.log(`- Comprador: ${order.buyer.id}`);
  console.log(`- Total: ${order.total_amount}`);
  console.log(`- Status: ${order.status}`);
}
```

### Responder Pergunta

```javascript
const sdk = new MercadoLibreSDK(accessToken);

const response = await sdk.questions.answerQuestion(questionId, {
  text: 'Sim, este produto está em estoque!'
});

console.log('Pergunta respondida');
```

## Módulos Disponíveis

### Mercado Livre (40+)
- `items` - Gestão de itens/produtos
- `orders` - Gestão de pedidos
- `questions` - Perguntas dos compradores
- `messages` - Mensagens
- `reviews` - Avaliações
- `categories` - Categorias
- `trends` - Tendências
- `visits` - Análise de visitas
- `billing` - Cobrança
- `shipping` - Envios
- ... e 30+ mais!

### Mercado Pago (45+)
- `mpPayments` - Pagamentos
- `mpCustomers` - Clientes
- `mpCards` - Cartões
- `mpOrders` - Pedidos
- `mpSubscriptions` - Assinaturas
- `mpQRCode` - Pagamento por QR Code
- `mpPOS` - Point of Sale
- `mpWebhooks` - Notificações
- `mpBalance` - Saldo
- ... e 35+ mais!

### Global Selling
- `globalSelling` - Vendas internacionais

## Tratamento de Erros

```javascript
try {
  const items = await sdk.items.getItemsByUser(userId);
  console.log(items.data.results);
} catch (error) {
  console.error('Erro ao buscar itens:');
  console.error('- Status:', error.status);
  console.error('- Mensagem:', error.message);
  console.error('- Resposta:', error.response?.data);
}
```

## Performance e Cache

O SDK Manager já inclui:
- ✅ Cache automático (5 minutos)
- ✅ Retry automático em falhas
- ✅ Timeout configurável
- ✅ Headers corretos

```javascript
const sdkManager = require('./backend/services/sdk-manager');

// Primeira chamada: vai buscar do BD
const sdk1 = await sdkManager.getSDK(accountId); // ~100ms

// Segunda chamada: usa cache
const sdk2 = await sdkManager.getSDK(accountId); // ~5ms

// Invalidar quando necessário
sdkManager.invalidateCache(accountId);

// Próxima chamada busca novamente
const sdk3 = await sdkManager.getSDK(accountId); // ~100ms
```

## Estrutura de Resposta

Todas as chamadas retornam um objeto padronizado:

```javascript
{
  status: 200,
  data: {...},
  error: null
}
```

Erros:
```javascript
{
  status: 400,
  data: null,
  error: 'Mensagem de erro',
  details: {...}
}
```

## Documentação Completa

- 📖 **TESTE_SDK_RELATORIO.md** - Relatório de testes
- 📖 **MIGRACAO_SDK.md** - Como migrar rotas
- 📖 **SDK_RECURSOS.md** - Referência completa
- 📖 **SDK_IMPLEMENTATION.md** - Detalhes técnicos
- 📖 **backend/sdk/EXAMPLES.js** - Exemplos avançados

## Dúvidas Frequentes

**P: Preciso instalar a SDK?**  
R: Não! Ela já está em `backend/sdk/complete-sdk.js`. Basta importar.

**P: Posso usar múltiplas contas?**  
R: Sim! Crie múltiplas instâncias ou use SDK Manager que gerencia automaticamente.

**P: E se o token expirar?**  
R: Se você tiver `refreshToken`, a SDK tenta renovar automaticamente. Caso contrário, retorna erro.

**P: Qual é a diferença entre instância direta e SDK Manager?**  
R: SDK Manager adiciona cache automático, retry e gerenciamento centralizado. Use em produção.

**P: Quantos módulos estão disponíveis?**  
R: 90+ módulos! 40+ de Mercado Livre, 45+ de Mercado Pago, e 5+ de Global Selling.

## Próximos Passos

1. ✅ Teste a SDK com `node test-sdk-report.js`
2. 📖 Leia a documentação completa
3. 🔗 Conecte uma conta real via OAuth
4. 🚀 Migre suas rotas existentes
5. 🎯 Implemente novos recursos

---

**Pronto para começar?** Consulte os exemplos práticos acima ou leia a documentação completa!
