/**
 * Exemplos de Uso do Mercado Livre SDK
 */

const { MercadoLivre } = require('./dist/index');

/**
 * Exemplo 1: Autenticação Completa
 */
async function exampleAuthentication() {
  const ml = new MercadoLivre({
    clientId: 'SEU_CLIENT_ID',
    clientSecret: 'SEU_CLIENT_SECRET',
    redirectUri: 'http://localhost:3000/callback',
  });

  // 1. Gerar URL de autorização
  const authUrl = ml.auth.getAuthorizationUrl({
    response_type: 'code',
    state: 'unique_state_123',
  });
  console.log('Acesse:', authUrl);

  // 2. Após receber o código via callback
  // const code = req.query.code;
  // const token = await ml.auth.exchangeCodeForToken(code);

  // 3. Refresh token quando necessário
  // await ml.auth.refreshAccessToken();
}

/**
 * Exemplo 2: Gerenciamento de Usuários
 */
async function exampleUsers() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Usuário atual
  const me = await ml.users.getMe();
  console.log('Olá,', me.nickname);

  // Endereços
  const addresses = await ml.users.getAddresses(me.id);

  // Itens publicados
  const items = await ml.users.getItems(me.id, { limit: 10 });
}

/**
 * Exemplo 3: Publicação de Produtos
 */
async function exampleItems() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Criar produto
  const newItem = await ml.items.create({
    title: 'iPhone 15 Pro Max 256GB',
    category_id: 'MLB1052',
    price: 7999.90,
    currency_id: 'BRL',
    available_quantity: 5,
    buying_mode: 'buy_it_now',
    listing_type_id: 'gold_pro',
    condition: 'new',
    description: 'iPhone 15 Pro Max, 256GB, novo, com nota fiscal.',
    pictures: [
      { source: 'https://example.com/iphone1.jpg' },
      { source: 'https://example.com/iphone2.jpg' },
    ],
    attributes: [
      { id: 'BRAND', value_name: 'Apple' },
      { id: 'MODEL', value_name: 'iPhone 15 Pro Max' },
    ],
  });

  // Atualizar preço
  await ml.items.update(newItem.id, { price: 7499.90 });

  // Pausar publicação
  await ml.items.pause(newItem.id);
}

/**
 * Exemplo 4: Busca e Listagem
 */
async function exampleSearch() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Busca por termo
  const results = await ml.search.byQuery('notebook gamer', {
    limit: 20,
    priceFrom: 3000,
    priceTo: 10000,
    condition: 'new',
  });

  // Por categoria
  const electronics = await ml.search.byCategory('MLB1648', {
    limit: 50,
    sort: 'price_asc',
  });

  // Por vendedor
  const sellerItems = await ml.search.bySeller(123456789, {
    limit: 10,
  });
}

/**
 * Exemplo 5: Gerenciamento de Pedidos
 */
async function exampleOrders() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Listar pedidos
  const orders = await ml.orders.search({
    seller: 1033763524,
    status: 'paid',
    limit: 20,
  });

  // Feedback de venda
  for (const order of orders.orders) {
    await ml.orders.createSaleFeedback(order.id, {
      rating: 'positive',
      fulfilled: true,
      message: 'Obrigado pela compra!',
    });
  }

  // Adicionar nota
  await ml.orders.createNote(orders.orders[0].id, 'Cliente preferencial');
}

/**
 * Exemplo 6: Envios e Frete
 */
async function exampleShipments() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Rastreamento
  const shipment = await ml.shipments.get(1234567890);
  console.log('Status:', shipment.status);
  console.log('Rastreamento:', shipment.tracking_number);

  // Simular cotação
  const quote = await ml.shipments.simulateQuote({
    dimensions: '30x20x15,1000',
    weight: 2,
    zipCode: '01310000',
    itemPrice: 299.90,
    listingTypeId: 'gold_pro',
  });
}

/**
 * Exemplo 7: Perguntas e Respostas
 */
async function exampleQuestions() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Perguntas recebidas
  const questions = await ml.questions.getBySeller(1033763524, { limit: 10 });

  // Responder
  await ml.questions.answer(questions.questions[0].id, 'Sim, temos estoque!');
}

/**
 * Exemplo 8: Promoções
 */
