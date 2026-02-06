# Documentação Completa - Mercado Libre SDK v3.0

## Sumário

1. [Introdução](#introdução)
2. [Instalação](#instalação)
3. [Configuração Inicial](#configuração-inicial)
4. [Recursos do Mercado Livre](#recursos-do-mercado-livre)
5. [Recursos do Mercado Pago](#recursos-do-mercadopago)
6. [Recursos do Global Selling](#recursos-do-global-selling)
7. [Autenticação](#autenticação)
8. [Tratamento de Erros](#tratamento-de-erros)
9. [Exemplos Práticos](#exemplos-práticos)
10. [Perguntas Frequentes](#perguntas-frequentes)

---

## Introdução

O **Mercado Libre SDK** é uma biblioteca completa que integra três plataformas principais:

- **Mercado Livre** (`api.mercadolibre.com`) - Marketplace principal
- **Mercado Pago** (`api.mercadopago.com`) - Sistema de pagamentos
- **Global Selling** - Venda internacional

### Características

- **791 métodos** disponíveis
- **35 recursos** do Mercado Livre
- **25 recursos** do Mercado Pago
- **Suporte completo** a OAuth 2.0
- **Retry automático** em falhas de rede
- **TypeScript ready** - pode ser usado com JSDoc

---

## Instalação

```bash
npm install
```

### Dependências

O SDK usa apenas o módulo `https` nativo do Node.js, sem dependências externas.

---

## Configuração Inicial

```javascript
const { MercadoLibreSDK } = require('./sdk/complete-sdk');

const sdk = new MercadoLibreSDK({
  // Tokens do Mercado Livre
  mlAccessToken: process.env.ML_ACCESS_TOKEN,
  mlRefreshToken: process.env.ML_REFRESH_TOKEN,
  
  // Tokens do Mercado Pago
  mpAccessToken: process.env.MP_ACCESS_TOKEN,
  
  // Tokens do Global Selling
  gsAccessToken: process.env.GS_ACCESS_TOKEN,
  
  // Configurações opcionais
  mlBaseURL: 'https://api.mercadolibre.com',
  mpBaseURL: 'https://api.mercadopago.com',
  gsBaseURL: 'https://api.mercadolibre.com',
  
  timeout: 30000,      // Timeout em ms
  retries: 3,          // Número de retry em falha
  retryDelay: 1000    // Delay inicial entre retry (ms)
});
```

---

## Recursos do Mercado Livre

### 1. Usuários (Users)

Gerenciamento de contas e informações de usuários.

```javascript
// Obter usuário atual
const user = await sdk.users.getUserInfo();

// Obter dados de qualquer usuário
const userData = await sdk.users.getUser(12345);

// Listar endereços
const addresses = await sdk.users.getUserAddresses(12345);

// Listar aplicações do usuário
const apps = await sdk.users.getUserApplications(12345);

// Listar tokens
const tokens = await sdk.users.getUserTokens(12345);

// Buscar usuários
const search = await sdk.users.searchUsers({
  query: 'vendedor',
  limit: 10
});

// Obter contatos
const contacts = await sdk.users.getUserContacts(12345);

// Obter reputação
const reputation = await sdk.users.getUserDealReputation(12345);

// Restrições de venda
const restrictions = await sdk.users.getUserSalesRestrictions(12345);
```

### 2. Itens (Items)

Gerenciamento de produtos/anúncios.

```javascript
// Obter item
const item = await sdk.items.getItem('MLB123456');

// Obter descrição
const description = await sdk.items.getItemDescription('MLB123456');

// Obter item com descrição
const itemFull = await sdk.items.getItemWithDescription('MLB123456');

// Criar item
const newItem = await sdk.items.createItem({
  title: "iPhone 15 Pro 256GB",
  category_id: "MLB1051",
  price: 7499.90,
  currency_id: "BRL",
  available_quantity: 10,
  condition: "new",
  listing_type_id: "gold_pro",
  pictures: [
    { source: "https://exemplo.com/foto1.jpg" }
  ],
  attributes: [
    { id: "BRAND", value_id: "59387" },
    { id: "MODEL", value_id: "12345" }
  ]
});

// Atualizar item
const updated = await sdk.items.updateItem('MLB123456', {
  price: 6999.90,
  available_quantity: 5
});

// Deletar/finalizar item
await sdk.items.deleteItem('MLB123456');

// Relistar item
const relisted = await sdk.items.relistItem('MLB123456', {
  price: 6500,
  quantity: 3
});

// Buscar itens
const search = await sdk.items.searchItems({
  q: "iphone 15",
  category: "MLB1051",
  limit: 20,
  offset: 0,
  sort: "price_asc"
});

// Itens por categoria
const categoryItems = await sdk.items.getItemsByCategory('MLB1051', {
  limit: 20
});

// Meus itens
const myItems = await sdk.items.getItemsByUser(12345, {
  status: "active",
  limit: 50
});

// Validar item antes de criar
const validation = await sdk.items.validateItem({
  title: "Produto Teste",
  category_id: "MLB1051",
  price: 100
});

// Itens similares
const similar = await sdk.items.getSimilarItems('MLB123456');
```

### 3. Categorias (Categories)

Informações sobre categorias do catálogo.

```javascript
// Listar todas
const categories = await sdk.categories.listCategories();

// Obter categoria
const category = await sdk.categories.getCategory('MLB1051');

// Atributos
const attributes = await sdk.categories.getCategoryAttributes('MLB1051');

// Tipos de listagem
const listingTypes = await sdk.categories.getCategoryListingTypes('MLB1051');

// Preços por categoria
const prices = await sdk.categories.getCategoryPrices('MLB1051');

// Árvore de categorias
const tree = await sdk.categories.getCategoryTree('MLB1051');

// Caminho da categoria
const path = await sdk.categories.getCategoryPathFromId('MLB1051');

// Previsor de categoria
const predictor = await sdk.categories.getCategoryPredictor('MLB123456');

// Variações
const variations = await sdk.categories.getCategoryVariations('MLB1051');
```

### 4. Sites (Sites)

Operações por país/plataforma.

```javascript
// Listar todos os sites
const sites = await sdk.sites.listSites();

// Obter site
const site = await sdk.sites.getSite('MLB');

// Categorias do site
const siteCategories = await sdk.sites.getSiteCategories('MLB');

// Tipos de listagem
const listingTypes = await sdk.sites.getSiteListingTypes('MLB');

// Moedas
const currencies = await sdk.sites.getSiteCurrencies('MLB');

// Sugestões de domínio
const domains = await sdk.sites.getSiteDomainSuggestions('MLB');

// Configuração do site
const config = await sdk.sites.getSiteConfiguration('MLB');
```

### 5. Pedidos (Orders)

Gestão completa de pedidos.

```javascript
// Obter pedido
const order = await sdk.orders.getOrder(1234567890);

// Buscar pedidos
const orders = await sdk.orders.searchOrders({
  seller_id: 12345,
  status: 'paid',
  limit: 20
});

// Pedidos de um usuário
const myOrders = await sdk.orders.getOrdersByUser(12345, {
  limit: 20
});

// Notas do pedido
const notes = await sdk.orders.getOrderNotes(1234567890);
await sdk.orders.createOrderNote(1234567890, {
  note: "Enviar com seguro"
});

// Packs
const pack = await sdk.orders.getOrderPack(1234567890);

// Envios
const shipments = await sdk.orders.getShipments(1234567890);

// Pagamentos
const payments = await sdk.orders.getOrderPayment(1234567890);

// Status de envio
const statuses = await sdk.orders.getShippingStatuses();

// Tipos de shipment
const shipmentTypes = await sdk.orders.getShipmentTypes();

// Criar pedido
const newOrder = await sdk.orders.createOrder({
  item_id: 'MLB123456',
  quantity: 1,
  buyer: {
    id: 67890
  }
});

// Cancelar pedido
await sdk.orders.cancelOrder(1234567890, ' buyer_requested');

// Impostos do pedido
const taxes = await sdk.orders.getOrderTaxes(1234567890);
```

### 6. Pagamentos (Payments)

Operações de pagamento no Mercado Livre.

```javascript
// Obter pagamento
const payment = await sdk.payments.getPayment(1234567890);

// Buscar pagamentos
const payments = await sdk.payments.searchPayments({
  seller_id: 12345,
  status: 'approved',
  limit: 20
});

// Criar pagamento
const newPayment = await sdk.payments.createPayment({
  transaction_amount: 100,
  token: "card_token_id",
  description: "Produto purchased",
  installments: 1,
  payment_method_id: "visa",
  payer: {
    email: "comprador@email.com",
    id: "12345"
  }
});

// Capturar pagamento
await sdk.payments.capturePayment(1234567890, {
  transaction_amount: 100
});

// Reembolso
const refund = await sdk.payments.refundPayment(1234567890, {
  amount: 50
});

// Métodos de pagamento disponíveis
const methods = await sdk.payments.getPaymentMethods();

// Tipo de método
const method = await sdk.payments.getPaymentMethod('visa');

// Tipos de pagamento
const types = await sdk.payments.getPaymentTypes();

// Parcelas
const installments = await sdk.payments.getPaymentMethodInstallments('visa', 1000);

// Parcelas por BIN
const binInstallments = await sdk.payments.getPaymentMethodBinInstallments('450799', {
  amount: 1000
});

// Configurações de pagamento
const configs = await sdk.payments.getPaymentConfigs();

// Moeda
const currency = await sdk.payments.getPaymentCurrencyConfig('BRL');

// Taxas do pedido
const fees = await sdk.payments.getPaymentFeeOrders(1234567890);
```

### 7. Preferências (Preferences)

Checkout Preferences do Mercado Livre.

```javascript
// Criar preferência
const pref = await sdk.preferences.createCheckoutPreference({
  items: [{
    id: 'MLB123456',
    title: 'Produto',
    quantity: 1,
    unit_price: 99.90,
    currency_id: 'BRL'
  }],
  payer: {
    name: 'João',
    surname: 'Silva',
    email: 'joao@email.com'
  },
  back_urls: {
    success: 'https://seusite.com/success',
    failure: 'https://seusite.com/failure',
    pending: 'https://seusite.com/pending'
  },
  auto_return: 'approved',
  external_reference: 'ORDER123',
  notification_url: 'https://seusite.com/webhook'
});

// Obter preferência
const preference = await sdk.preferences.getCheckoutPreference('123456');

// Atualizar preferência
await sdk.preferences.updateCheckoutPreference('123456', {
  items: [{
    id: 'MLB123456',
    title: 'Produto Atualizado',
    quantity: 2,
    unit_price: 89.90
  }]
});

// Buscar preferências
const prefs = await sdk.preferences.searchCheckoutPreferences({
  status: 'approved',
  limit: 20
});

// Adicionar item
await sdk.preferences.createPreferenceItem('123456', {
  id: 'MLB789',
  title: 'Novo Item',
  quantity: 1,
  unit_price: 50
});
```

### 8. Envios (Shipping)

Gestão de logística e entregas.

```javascript
// Obter envio
const shipment = await sdk.shipping.getShipment(1234567890);

// Buscar envios
const shipments = await sdk.shipping.searchShipments({
  seller_id: 12345,
  status: 'ready_to_ship',
  limit: 20
});

// Criar envio
const newShipment = await sdk.shipping.createShipment({
  mode: 'me2',
  logistic_type: 'forward',
  shipping_mode: 'custom',
  sender_id: 12345,
  recipient_id: 67890,
  items: [{
    id: 'MLB123456',
    quantity: 1
  }]
});

// Atualizar envio
await sdk.shipping.updateShipment(1234567890, {
  tracking_number: 'ABC123456'
});

// Modos de envio
const modes = await sdk.shipping.getShippingModes();

// Custos de envio
const costs = await sdk.shipping.getShippingCosts({
  zip_code_from: '01310930',
  zip_code_to: '04534000',
  item_id: 'MLB123456',
  quantity: 1
});

// Etiquetas
const label = await sdk.shipping.getShippingLabels(1234567890, {
  response_type: 'url'
});

// Tipos de envio
const types = await sdk.shipping.getShippingTypes();

// Serviços de envio
const services = await sdk.shipping.getShippingServices('MLB');

// Embalagem do envio
const packing = await sdk.shipping.getShipmentPacking(1234567890);

// Rastreamento
const tracking = await sdk.shipping.getShipmentTracking(1234567890);

// Status do envio
const status = await sdk.shipping.getShipmentStatus(1234567890);

// Enviar nota fiscal
await sdk.shipping.createShipmentInvoice(1234567890, {
  invoice_number: 'NF12345',
  invoice_date: '2024-01-15'
});

// Taxas de frete
const rates = await sdk.shipping.getFreightRates('MLB');

// Regras de envio
const rules = await sdk.shipping.getShippingRules();

// Modos por categoria
const categoryModes = await sdk.shipping.getShippingModesByCategory('MLB1051');
```

### 9. Perguntas (Questions)

Gestão de perguntas sobre produtos.

```javascript
// Obter pergunta
const question = await sdk.questions.getQuestion(12345);

// Perguntas de um item
const itemQuestions = await sdk.questions.getItemQuestions('MLB123456', {
  status: 'unanswered',
  limit: 20
});

// Perguntas de um usuário
const userQuestions = await sdk.questions.getUserQuestions(67890, {
  limit: 20
});

// Criar/perguntar
const newQuestion = await sdk.questions.createQuestion({
  item_id: 'MLB123456',
  seller_id: 12345,
  text: 'Tem disponível?'
});

// Responder pergunta
await sdk.questions.answerQuestion(12345, {
  text: 'Sim, temos!'
});

// Deletar pergunta
await sdk.questions.deleteQuestion(12345);

// Minhas perguntas como comprador
const myQuestions = await sdk.questions.getQuestionsAsker(67890);
```

### 10. Avaliações (Reviews)

Gestão de avaliações e feedbacks.

```javascript
// Avaliações de um item
const reviews = await sdk.reviews.getItemReviews('MLB123456', {
  limit: 20
});

// Avaliação de um pedido
const orderReview = await sdk.reviews.getOrderReviews(1234567890);

// Criar avaliação
const newReview = await sdk.reviews.createReview({
  order_id: 1234567890,
  rating: 5,
  review: 'Excelente vendedor!'
});

// Estatísticas de avaliações
const stats = await sdk.reviews.getReviewStats('MLB123456');
```

### 11. Pedidos Merchant (Merchant Orders)

Gestão avançada de pedidos.

```javascript
// Obter merchant order
const mo = await sdk.merchantOrders.getMerchantOrder(1234567890);

// Buscar merchant orders
const mos = await sdk.merchantOrders.searchMerchantOrders({
  seller_id: 12345,
  status: 'paid',
  limit: 20
});

// Criar merchant order
const newMO = await sdk.merchantOrders.createMerchantOrder({
  preference_id: '123456',
  items: [{
    id: 'MLB123456',
    quantity: 1,
    unit_price: 99.90
  }],
  shipping: {
    mode: 'me2',
    cost: 20
  }
});

// Atualizar merchant order
await sdk.merchantOrders.updateMerchantOrder(1234567890, {
  status: 'fulfilled'
});

// Fechar merchant order
await sdk.merchantOrders.closeMerchantOrder(1234567890, 'fulfilled');

// Reabrir merchant order
await sdk.merchantOrders.reopenMerchantOrder(1234567890);

// Pagamentos
const moPayments = await sdk.merchantOrders.getMerchantOrderPayments(1234567890);

// Envios
const moShipments = await sdk.merchantOrders.getMerchantOrderShipments(1234567890);
```

### 12. Clientes (Customers)

Gestão de clientes do Mercado Pago.

```javascript
// Obter cliente
const customer = await sdk.customers.getCustomer(12345);

// Buscar clientes
const customers = await sdk.customers.searchCustomers({
  email: 'cliente@email.com',
  limit: 20
});

// Criar cliente
const newCustomer = await sdk.customers.createCustomer({
  email: 'novo@email.com',
  first_name: 'João',
  last_name: 'Silva',
  phone: {
    area_code: '11',
    number: '999999999'
  },
  identification: {
    type: 'CPF',
    number: '12345678900'
  },
  address: {
    zip_code: '01310930',
    street_name: 'Avenida Paulista',
    street_number: '100'
  }
});

// Atualizar cliente
await sdk.customers.updateCustomer(12345, {
  first_name: 'José'
});

// Cartões do cliente
const cards = await sdk.customers.getCustomerCards(12345);
await sdk.customers.createCustomerCard(12345, {
  token: 'card_token_id'
});
await sdk.customers.deleteCustomerCard(12345, 'card123');

// Endereços
const addresses = await sdk.customers.getCustomerAddresses(12345);
await sdk.customers.createCustomerAddress(12345, {
  zip_code: '04534000',
  street_name: 'Rua Augusta',
  street_number: '500'
});

// Deletar cliente
await sdk.customers.deleteCustomer(12345);

// Identificações
const identifications = await sdk.customers.getCustomerIdentifications(12345);

// Contratos
const contracts = await sdk.customers.getCustomerContracts(12345);
```

### 13. Lojas (Stores)

Gestão de lojas oficiais.

```javascript
// Obter loja
const store = await sdk.stores.getStore(12345);

// Buscar lojas de um usuário
const stores = await sdk.stores.searchStores(12345, {
  limit: 20
});

// Criar loja
const newStore = await sdk.stores.createStore(12345, {
  name: 'Minha Loja',
  description: 'Descrição da loja',
  logo: 'https://exemplo.com/logo.png',
  main_color: '#FF0000'
});

// Atualizar loja
await sdk.stores.updateStore(12345, 67890, {
  name: 'Loja Atualizada'
});

// Deletar loja
await sdk.stores.deleteStore(12345, 67890);

// Catálogo da loja
const catalog = await sdk.stores.getStoreCatalog(67890);

// Seguidores
const followers = await sdk.stores.getStoreFollowers(67890);
```

### 14. POS (Pontos de Venda)

Gestão de pontos de venda físicos.

```javascript
// Obter POS
const pos = await sdk.pos.getPOS(12345);

// Buscar POS
const posList = await sdk.pos.searchPOS({
  store_id: 67890,
  limit: 20
});

// Criar POS
const newPOS = await sdk.pos.createPOS({
  name: 'PDV Principal',
  store_id: 67890,
  external_id: 'pdv_001',
  address: {
    zip_code: '01310930',
    street_name: 'Avenida Paulista',
    street_number: '100'
  }
});

// Atualizar POS
await sdk.pos.updatePOS(12345, {
  name: 'PDV Atualizado'
});

// Deletar POS
await sdk.pos.deletePOS(12345);

// POS externos
const externalPOS = await sdk.pos.getPOSExternalPOS({
  external_id: 'pdv_001'
});

// Configurações do POS
const settings = await sdk.pos.getPOSSettings(12345);
await sdk.pos.updatePOSSettings(12345, {
  receipt_email: 'loja@email.com'
});
```

### 15. Assinaturas (Subscriptions)

Gestão de planos e pré-aprovamentos.

```javascript
// Obter pré-aprovamento
const preapproval = await sdk.subscriptions.getPreapproval('12345');

// Buscar pré-aprovamentos
const preapprovals = await sdk.subscriptions.searchPreapprovals({
  payer_id: 12345,
  status: 'authorized',
  limit: 20
});

// Criar pré-aprovamento
const newPreapproval = await sdk.subscriptions.createPreapproval({
  payer_email: 'comprador@email.com',
  back_url: 'https://site.com/success',
  reason: 'Assinatura Premium',
  auto_recurring: {
    frequency: 1,
    frequency_type: 'months',
    start_date: '2024-02-01T00:00:00.000-04:00',
    end_date: '2024-12-31T23:59:59.000-04:00',
    transaction_amount: 99.90,
    currency_id: 'BRL'
  }
});

// Atualizar pré-aprovamento
await sdk.subscriptions.updatePreapproval('12345', {
  auto_recurring: {
    transaction_amount: 149.90
  }
});

// Planos
const plan = await sdk.subscriptions.getPreapprovalPlan('plan123');
const plans = await sdk.subscriptions.searchPreapprovalPlans({
  limit: 20
});
const newPlan = await sdk.subscriptions.createPreapprovalPlan({
  name: 'Plano Gold',
  auto_recurring: {
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: 199.90
  }
});

// Pagamentos autorizados
const authorized = await sdk.subscriptions.getAuthorizedPayments('12345');

// Cancelar pré-aprovamento
await sdk.subscriptions.cancelPreapproval('12345');

// Pausar pré-aprovamento
await sdk.subscriptions.pausePreapproval('12345');
```

### 16. Chargebacks

Gestão de disputas de pagamento.

```javascript
// Obter chargeback
const chargeback = await sdk.chargebacks.getChargeback('12345');

// Chargebacks de um pagamento
const paymentChargebacks = await sdk.chargebacks.getPaymentChargebacks(1234567890);

// Criar evidência
await sdk.chargebacks.createChargebackEvidence('12345', {
  type: 'product',
  content: 'Evidência do envio'
});

// Aceitar chargeback
await sdk.chargebacks.acceptChargeback('12345');

// Disputa
const dispute = await sdk.chargebacks.getChargebackDispute('12345');
await sdk.chargebacks.createChargebackDispute('12345', {
  type: 'product_not_received',
  reason: 'Cliente não recebeu'
});
```

### 17. Reclamações (Claims)

Gestão de reclamações.

```javascript
// Obter reclamação
const claim = await sdk.claims.getClaim(12345);

// Buscar reclamações
const claims = await sdk.claims.searchClaims({
  status: 'opened',
  limit: 20
});

// Evidências
const evidence = await sdk.claims.getClaimEvidence(12345);
await sdk.claims.uploadClaimEvidence(12345, {
  type: 'shipping_evidence',
  date_received: '2024-01-15',
  status: 'delivered'
});

// Aceitar reclamação
await sdk.claims.acceptClaim(12345);

// Mensagens
const messages = await sdk.claims.getClaimMessages(12345);
await sdk.claims.sendClaimMessage(12345, {
  message: 'Já entramos em contato com o cliente.'
});

// Resolução
const resolution = await sdk.claims.getClaimResolution(12345);
await sdk.claims.proposeClaimResolution(12345, {
  type: 'refund',
  amount: 50
});
```

### 18. Descontos (Discounts)

Campanhas e cupons.

```javascript
// Descontos disponíveis
const discounts = await sdk.discounts.getDiscounts();

// Campanhas
const campaigns = await sdk.discounts.getCampaigns({
  status: 'active',
  limit: 20
});

// Criar campanha
const newCampaign = await sdk.discounts.createCampaign({
  name: 'Promoção Natal',
  description: '10% OFF',
  discount_percentage: 10,
  start_date: '2024-12-20',
  end_date: '2024-12-25'
});

// Obter campanha
const campaign = await sdk.discounts.getCampaign(12345);
await sdk.discounts.updateCampaign(12345, {
  discount_percentage: 15
});

// Deletar campanha
await sdk.discounts.deleteCampaign(12345);

// Cupons
const coupons = await sdk.discounts.getCoupons({
  campaign_id: 12345
});
const newCoupon = await sdk.discounts.createCoupon({
  code: 'NATAL10',
  type: 'percentage',
  amount: 10,
  expiration_date: '2024-12-31'
});

// Promoções
const promotions = await sdk.discounts.getPromotions();
```

### 19. Cobrança (Billing)

Gestão fiscal e notas.

```javascript
// Informações de cobrança
const billingInfo = await sdk.billing.getBillingInfos({
  seller_id: 12345
});
const newBillingInfo = await sdk.billing.createBillingInfo({
  type: 'seller',
  category: 'retail',
  identification: {
    type: 'CNPJ',
    number: '12345678000100'
  }
});

// Notas fiscais
const invoices = await sdk.billing.getInvoices({
  seller_id: 12345,
  limit: 20
});
const invoice = await sdk.billing.getInvoice(12345);

// Criar nota
const newInvoice = await sdk.billing.createInvoice({
  type: 'NFe',
  serie: '1',
  number: '1000',
  items: [{
    description: 'Produto',
    quantity: 1,
    unit_price: 100
  }]
});

// Validar nota
const validation = await sdk.billing.validateInvoice({
  type: 'NFe',
  serie: '1',
  number: '1000'
});

// Tipos de nota
const invoiceTypes = await sdk.billing.getInvoiceTypes();

// Impostos
const taxes = await sdk.billing.getTaxes({
  seller_id: 12345
});

// Configurações fiscais
const taxConfig = await sdk.billing.getTaxConfiguration(12345);
await sdk.billing.updateTaxConfiguration(12345, {
  icms: {
    origin: 0,
    cst: '00'
  }
});
```

### 20. Visitas (Visits)

Métricas de tráfego.

```javascript
// Visitas de um item
const itemVisits = await sdk.visits.getItemVisits('MLB123456', {
  date_from: '2024-01-01',
  date_to: '2024-01-31'
});

// Visitas de um usuário
const userVisits = await sdk.visits.getUserVisits(12345, {
  date_from: '2024-01-01',
  date_to: '2024-01-31'
});

// Total de visitas
const totalVisits = await sdk.visits.getTotalVisits({
  item_ids: ['MLB123456', 'MLB789']
});

// Resumo
const summary = await sdk.visits.getVisitsSummary({
  seller_id: 12345,
  date_from: '2024-01-01',
  date_to: '2024-01-31'
});

// Por data
const byDate = await sdk.visits.getVisitsByDate({
  seller_id: 12345,
  date_from: '2024-01-01',
  date_to: '2024-01-31'
});

// Por dispositivo
const byDevice = await sdk.visits.getVisitsByDevice({
  seller_id: 12345
});

// Por localização
const byLocation = await sdk.visits.getVisitsByLocation({
  seller_id: 12345
});

// Por referência
const byReferrer = await sdk.visits.getVisitsByReferrer({
  seller_id: 12345
});
```

### 21. Reputação (Reputation)

Avaliação de vendedores.

```javascript
// Reputação de um usuário
const userRep = await sdk.reputation.getUserReputation(12345);

// Reputação de um pedido
const orderRep = await sdk.reputation.getOrderReputation(1234567890);

// Histórico de reputação
const history = await sdk.reputation.getReputationHistory(12345, {
  date_from: '2024-01-01',
  date_to: '2024-01-31'
});

// Nível de reputação
const level = await sdk.reputation.getReputationLevel(12345);

// Vendas
const sales = await sdk.reputation.getReputationSales(12345);

// Reclamações
const claims = await sdk.reputation.getReputationClaims(12345);

// Cancelamentos
const cancellations = await sdk.reputation.getReputationCancellations(12345);

// Tempo de manuseio
const handlingTime = await sdk.reputation.getReputationDelayedHandlingTime(12345);
```

### 22. Tendências (Trends)

Produtos em alta.

```javascript
// Tendências gerais
const trends = await sdk.trends.getTrends({
  site_id: 'MLB'
});

// Tendência específica
const trend = await sdk.trends.getTrend('12345');

// Por categoria
const categoryTrends = await sdk.trends.getCategoryTrends('MLB1051', {
  limit: 10
});

// Buscas em tendência
const searchTrends = await sdk.trends.getSearchTrends({
  site_id: 'MLB'
});

// Mais vendidos
const bestSellers = await sdk.trends.getBestSellers({
  category_id: 'MLB1051'
});

// Por categoria
const categoryBestSellers = await sdk.trends.getCategoryBestSellers('MLB1051');
```

### 23. Insights

Análises e sugestões.

```javascript
// Insights de um item
const itemInsights = await sdk.insights.getItemInsights('MLB123456');

// Insights de um usuário
const userInsights = await sdk.insights.getUserInsights(12345);

// Por categoria
const categoryInsights = await sdk.insights.getCategoryInsights('MLB1051');

// Buscas
const searchInsights = await sdk.insights.getSearchInsights({
  keyword: 'iphone'
});

// Sugestões de preço
const priceSuggestions = await sdk.insights.getPriceSuggestions({
  category_id: 'MLB1051',
  price: 1000
});

// Qualidade de listagem
const quality = await sdk.insights.getListingQuality({
  item_ids: ['MLB123456']
});
```

### 24. Anúncios (Ads)

Campanhas publicitárias.

```javascript
// Anúncios
const ads = await sdk.ads.getAds({
  campaign_id: 12345
});
const ad = await sdk.ads.getAd(12345);
await sdk.ads.createAd({
  campaign_id: 12345,
  ad_id: 'MLB123456',
  type: 'product'
});
await sdk.ads.updateAd(12345, {
  status: 'paused'
});
await sdk.ads.deleteAd(12345);

// Campanhas
const adCampaigns = await sdk.ads.getAdCampaigns({
  user_id: 12345,
  status: 'active'
});
const newCampaign = await sdk.ads.createAdCampaign({
  name: 'Campanha Teste',
  type: 'cost_per_click',
  budget: 1000
});
await sdk.ads.updateAdCampaign(12345, {
  budget: 2000
});
await sdk.ads.pauseAdCampaign(12345);
await sdk.ads.resumeAdCampaign(12345);

// Orçamento
const budget = await sdk.ads.getAdCampaignBudget(12345);
await sdk.ads.updateAdCampaignBudget(12345, {
  budget: 1500,
  budget_type: 'daily'
});

// Métricas
const metrics = await sdk.ads.getAdMetrics(12345, {
  date_from: '2024-01-01',
  date_to: '2024-01-31'
});

// Palavras-chave
const keywords = await sdk.ads.getAdKeywords(12345);
await sdk.ads.createAdKeyword(12345, {
  keyword: 'iphone',
  bid: 0.50
});
await sdk.ads.updateAdKeyword(12345, 'keyword123', {
  bid: 0.75
});
await sdk.ads.deleteAdKeyword(12345, 'keyword123');
```

### 25. Lojas Oficiais (Official Stores)

Gestão de lojas oficiais.

```javascript
// Lojas oficiais
const officialStores = await sdk.officialStores.listOfficialStores({
  limit: 20
});
const store = await sdk.officialStores.getOfficialStore(12345);

// Buscar por nome
const search = await sdk.officialStores.getOfficialStoreSearch('Magazine Luiza');

// Por nickname
const byNickname = await sdk.officialStores.getOfficialStoreByNickname('magazineluiza');

// PLP da loja
const plp = await sdk.officialStores.getOfficialStorePLP(12345, {
  category_id: 'MLB1051'
});
```

### 26. Produtos (Products)

Catálogo de produtos.

```javascript
// Produtos
const products = await sdk.products.getProducts({
  seller_id: 12345,
  limit: 20
});
const product = await sdk.products.getProduct('MLB123456');
const search = await sdk.products.searchProducts({
  q: 'smartphone'
});

// Especificações
const specs = await sdk.products.getProductSpecifications('MLB123456');

// Variações
const productVariations = await sdk.products.getProductVariations('MLB123456');

// Recomendações
const recommendations = await sdk.products.getProductRecommendations('MLB123456');

// Configurações de catálogo
const catalogConfigs = await sdk.products.getProductCatalogConfigurations('MLB123456');
await sdk.products.updateProductCatalogConfigurations('MLB123456', {
  listing_allowed: true
});

// Grupos de produtos
const group = await sdk.products.getProductGroup('group123');
const groups = await sdk.products.getProductGroups({
  seller_id: 12345
});
```

### 27. Imagens (Images)

Gestão de imagens.

```javascript
// Upload de imagem
const image = await sdk.images.uploadImage({
  source: 'https://exemplo.com/foto.jpg'
});

// Obter imagem
const img = await sdk.images.getImage('MLB123456');

// Deletar imagem
await sdk.images.deleteImage('MLB123456');

// Validar imagem
const validation = await sdk.images.validateImage({
  source: 'https://exemplo.com/foto.jpg'
});

// Tipos de imagem
const types = await sdk.images.getImageTypes();

// Sugestões para item
const suggestions = await sdk.images.getImageSuggestions('MLB123456');
```

### 28. Preços (Prices)

Gestão de preços.

```javascript
// Sugestões de preço
const suggestions = await sdk.prices.getPriceSuggestions({
  category_id: 'MLB1051',
  product_id: 'MLB123456'
});

// Histórico de preços
const history = await sdk.prices.getPriceHistory('MLB123456');

// Preços por quantidade
const quantityPrices = await sdk.prices.getPricesByQuantity({
  item_id: 'MLB123456',
  quantity: 10
});

// Preços de concorrentes
const competitors = await sdk.prices.getCompetitorPrices({
  item_id: 'MLB123456'
});

// Regras de preço
const rules = await sdk.prices.getPriceRules();
const rule = await sdk.prices.getPriceRule(12345);

// Preços de envio
const shippingPrices = await sdk.prices.getShippingPrices({
  zip_code_from: '01310930',
  zip_code_to: '04534000'
});
```

### 29. Automações (Automations)

Automações de preço e estoque.

```javascript
// Automações
const automations = await sdk.automations.getAutomations({
  seller_id: 12345
});
const automation = await sdk.automations.getAutomation(12345);
const newAutomation = await sdk.automations.createAutomation({
  name: 'AUTO-PRECOS',
  type: 'price',
  conditions: [{
    type: 'sales',
    min_sales: 10
  }],
  actions: [{
    type: 'increase_price',
    percentage: 5
  }]
});
await sdk.automations.updateAutomation(12345, {
  name: 'Atualizado'
});
await sdk.automations.deleteAutomation(12345);

// Execuções
const executions = await sdk.automations.getAutomationExecutions(12345, {
  date_from: '2024-01-01',
  date_to: '2024-01-31'
});

// Pausar/retomar
await sdk.automations.pauseAutomation(12345);
await sdk.automations.resumeAutomation(12345);
```

### 30. Saúde de Dados (Data Health)

Qualidade de dados.

```javascript
// Saúde de dados
const health = await sdk.dataHealth.getDataHealth({
  seller_id: 12345
});

// Por categoria
const categoryHealth = await sdk.dataHealth.getDataHealthByCategory('MLB1051');

// Por usuário
const userHealth = await sdk.dataHealth.getDataHealthByUser(12345);

// Dashboard
const dashboard = await sdk.dataHealth.getDataHealthDashboard();

// Compliance de atributos
const compliance = await sdk.dataHealth.getAttributeCompliance('MLB1051');
```

### 31. Dimensões (Dimensions)

Tabelas de medidas.

```javascript
// Dimensões
const dimensions = await sdk.dimensions.getDimensions({
  seller_id: 12345
});
const dimension = await sdk.dimensions.getDimension(12345);
const newDimension = await sdk.dimensions.createDimension({
  name: 'Camiseta',
  attributes: [{
    id: 'size',
    values: ['P', 'M', 'G', 'GG']
  }]
});
await sdk.dimensions.updateDimension(12345, {
  name: 'Camiseta Atualizada'
});
await sdk.dimensions.deleteDimension(12345);

// Tabelas de medidas
const sizeCharts = await sdk.dimensions.getSizeCharts({
  seller_id: 12345
});
const sizeChart = await sdk.dimensions.getSizeChart(12345);
const newSizeChart = await sdk.dimensions.createSizeChart({
  name: 'Tabela de Camisetas',
  attributes: [{
    id: 'BRAND',
    values: ['P', 'M', 'G', 'GG']
  }]
});
await sdk.dimensions.updateSizeChart(12345, {
  name: 'Atualizada'
});
await sdk.dimensions.deleteSizeChart(12345);

// Validar
const validation = await sdk.dimensions.validateSizeChart({
  name: 'Tabela Teste',
  attributes: []
});
```

### 32. User Products

Produtos do usuário no catálogo.

```javascript
// Produtos do usuário
const userProducts = await sdk.userProducts.getUserProducts(12345, {
  status: 'active',
  limit: 20
});
const userProduct = await sdk.userProducts.getUserProduct(12345, 'produto123');
const newUserProduct = await sdk.userProducts.createUserProduct(12345, {
  seller_custom_field: 'SKU123',
  variations: [{
    id: 'var123',
    price: 100
  }]
});
await sdk.userProducts.updateUserProduct(12345, 'produto123', {
  price: 120
});
await sdk.userProducts.deleteUserProduct(12345, 'produto123');

// Catálogo
const catalog = await sdk.userProducts.getUserProductCatalog(12345, 'produto123');
await sdk.userProducts.updateUserProductCatalog(12345, 'produto123', {
  listing_allowed: true
});
```

### 33. Kits Virtuais

Kits de produtos.

```javascript
// Kits
const kits = await sdk.kits.getKits({
  seller_id: 12345
});
const kit = await sdk.kits.getKit(12345);
const newKit = await sdk.kits.createKit({
  name: 'Kit Casa',
  items: [{
    id: 'MLB123456',
    quantity: 2
  }]
});
await sdk.kits.updateKit(12345, {
  name: 'Kit Casa Completa'
});
await sdk.kits.deleteKit(12345);

// Itens do kit
const kitItems = await sdk.kits.getKitItems(12345);
await sdk.kits.addKitItem(12345, {
  id: 'MLB789',
  quantity: 1
});
await sdk.kits.removeKitItem(12345, 'MLB123456');
```

### 34. Packs

Agrupamento de produtos.

```javascript
// Packs
const packs = await sdk.packs.getPacks({
  seller_id: 12345
});
const pack = await sdk.packs.getPack(12345);
const newPack = await sdk.packs.createPack({
  name: 'Pack 3x',
  items: [{
    id: 'MLB123456',
    quantity: 3
  }]
});
await sdk.packs.updatePack(12345, {
  name: 'Pack 5x'
});
await sdk.packs.deletePack(12345);

// Itens do pack
const packItems = await sdk.packs.getPackItems(12345);
await sdk.packs.addPackItem(12345, {
  id: 'MLB789',
  quantity: 2
});
await sdk.packs.removePackItem(12345, 'MLB789');
```

### 35. Variações (Variations)

Variações de produtos.

```javascript
// Variações de um item
const variations = await sdk.variations.getVariations('MLB123456');
const variation = await sdk.variations.getVariation('MLB123456', 12345);
const newVariation = await sdk.variations.createVariation('MLB123456', {
  attribute_combinations: [{
    id: 'COLOR',
    value_name: 'Vermelho'
  }],
  price: 100,
  available_quantity: 10,
  picture_ids: ['MLB123']
});
await sdk.variations.updateVariation('MLB123456', 12345, {
  price: 120
});
await sdk.variations.deleteVariation('MLB123456', 12345);

// Fotos da variação
const picture = await sdk.variations.getVariationPicture('MLB123456', 12345, 'MLB123');
await sdk.variations.addVariationPicture('MLB123456', 12345, {
  source: 'https://exemplo.com/foto.jpg'
});
await sdk.variations.removeVariationPicture('MLB123456', 12345, 'MLB123');
```

### 36. Notificações (Notifications)

Webhooks e notificações.

```javascript
// Notificações
const notifications = await sdk.notifications.getNotifications({
  topic: 'orders',
  limit: 20
});
const notification = await sdk.notifications.getNotification(12345);
await sdk.notifications.markNotificationAsRead(12345);

// Tipos de notificação
const types = await sdk.notifications.getNotificationTypes();

// Webhooks
const webhooks = await sdk.webhooks.getWebhooks({
  user_id: 12345
});
const webhook = await sdk.webhooks.getWebhook(12345);
const newWebhook = await sdk.webhooks.createWebhook({
  url: 'https://site.com/webhook',
  events: ['orders']
});
await sdk.webhooks.updateWebhook(12345, {
  url: 'https://site.com/webhook2'
});
await sdk.webhooks.deleteWebhook(12345);

// Contagem
const count = await sdk.notifications.getNotificationsCount();
```

### 37. Busca (Search)

Busca avançada.

```javascript
// Busca
const results = await sdk.search.search({
  q: 'iphone',
  site_id: 'MLB',
  limit: 20
});

// Sites disponíveis
const sites = await sdk.search.getSearchSites();

// Filtros
const filters = await sdk.search.getSearchFilters('MLB');

// Ordenações
const sorts = await sdk.search.getSearchSorts('MLB');

// Filtros disponíveis
const availableFilters = await sdk.search.getSearchAvailableFilters('MLB');
const availableSorts = await sdk.search.getSearchAvailableSorts('MLB');

// Sugestões
const suggestions = await sdk.search.getSearchSuggestions('ipho');

// Histórico de buscas
const history = await sdk.search.getSearchHistory(12345);
await sdk.search.clearSearchHistory(12345);
```

### 38. Concorrência (Competition)

Análise de concorrência.

```javascript
// Concorrência
const competition = await sdk.competition.getCompetition({
  category_id: 'MLB1051'
});

// Por item
const itemCompetition = await sdk.competition.getItemCompetition('MLB123456');

// Por categoria
const categoryCompetition = await sdk.competition.getCategoryCompetition('MLB1051');

// Análise
const analysis = await sdk.competition.getCompetitorAnalysis({
  item_id: 'MLB123456'
});

// Ranking
const ranking = await sdk.competition.getCompetitorRanking({
  category_id: 'MLB1051'
});
```

### 39. Ofertas (Offers)

Gestão de ofertas.

```javascript
// Ofertas
const offers = await sdk.offers.getOffers({
  seller_id: 12345
});
const offer = await sdk.offers.getOffer(12345);
const newOffer = await sdk.offers.createOffer({
  item_id: 'MLB123456',
  price: 95
});
await sdk.offers.updateOffer(12345, {
  price: 90
});
await sdk.offers.deleteOffer(12345);

// Aceitar/rejeitar
await sdk.offers.acceptOffer(12345);
await sdk.offers.rejectOffer(12345, 'price_too_low');
await sdk.offers.counterOffer(12345, {
  price: 92
});

// Ofertas de um item
const itemOffers = await sdk.offers.getItemOffers('MLB123456');

// Minhas ofertas
const myOffers = await sdk.offers.getUserOffers(12345, {
  status: 'pending'
});
```

### 40. Ofertas Especiais (Deals)

Deals e ofertas especiais.

```javascript
// Deals
const deals = await sdk.deals.getDeals({
  status: 'active'
});
const deal = await sdk.deals.getDeal(12345);
const newDeal = await sdk.deals.createDeal({
  name: 'Deal de Inverno',
  discount_percentage: 20
});
await sdk.deals.updateDeal(12345, {
  discount_percentage: 25
});
await sdk.deals.deleteDeal(12345);

// Deal of Day
const dod = await sdk.deals.getDealOfDay({
  site_id: 'MLB'
});

// Lightning Deals
const lightning = await sdk.deals.getLightningDeals({
  site_id: 'MLB'
});

// Deals de uma campanha
const campaignDeals = await sdk.deals.getCampaignDeals(12345);

// Deals do usuário
const userDeals = await sdk.deals.getUserDeals(12345);
```

### 41. Serviços (Services)

Gestão de serviços.

```javascript
// Serviços
const services = await sdk.services.getServices({
  seller_id: 12345
});
const service = await sdk.services.getService(12345);
const newService = await sdk.services.createService({
  name: 'Instalação',
  description: 'Instalação profissional'
});
await sdk.services.updateService(12345, {
  name: 'Instalação Premium'
});
await sdk.services.deleteService(12345);

// Áreas de cobertura
const areas = await sdk.services.getServiceAreas(12345);
await sdk.services.createServiceArea(12345, {
  zip_code_prefix: '01',
  state: 'SP'
});
await sdk.services.updateServiceArea(12345, 67890, {
  active: false
});
await sdk.services.deleteServiceArea(12345, 67890);

// Agendamentos
const bookings = await sdk.services.getServiceBookings(12345, {
  status: 'pending'
});
await sdk.services.createServiceBooking(12345, {
  date: '2024-02-01T10:00:00.000-03:00',
  customer_id: 67890
});
await sdk.services.cancelServiceBooking(12345, 12345);
```

### 42. Imóveis (Real Estate)

Gestão de anúncios imobiliários.

```javascript
// Anúncios
const listings = await sdk.realEstate.getRealEstateListings({
  seller_id: 12345
});
const listing = await sdk.realEstate.getRealEstateListing(12345);
const newListing = await sdk.realEstate.createRealEstateListing({
  title: 'Apartamento 2 quartos',
  property_type: 'apartment',
  operation_type: 'sale',
  location: {
    address: 'Rua Augusta, 100',
    city: 'São Paulo'
  },
  prices: {
    price: 500000
  },
  attributes: [{
    id: 'ROOMS',
    value_name: '2'
  }]
});
await sdk.realEstate.updateRealEstateListing(12345, {
  price: 480000
});
await sdk.realEstate.deleteRealEstateListing(12345);

// Projetos
const projects = await sdk.realEstate.getRealEstateProjects({
  seller_id: 12345
});
const project = await sdk.realEstate.getRealEstateProject(12345);
const newProject = await sdk.realEstate.createRealEstateProject({
  name: 'Edifício ABC',
  description: 'Novo empreendimento'
});
await sdk.realEstate.updateRealEstateProject(12345, {
  status: 'active'
});

// Leads
const leads = await sdk.realEstate.getRealEstateLeads({
  listing_id: 12345
});
const lead = await sdk.realEstate.getRealEstateLead(12345);
const newLead = await sdk.realEstate.createRealEstateLead({
  listing_id: 12345,
  name: 'João Silva',
  email: 'joao@email.com',
  phone: '11999999999'
});
await sdk.realEstate.updateRealEstateLead(12345, {
  status: 'contacted'
});

// Visitas
const visits = await sdk.realEstate.getRealEstateVisits({
  listing_id: 12345
});
await sdk.realEstate.scheduleRealEstateVisit({
  listing_id: 12345,
  date: '2024-02-01T10:00:00.000-03:00',
  customer_name: 'Maria'
});
await sdk.realEstate.cancelRealEstateVisit(12345);

// Estatísticas
const stats = await sdk.realEstate.getRealEstateStats({
  listing_id: 12345
});
```

### 43. Autos

Gestão de veículos.

```javascript
// Anúncios de autos
const autosListings = await sdk.autos.getAutosListings({
  seller_id: 12345
});
const autosListing = await sdk.autos.getAutosListing(12345);
const newAutosListing = await sdk.autos.createAutosListing({
  title: 'Honda Civic 2020',
  condition: 'used',
  price: 75000,
  year: 2020,
  make_id: 'Honda',
  model_id: 'Civic',
  bodywork: 'sedan',
  fuel: 'gasoline',
  transmission: 'automatic'
});
await sdk.autos.updateAutosListing(12345, {
  price: 72000
});
await sdk.autos.deleteAutosListing(12345);

// Marcas
const makes = await sdk.autos.getAutosMakes();
const make = await sdk.autos.getAutosMake('Honda');

// Modelos
const models = await sdk.autos.getAutosModels('Honda');
const model = await sdk.autos.getAutosModel('Civic');

// Anos
const years = await sdk.autos.getAutosYears();
const year = await sdk.autos.getAutosYear('2020');

// Versões
const versions = await sdk.autos.getAutosVersions('2020');

// Tipos
const energies = await sdk.autos.getAutosEnergies();
const transmissions = await sdk.autos.getAutosTransmissions();
const conditions = await sdk.autos.getAutosConditions();
const colors = await sdk.autos.getAutosColors();
const interiors = await sdk.autos.getAutosInteriors();
const doors = await sdk.autos.getAutosDoors();
const drives = await sdk.autos.getAutosDrives();

// Solicitações de contato
const contactRequests = await sdk.autos.getAutosContactRequests({
  listing_id: 12345
});
await sdk.autos.createAutosContactRequest({
  listing_id: 'MLB123456',
  name: 'Cliente',
  email: 'cliente@email.com',
  phone: '11999999999',
  message: 'Tenho interesse'
});

// Leads
const autosLeads = await sdk.autos.getAutosLeads({
  seller_id: 12345
});
const autosLead = await sdk.autos.getAutosLead(12345);
await sdk.autos.createAutosLead({
  listing_id: 'MLB123456',
  name: 'Novo lead',
  email: 'lead@email.com'
});
```

### 44. Global Selling

Venda internacional.

```javascript
// Itens globais
const globalItems = await sdk.globalSelling.getGlobalItems({
  seller_id: 12345
});
const globalItem = await sdk.globalSelling.getGlobalItem('MLB123456');

// Sincronizar item local para global
await sdk.globalSelling.syncGlobalItem('MLB123456');

// Elegibilidade para catálogo
const eligibility = await sdk.globalSelling.getGlobalCatalogEligibility('MLB123456');

// Catálogo global
const products = await sdk.globalSelling.getGlobalCatalogProducts({
  site_id: 'MLM'
});
const product = await sdk.globalSelling.getGlobalCatalogProduct('MLM123456');

// Publicar no global
await sdk.globalSelling.publishToGlobal({
  local_item_id: 'MLB123456',
  site_id: 'MLM'
});

// Despublicar
await sdk.globalSelling.unpublishFromGlobal('MLM123456');

// Pedidos globais
const globalOrders = await sdk.globalSelling.searchGlobalOrders({
  seller_id: 12345
});
const globalOrder = await sdk.globalSelling.getGlobalOrder('global123');

// Enviar pedido global
await sdk.globalSelling.shipGlobalOrder('global123', {
  tracking_number: 'ABC123',
  carrier: 'FEDEX'
});

// Envios globais
const globalShipments = await sdk.globalSelling.getGlobalShipment('ship123');
const tracking = await sdk.globalSelling.getGlobalShipmentTracking('ship123');

// Reclamações globais
const globalClaims = await sdk.globalSelling.getGlobalClaims({
  seller_id: 12345
});
const globalClaim = await sdk.globalSelling.getGlobalClaim(12345);
await sdk.globalSelling.respondToGlobalClaim(12345, {
  message: 'Já estamos solucionando'
});

// Devoluções globais
const returns = await sdk.globalSelling.getGlobalReturns({
  seller_id: 12345
});
const returnData = await sdk.globalSelling.getGlobalReturn(12345);
await sdk.globalSelling.processGlobalReturn(12345, {
  action: 'approve'
});

// Mensagens globais
const globalMessages = await sdk.globalSelling.getGlobalMessages({
  order_id: 'global123'
});
await sdk.globalSelling.sendGlobalMessage({
  order_id: 'global123',
  message: 'Seu pedido foi enviado!'
});

// Configurações globais
const settings = await sdk.globalSelling.getGlobalSettings(12345);
await sdk.globalSelling.updateGlobalSettings(12345, {
  automatic_sync: true
});

// Modos de envio global
const globalModes = await sdk.globalSelling.getGlobalShippingModes('MLM');

// Taxas de envio global
const globalRates = await sdk.globalSelling.getGlobalShippingRates({
  from_country: 'BR',
  to_country: 'MX'
});

// Promoções globais
const promotions = await sdk.globalSelling.getGlobalPromotions({
  site_id: 'MLM'
});
const newPromotion = await sdk.globalSelling.createGlobalPromotion({
  name: 'Promo Global',
  discount: 10
});

// Deals globais
const deals = await sdk.globalSelling.getGlobalDeals({
  site_id: 'MLM'
});
const newDeal = await sdk.globalSelling.createGlobalDeal({
  name: 'Deal Global',
  discount_percentage: 15
});

// Faturamento global
const billing = await sdk.globalSelling.getGlobalBilling({
  seller_id: 12345
});
const billingInfo = await sdk.globalSelling.getGlobalBillingInfo('bill123');

// Tabelas de medidas globais
const sizeCharts = await sdk.globalSelling.getGlobalSizeCharts({
  seller_id: 12345
});
const sizeChart = await sdk.globalSelling.getGlobalSizeChart(12345);
const newSizeChart = await sdk.globalSelling.createGlobalSizeChart({
  name: 'Tabela Global',
  attributes: []
});
await sdk.globalSelling.updateGlobalSizeChart(12345, {
  name: 'Atualizada'
});
await sdk.globalSelling.deleteGlobalSizeChart(12345);
const validation = await sdk.globalSelling.validateGlobalSizeChart({
  name: 'Tabela Teste',
  attributes: []
});
```

---

## Recursos do Mercado Pago

### 1. Métodos de Pagamento

```javascript
// Métodos disponíveis
const methods = await sdk.mpPaymentMethods.getPaymentMethods();

// Método específico
const method = await sdk.mpPaymentMethods.getPaymentMethod('visa');

// Por tipo
const byType = await sdk.mpPaymentMethods.getPaymentMethodsByType('credit_card');

// Por BIN
const byBin = await sdk.mpPaymentMethods.getPaymentMethodsByBin('450799', {
  amount: 1000
});

// Parcelas
const installments = await sdk.mpPaymentMethods.getInstallments('450799', 1000);

// Tipos de identificação
const identifications = await sdk.mpPaymentMethods.getIdentificationTypes();
```

### 2. Pagamentos

```javascript
// Criar pagamento
const payment = await sdk.mpPayments.createPayment({
  transaction_amount: 100,
  token: 'card_token',
  description: 'Purchase',
  installments: 1,
  payment_method_id: 'visa',
  payer: {
    email: 'payer@email.com',
    identification: {
      type: 'CPF',
      number: '12345678900'
    }
  }
});

// Obter pagamento
const payment = await sdk.mpPayments.getPayment(12345);

// Buscar pagamentos
const payments = await sdk.mpPayments.searchPayments({
  status: 'approved',
  limit: 20
});

// Atualizar pagamento
await sdk.mpPayments.updatePayment(12345, {
  status: 'approved'
});

// Capturar
await sdk.mpPayments.capturePayment(12345, {
  transaction_amount: 100
});

// Cancelar
await sdk.mpPayments.cancelPayment(12345);

// Reembolso
const refund = await sdk.mpPayments.refundPayment(12345, {
  amount: 50
});

// Reembolsos de um pagamento
const refunds = await sdk.mpPayments.getPaymentRefunds(12345);

// Operações
const operations = await sdk.mpPayments.getPaymentOperations(12345);

// Taxas
const fees = await sdk.mpPayments.getPaymentFees(12345);

// Impostos
const taxes = await sdk.mpPayments.getPaymentTaxes(12345);
```

### 3. Intents de Pagamento

```javascript
// Criar intent
const intent = await sdk.mpPaymentIntents.createPaymentIntent({
  transaction_amount: 100,
  payment_method_id: 'visa',
  payer: {
    email: 'payer@email.com'
  }
});

// Obter intent
const intent = await sdk.mpPaymentIntents.getPaymentIntent('intent123');

// Atualizar intent
await sdk.mpPaymentIntents.updatePaymentIntent('intent123', {
  transaction_amount: 120
});

// Capturar
await sdk.mpPaymentIntents.capturePaymentIntent('intent123', {
  transaction_amount: 100
});

// Cancelar
await sdk.mpPaymentIntents.cancelPaymentIntent('intent123');
```

### 4. Pedidos

```javascript
// Criar pedido
const order = await sdk.mpOrders.createOrder({
  items: [{
    sku_number: '123',
    title: 'Product',
    unit_price: 100,
    quantity: 1
  }],
  payer: {
    email: 'payer@email.com'
  }
});

// Obter pedido
const order = await sdk.mpOrders.getOrder(12345);

// Buscar pedidos
const orders = await sdk.mpOrders.searchOrders({
  status: 'opened',
  limit: 20
});

// Atualizar pedido
await sdk.mpOrders.updateOrder(12345, {
  status: 'fulfilled'
});

// Deletar pedido
await sdk.mpOrders.deleteOrder(12345);

// Pagamentos do pedido
const payments = await sdk.mpOrders.getOrderPayments(12345);

// Transações
await sdk.mpOrders.addTransaction(12345, {
  amount: 100
});
await sdk.mpOrders.updateTransaction(12345, 'trans123', {
  amount: 120
});
await sdk.mpOrders.removeTransaction(12345, 'trans123');

// Processar ordem
await sdk.mpOrders.processOrder({
  items: []
});
```

### 5. Preferências

```javascript
// Criar preferência
const pref = await sdk.mpPreferences.createPreference({
  items: [{
    id: '123',
    title: 'Product',
    quantity: 1,
    unit_price: 100
  }],
  payer: {
    email: 'payer@email.com'
  }
});

// Obter preferência
const pref = await sdk.mpPreferences.getPreference('pref123');

// Atualizar preferência
await sdk.mpPreferences.updatePreference('pref123', {
  items: [{
    id: '123',
    title: 'Updated',
    unit_price: 120
  }]
});

// Buscar preferências
const prefs = await sdk.mpPreferences.searchPreferences({
  status: 'active'
});

// Deletar preferência
await sdk.mpPreferences.deletePreference('pref123');
```

### 6. Clientes

```javascript
// Criar cliente
const customer = await sdk.mpCustomers.createCustomer({
  email: 'customer@email.com',
  first_name: 'João',
  last_name: 'Silva'
});

// Obter cliente
const customer = await sdk.mpCustomers.getCustomer('12345');

// Atualizar cliente
await sdk.mpCustomers.updateCustomer('12345', {
  first_name: 'José'
});

// Deletar cliente
await sdk.mpCustomers.deleteCustomer('12345');

// Buscar clientes
const customers = await sdk.mpCustomers.searchCustomers({
  email: 'customer@email.com'
});

// Listar clientes
const list = await sdk.mpCustomers.listCustomers({
  limit: 20
});
```

### 7. Cartões

```javascript
// Criar cartão
const card = await sdk.mpCards.createCard('customer123', {
  token: 'card_token'
});

// Obter cartão
const card = await sdk.mpCards.getCard('customer123', 'card123');

// Atualizar cartão
await sdk.mpCards.updateCard('customer123', 'card123', {
  expiration_month: 12
});

// Deletar cartão
await sdk.mpCards.deleteCard('customer123', 'card123');

// Listar cartões
const cards = await sdk.mpCards.listCards('customer123');
```

### 8. Disputas

```javascript
// Disputas
const disputes = await sdk.mpDisputes.getDisputes({
  status: 'opened'
});
const dispute = await sdk.mpDisputes.getDispute('12345');
await sdk.mpDisputes.acceptDispute('12345');

// Evidências
const evidence = await sdk.mpDisputes.getDisputeEvidence('12345');
await sdk.mpDisputes.createDisputeEvidence('12345', {
  type: 'fulfillment_proof',
  file: 'proof.pdf'
});
await sdk.mpDisputes.updateDisputeEvidence('12345', 'evidence123', {
  status: 'valid'
});
```

### 9. Chargebacks

```javascript
// Chargebacks
const chargebacks = await sdk.mpChargebacks.getChargebacks({
  status: 'pending'
});
const chargeback = await sdk.mpChargebacks.getChargeback('12345');
await sdk.mpChargebacks.acceptChargeback('12345');

// Evidências
const evidence = await sdk.mpChargebacks.getChargebackEvidence('12345');
await sdk.mpChargebacks.createChargebackEvidence('12345', {
  type: 'fulfillment_proof'
});

// Reembolso
const refund = await sdk.mpChargebacks.getChargebackRefund('12345');
await sdk.mpChargebacks.createChargebackRefund('12345', {
  amount: 50
});
```

### 10. Reclamações

```javascript
// Reclamações
const claims = await sdk.mpClaims.getClaims({
  status: 'in_process'
});
const claim = await sdk.mpClaims.getClaim('12345');
const details = await sdk.mpClaims.getClaimDetails('12345');
const history = await sdk.mpClaims.getClaimHistory('12345');
const evidence = await sdk.mpClaims.getClaimEvidence('12345');
const reason = await sdk.mpClaims.getClaimReason('12345');
const notifications = await sdk.mpClaims.getClaimNotifications('12345');

// Mensagens
const messages = await sdk.mpClaims.getClaimMessages('12345');
await sdk.mpClaims.sendClaimMessage('12345', {
  message: 'Solving the issue'
});

// Arquivos
await sdk.mpClaims.attachClaimFile('12345', {
  file: 'evidence.pdf'
});
await sdk.mpClaims.downloadClaimFile('12345', 'file123');

// Mediação
await sdk.mpClaims.requestMediation('12345');
const resolutions = await sdk.mpClaims.getExpectedResolutions('12345');

// Evidência de envio
await sdk.mpClaims.uploadShippingEvidence('12345', {
  type: 'proof_delivery'
});

// Buscar
const search = await sdk.mpClaims.searchClaims({
  site_id: 'MLB'
});
```

### 11. Lojas

```javascript
// Criar loja
const store = await sdk.mpStore.createStore('user123', {
  name: 'Minha Loja',
  location: {
    address: 'Rua Augusta',
    city: 'São Paulo'
  }
});

// Obter loja
const store = await sdk.mpStore.getStore('store123');
await sdk.mpStore.updateStore('store123', {
  name: 'Loja Atualizada'
});
await sdk.mpStore.deleteStore('store123');

// Buscar lojas
const stores = await sdk.mpStore.searchStores('user123', {
  limit: 20
});

// Localizações
const locations = await sdk.mpStore.getStoreLocations('store123');
await sdk.mpStore.createStoreLocation('store123', {
  type: 'physical',
  address: 'Nova Rua'
});

// Categorias
const categories = await sdk.mpStore.getStoreCategories('store123');
```

### 12. POS

```javascript
// Criar POS
const pos = await sdk.mpPOS.createPOS({
  name: 'PDV Principal',
  store_id: 'store123'
});

// Obter POS
const pos = await sdk.mpPOS.getPOS('pos123');
await sdk.mpPOS.updatePOS('pos123', {
  name: 'PDV Atualizado'
});
await sdk.mpPOS.deletePOS('pos123');

// Buscar POS
const posList = await sdk.mpPOS.searchPOS({
  store_id: 'store123'
});

// POS externos
const external = await sdk.mpPOS.getPOSExternalPOS({
  external_id: 'pdv_001'
});

// Pagamentos
const payments = await sdk.mpPOS.getPOSPayments('pos123', {
  limit: 20
});

// Turnos
const shift = await sdk.mpPOS.getPOSShift('pos123', 'shift123');
await sdk.mpPOS.openPOSShift('pos123', {
  opened_at: '2024-01-15T10:00:00.000-03:00'
});
await sdk.mpPOS.closePOSShift('pos123', 'shift123', {
  closed_at: '2024-01-15T18:00:00.000-03:00'
});
```

### 13. Point

```javascript
// Devices
const devices = await sdk.mpPoint.getPointDevices({
  store_id: 'store123'
});
await sdk.mpPoint.updatePointDeviceMode('device123', {
  mode: 'PDV'
});

// Payment Intents
const intent = await sdk.mpPoint.createPointPaymentIntent('device123', {
  amount: 100
});
const pointIntent = await sdk.mpPoint.getPointPaymentIntent('device123', 'intent123');
await sdk.mpPoint.cancelPointPaymentIntent('device123', 'intent123');

// Reembolsos
await sdk.mpPoint.refundPointPayment('device123', {
  amount: 50,
  payment_intent_id: 'intent123'
});
const refund = await sdk.mpPoint.getPointRefund('device123', 'refund123');
await sdk.mpPoint.cancelPointRefund('device123', 'refund123');

// Integrator
const integrator = await sdk.mpPoint.getPointIntegrator('integrator123');
await sdk.mpPoint.updatePointIntegrator('integrator123', {
  name: 'Novo Integrador'
});

// Terminais
const terminals = await sdk.mpPoint.getTerminals({
  store_id: 'store123'
});
```

### 14. QR Codes

```javascript
// QR Code
const qr = await sdk.mpQRCode.createQRCode({
  external_reference: 'order123',
  amount: 100
});
const qrData = await sdk.mpQRCode.getQRCode('order123');
await sdk.mpQRCode.updateQRCode('order123', {
  amount: 120
});
await sdk.mpQRCode.closeQRCode('order123');
const payment = await sdk.mpQRCode.getQRCodePayment('order123');

// QR Code Dinâmico
const dynamic = await sdk.mpQRCode.createDynamicQRCode({
  external_reference: 'order123',
  amount: 100
});
const dynamicData = await sdk.mpQRCode.getDynamicQRCode('order123');
await sdk.mpQRCode.updateDynamicQRCode('order123', {
  amount: 120
});
```

### 15. Assinaturas

```javascript
// Pré-aprovamento
const preapproval = await sdk.mpSubscriptions.createPreapproval({
  payer_email: 'payer@email.com',
  back_url: 'https://site.com/success',
  reason: 'Subscription',
  auto_recurring: {
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: 99.90
  }
});
const data = await sdk.mpSubscriptions.getPreapproval('12345');
await sdk.mpSubscriptions.updatePreapproval('12345', {
  transaction_amount: 149.90
});
const search = await sdk.mpSubscriptions.searchPreapprovals({
  status: 'authorized'
});
const exportData = await sdk.mpSubscriptions.exportPreapprovals({
  status: 'authorized'
});

// Planos
const plan = await sdk.mpSubscriptions.createPreapprovalPlan({
  name: 'Plano Gold',
  auto_recurring: {
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: 199.90
  }
});
const planData = await sdk.mpSubscriptions.getPreapprovalPlan('plan123');
await sdk.mpSubscriptions.updatePreapprovalPlan('plan123', {
  name: 'Plano Platinum'
});
const plans = await sdk.mpSubscriptions.searchPreapprovalPlans({
  limit: 20
});

// Pagamentos autorizados
const authorized = await sdk.mpSubscriptions.getAuthorizedPayments({
  preapproval_id: '12345'
});
const auth = await sdk.mpSubscriptions.getAuthorizedPayment('auth123');
await sdk.mpSubscriptions.captureAuthorizedPayment('auth123', {
  transaction_amount: 99.90
});
await sdk.mpSubscriptions.cancelAuthorizedPayment('auth123');
```

### 16. Relatórios

```javascript
// Releases
const config = await sdk.mpReports.createReleaseConfiguration({
  name: 'Configuração',
  report_type: ' conciliations'
});
await sdk.mpReports.updateReleaseConfiguration('config123', {
  name: 'Atualizada'
});
const configs = await sdk.mpReports.getReleaseConfigurations({
  limit: 20
});

const report = await sdk.mpReports.createReleaseReport({
  configuration_id: 'config123'
});
const reportData = await sdk.mpReports.getReleaseReport('report123');
const reports = await sdk.mpReports.searchReleaseReports({
  configuration_id: 'config123'
});
await sdk.mpReports.enableReleaseAutoGeneration('config123');
await sdk.mpReports.disableReleaseAutoGeneration('config123');
await sdk.mpReports.downloadReleaseReport('report123');

// Settlements
const settlementConfig = await sdk.mpReports.createSettlementConfiguration({
  name: 'Settlement Config'
});
await sdk.mpReports.updateSettlementConfiguration('config123', {
  name: 'Updated'
});
const configs = await sdk.mpReports.getSettlementConfigurations({
  limit: 20
});

const settlement = await sdk.mpReports.createSettlementReport({
  configuration_id: 'config123'
});
const settlementData = await sdk.mpReports.getSettlementReport('report123');
const status = await sdk.mpReports.getSettlementReportStatus('report123');
const settlements = await sdk.mpReports.searchSettlementReports({
  configuration_id: 'config123'
});
await sdk.mpReports.enableSettlementAutoGeneration('config123');
await sdk.mpReports.disableSettlementAutoGeneration('config123');
await sdk.mpReports.downloadSettlementReport('report123');

// Billing
const billing = await sdk.mpReports.createBillingReport({
  site_id: 'MLB'
});
const billingData = await sdk.mpReports.getBillingReport('report123');
const billings = await sdk.mpReports.searchBillingReports({
  site_id: 'MLB'
});
await sdk.mpReports.downloadBillingReport('report123');
```

### 17. OAuth

```javascript
// Obter access token
const token = await sdk.mpOAuth.getAccessToken({
  grant_type: 'authorization_code',
  code: 'authorization_code',
  client_id: 'client_id',
  client_secret: 'client_secret',
  redirect_uri: 'redirect_uri'
});

// Refresh token
const refresh = await sdk.mpOAuth.refreshToken({
  grant_type: 'refresh_token',
  client_id: 'client_id',
  client_secret: 'client_secret',
  refresh_token: 'refresh_token'
});

// Revogar token
await sdk.mpOAuth.revokeToken({
  token: 'access_token'
});
```

### 18. Test Users

```javascript
// Criar usuário de teste
const testUser = await sdk.mpTestUsers.createTestUser({
  site_id: 'MLB'
});

// Pagamento de teste
const testPayment = await sdk.mpTestUsers.createTestPayment({
  payment_method_id: 'visa',
  transaction_amount: 100
});

// Cartão de teste
const testCard = await sdk.mpTestUsers.createTestCard({
  issuer_id: '123',
  payment_method_id: 'visa'
});
```

### 19. Saldo

```javascript
// Saldo
const balance = await sdk.mpBalance.getBalance();

// Movimentos
const movements = await sdk.mpBalance.getAccountMovement({
  limit: 20
});

// Resumo
const summary = await sdk.mpBalance.getAccountSummary({
  date_from: '2024-01-01'
});

// Saque
await sdk.mpBalance.withdrawBalance({
  amount: 1000,
  external_reference: 'withdraw123'
});
```

### 20. Webhooks

```javascript
// Webhooks
const hooks = await sdk.mpHooks.getHooks({
  limit: 20
});
const hook = await sdk.mpHooks.getHook('hook123');

const newHook = await sdk.mpHooks.createHook({
  url: 'https://site.com/webhook',
  events: ['payment.created']
});
await sdk.mpHooks.updateHook('hook123', {
  url: 'https://site.com/webhook2'
});
await sdk.mpHooks.deleteHook('hook123');

// Eventos
const events = await sdk.mpHooks.getHookEvents();

// Entregas
const delivery = await sdk.mpHooks.getHookDelivery('hook123', 'delivery123');
await sdk.mpHooks.retryHookDelivery('hook123', 'delivery123');
```

---

## Autenticação

### OAuth 2.0 do Mercado Livre

```javascript
// Fluxo OAuth
const authUrl = `https://auth.mercadolibre.com.br/authorization?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}`;

// Trocar código por token
const token = await fetch('https://api.mercadolibre.com/oauth/token', {
  method: 'POST',
  body: JSON.stringify({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_ID,
    code: AUTHORIZATION_CODE,
    redirect_uri: REDIRECT_URI
  })
});

// Refresh token
await sdk.setMLRefreshToken(refreshToken);
await sdk.setMLAccessToken(newAccessToken);
```

### OAuth do Mercado Pago

```javascript
const token = await sdk.mpOAuth.getAccessToken({
  grant_type: 'authorization_code',
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  code: AUTHORIZATION_CODE,
  redirect_uri: REDIRECT_URI
});

sdk.setMPAccessToken(token.access_token);
```

---

## Tratamento de Erros

```javascript
try {
  const item = await sdk.items.getItem('MLB123456');
} catch (error) {
  if (error.status === 404) {
    console.log('Item não encontrado');
  } else if (error.status === 401) {
    console.log('Token expirado, faça refresh');
  } else if (error.status === 403) {
    console.log('Acesso negado');
  } else {
    console.log('Erro:', error.message);
  }
}
```

---

## Exemplos Práticos

### Criar Checkout Completo

```javascript
async function createCheckout(itemData) {
  // Criar preferência
  const pref = await sdk.preferences.createCheckoutPreference({
    items: [{
      id: itemData.id,
      title: itemData.title,
      quantity: itemData.quantity,
      unit_price: itemData.price
    }],
    payer: {
      name: 'Comprador',
      email: 'comprador@email.com'
    },
    back_urls: {
      success: 'https://site.com/success',
      failure: 'https://site.com/failure',
      pending: 'https://site.com/pending'
    }
  });

  return pref;
}
```

### Gerenciar Pedido

```javascript
async function manageOrder(orderId) {
  // Obter pedido
  const order = await sdk.orders.getOrder(orderId);

  // Obter pagamento
  const payments = await sdk.orders.getOrderPayment(orderId);

  // Obter envio
  const shipments = await sdk.orders.getShipments(orderId);

  return { order, payments, shipments };
}
```

### Responder Pergunta

```javascript
async function answerQuestion(questionId, answer) {
  await sdk.questions.answerQuestion(questionId, {
    text: answer
  });
}
```

---

## Perguntas Frequentes

### Q: O SDK funciona no navegador?
R: Não, é exclusivo para Node.js por usar `https` nativo.

### Q: Preciso de token para tudo?
R: Não, endpoints públicos (categorias, sites, etc.) não precisam.

### Q: Quantos requests posso fazer?
R: Limite padrão: 3000 requests/hora.

### Q: Como fazer rate limiting?
R: O SDK já implementa retry automático com backoff exponencial.

### Q: Posso usar Promises?
R: Sim, todos os métodos são async/await e retornam Promises.

---

**Versão:** 3.0.0  
**Última atualização:** 2024-01-15
