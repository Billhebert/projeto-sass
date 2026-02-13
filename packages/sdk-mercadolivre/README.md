# Mercado Livre SDK

SDK completo em JavaScript/TypeScript para integração com a API do Mercado Livre.

## Instalação

```bash
npm install mercadolivre-sdk
```

```bash
yarn add mercadolivre-sdk
```

## Uso Rápido

```typescript
import { MercadoLivre } from 'mercadolivre-sdk';

// Criar instância
const ml = new MercadoLivre({
  accessToken: 'SEU_ACCESS_TOKEN',
  siteId: 'MLB', // Brasil
});

// Usar recursos
const user = await ml.users.getMe();
const items = await ml.items.searchItems(1033763524);
```

## Autenticação

### OAuth2

```typescript
import { MercadoLivre } from 'mercadolivre-sdk';

const ml = new MercadoLivre({
  clientId: 'SEU_CLIENT_ID',
  clientSecret: 'SEU_CLIENT_SECRET',
  redirectUri: 'http://localhost:3000/callback',
});

// Gerar URL de autorização
const authUrl = ml.auth.getAuthorizationUrl({
  response_type: 'code',
  state: 'estado_seguro',
});

// Trocar código por token
const token = await ml.auth.exchangeCodeForToken(code);

// Refresh token
await ml.auth.refreshAccessToken();
```

## Recursos Disponíveis

### Usuários

```typescript
// Usuário atual
const user = await ml.users.getMe();

// Usuário específico
const user = await ml.users.get(123456789);

// Endereços
const addresses = await ml.users.getAddresses(userId);

// Itens de um usuário
const items = await ml.users.getItems(userId, { limit: 20 });
```

### Itens e Publicações

```typescript
// Buscar item
const item = await ml.items.get('MLB123456789');

// Criar item
const newItem = await ml.items.create({
  title: 'Produto Teste',
  category_id: 'MLB1055',
  price: 99.90,
  currency_id: 'BRL',
  available_quantity: 10,
  buying_mode: 'buy_it_now',
  listing_type_id: 'gold_pro',
});

// Atualizar item
await ml.items.update('MLB123456789', { price: 89.90 });

// Descrição
await ml.items.setDescription('MLB123456789', 'Nova descrição');

// Pausar/Ativar
await ml.items.pause('MLB123456789');
await ml.items.activate('MLB123456789');
```

### Pedidos

```typescript
// Buscar pedidos
const orders = await ml.orders.search({ seller: 1033763524 });

// Pedido específico
const order = await ml.orders.get(1234567890);

// Feedback
await ml.orders.createSaleFeedback(orderId, {
  rating: 'positive',
  fulfilled: true,
  message: 'Ótimo comprador!',
});

// Notas
await ml.orders.createNote(orderId, 'Observação importante');
```

### Envios

```typescript
// Buscar envio
const shipment = await ml.shipments.get(1234567890);

// Status
const statuses = await ml.shipments.getStatuses();

// Simular cotação
const quote = await ml.shipments.simulateQuote({
  dimensions: '10x10x10,500',
  weight: 1,
  zipCode: '01310000',
  itemPrice: 100,
});
```

### Categorias e Busca

```typescript
// Categoria
const category = await ml.categories.get('MLB1055');

// Atributos
const attributes = await ml.categories.getAttributes('MLB1055');

// Busca
const results = await ml.search.byQuery('iphone', {
  limit: 20,
  priceFrom: 1000,
  priceTo: 5000,
});
```

### Perguntas e Respostas

```typescript
// Buscar perguntas
const questions = await ml.questions.search({ sellerId: 123456789 });

// Criar pergunta
await ml.questions.create('MLB123456789', 'Este produto tem garantia?');

// Responder
await ml.questions.answer(questionId, 'Sim, 12 meses!');
```

### Promoções

```typescript
// Promoções do usuário
const promotions = await ml.promotions.getUserPromotions(123456789);

// Criar promoção
const promotion = await ml.promotions.createPromotion({
  name: 'Black Friday',
  type: 'DEAL',
  startDate: '2024-11-25',
  endDate: '2024-11-30',
  conditions: [],
  benefits: [],
});
```

### Faturamento

```typescript
// Documentos fiscais
const documents = await ml.billing.getDocuments({ userId: 123456789 });

// Períodos de billing
const periods = await ml.billing.getBillingPeriods();

// Resumo
const summary = await ml.billing.getSummaryDetails('2024-11-01');
```

### Publicidade

```typescript
// Anunciantes
const advertisers = await ml.advertising.listAdvertisers();

// Campanhas
const campaigns = await ml.advertising.getCampaigns(123456789);

// Product Ads
const productAds = await ml.advertising.searchProductAds('MLB', 123456789, {
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
});
```

### Reclamações

```typescript
// Reclamação
const claim = await ml.claims.get('1234567890');

// Mensagens
await ml.claims.sendMessage(claimId, 'Olá, podemos resolver isso?');

// Evidências
await ml.claims.addEvidence(claimId, { type: 'image', url: '...' });
```

### Mensagens

```typescript
// Mensagens não lidas
const unread = await ml.messages.getUnread('post_sale');

// Enviar
await ml.messages.send({
  message: 'Olá!',
  resourceId: '1234567890',
  resource: 'order',
});
```

### Métricas

```typescript
// Visitas
const visits = await ml.visits.getUserVisits(123456789, '2024-01-01', '2024-12-31');

// Tendências
const trends = await ml.trends.getBrazilTrends();

// Reputação
const reputation = await ml.reputation.getSellerReputation(123456789);
```

### Localização e Moedas

```typescript
// Países
const countries = await ml.locations.listCountries();

// CEP
const zipCode = await ml.locations.searchZipCode('MLB', '01310000');

// Moedas
const currencies = await ml.currencies.list();
```

## Error Handling

```typescript
import { MercadoLivre, MercadoLivreError } from 'mercadolivre-sdk';

try {
  const user = await ml.users.getMe();
} catch (error) {
  if (error instanceof MercadoLivreError) {
    console.error('Código:', error.errorCode);
    console.error('Status:', error.statusCode);
    console.error('Mensagem:', error.message);
  }
}
```

## Configuração Avançada

```typescript
const ml = new MercadoLivre({
  accessToken: 'TOKEN',
  siteId: 'MLB',
  timeout: 60000,        // 60 segundos
  retries: 5,            // 5 retries em rate limit
  retryDelay: 2000,      // 2 segundos entre retries
  baseURL: 'https://api.mercadolibre.com',
});

// Atualizar token
ml.setAccessToken('NOVO_TOKEN');

// Mudar site
ml.setSiteId('MLA'); // Argentina
```

## Tipos TypeScript

Todos os tipos estão disponíveis em `mercadolivre-sdk/types`:

```typescript
import { User, Item, Order, Shipment, Payment, Category } from 'mercadolivre-sdk';
```

## Documentação

- [API Docs Oficial](https://developers.mercadolivre.com.br/)
- [Referência OAuth](https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao)
- [Model Context Protocol (MCP)](https://developers.mercadolivre.com.br/pt_br/server-mcp)

## Licença

MIT