async function examplePromotions() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Promoções ativas
  const promotions = await ml.promotions.getUserPromotions(1033763524);

  // Criar promoção
  const promotion = await ml.promotions.createPromotion({
    name: 'Black Friday 2024',
    type: 'DEAL',
    startDate: '2024-11-25T00:00:00Z',
    endDate: '2024-11-30T23:59:59Z',
    conditions: [
      { type: 'min_quantity', parameters: { value: 2 } },
    ],
    benefits: [
      { type: 'percentage', value: 20 },
    ],
  });

  // Adicionar produto
  await ml.promotions.addItemToPromotion(promotion.id, 'MLB123456789', {
    discount_percentage: 20,
  });
}

/**
 * Exemplo 9: Faturamento e NF
 */
async function exampleBilling() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Documentos fiscais
  const documents = await ml.billing.getDocuments({
    userId: 1033763524,
    period: '2024-11',
  });

  // Baixar XML
  const xml = await ml.billing.getAuthorizedXml(1033763524, '1234567');

  // Regras tributárias
  const taxRules = await ml.billing.getTaxRules(1033763524);
}

/**
 * Exemplo 10: Publicidade
 */
async function exampleAdvertising() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Campanhas ativas
  const campaigns = await ml.advertising.getCampaigns(1033763524);

  // Métricas
  const metrics = await ml.advertising.searchProductAds('MLB', 1033763524, {
    dateFrom: '2024-01-01',
    dateTo: '2024-12-31',
    metrics: ['clicks', 'impressions', 'conversions', 'spend'],
    limit: 100,
  });

  // Criar product ad
  await ml.advertising.createProductAd('MLB', 'MLB123456789', 12345, 0.50);
}

/**
 * Exemplo 11: Reclamações e Devoluções
 */
async function exampleClaims() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Reclamação
  const claim = await ml.claims.get('1234567890');

  // Mensagem
  await ml.claims.sendMessage(claim.id, 'Olá, estamos verificando sua solicitação.');

  // Evidências
  await ml.claims.addEvidence(claim.id, {
    type: 'image',
    source: 'https://example.com/evidence.jpg',
  });
}

/**
 * Exemplo 12: Métricas e Análises
 */
async function exampleMetrics() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Visitas
  const visits = await ml.visits.getUserVisits(1033763524, '2024-01-01', '2024-12-31');

  // Tendências
  const trends = await ml.trends.getBrazilTrends();

  // Reputação
  const reputation = await ml.reputation.getSellerReputation(1033763524);
}

/**
 * Exemplo 13: Conversão de Moedas
 */
async function exampleCurrencies() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Lista de moedas
  const currencies = await ml.currencies.list();

  // Conversão
  const conversion = await ml.currencies.convert('USD', 'BRL');
  console.log('1 USD =', conversion.rate, 'BRL');
}

/**
 * Exemplo 14: Localização
 */
async function exampleLocations() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN' });

  // Países
  const countries = await ml.locations.listCountries();

  // CEP
  const address = await ml.locations.searchZipCode('MLB', '01310000');
  console.log('Bairro:', address.neighborhood.name);
  console.log('Cidade:', address.city.name);
  console.log('Estado:', address.state.name);
}

/**
 * Exemplo 15: Error Handling
 */
async function exampleErrorHandling() {
  const ml = new MercadoLivre({ accessToken: 'TOKEN_INVALIDO' });

  try {
    const user = await ml.users.getMe();
  } catch (error) {
    console.error('Erro:', error.message);
    console.error('Código:', error.errorCode);
    console.error('Status:', error.statusCode);

    if (error.errorCode === 'INVALID_TOKEN') {
      // Renovar token
      await ml.auth.refreshAccessToken();
    }
  }
}

// Executar exemplos
async function main() {
  console.log('🚀 Executando exemplos do Mercado Livre SDK...\n');

  // Descomente para testar cada exemplo:
  // await exampleAuthentication();
  // await exampleUsers();
  // await exampleItems();
  // await exampleSearch();
  // await exampleOrders();
  // await exampleShipments();
  // await exampleQuestions();
  // await examplePromotions();
  // await exampleBilling();
  // await exampleAdvertising();
  // await exampleClaims();
  // await exampleMetrics();
  // await exampleCurrencies();
  // await exampleLocations();
  // await exampleErrorHandling();
}

main().catch(console.error);
