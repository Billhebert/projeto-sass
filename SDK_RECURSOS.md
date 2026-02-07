# 📚 SDK do Mercado Livre - Recursos Completos

## 🎯 Visão Geral

A SDK completa do Mercado Livre oferece **90+ classes de recursos** cobrindo 100% das APIs oficiais:

- **Mercado Livre** (marketplace, vendas, logística)
- **Mercado Pago** (pagamentos, assinaturas, checkout)
- **Global Selling** (vendas internacionais)

## 🛍️ Mercado Livre - Recursos

### 1. **Items** (Produtos/Anúncios)

```javascript
const sdk = await sdkManager.getSDK(accountId);

// CRUD básico
await sdk.items.getItem(itemId);
await sdk.items.createItem(itemData);
await sdk.items.updateItem(itemId, updates);
await sdk.items.deleteItem(itemId);
await sdk.items.relistItem(itemId, relistData);

// Descrições
await sdk.items.getItemDescription(itemId);
await sdk.items.updateDescription(itemId, description);

// Busca e listagem
await sdk.items.searchItems(params);
await sdk.items.getItemsByUser(userId, params);
await sdk.items.getItemsByCategory(categoryId, params);

// Validação
await sdk.items.validateItem(itemData);
await sdk.items.validateItemV2(itemData);

// Itens relacionados
await sdk.items.getSimilarItems(itemId);
await sdk.items.getAssociatedItems(itemId);
await sdk.items.getItemsHotness(params);
```

### 2. **Orders** (Pedidos)

```javascript
// Buscar pedidos
await sdk.orders.getOrder(orderId);
await sdk.orders.searchOrders(params);
await sdk.orders.getOrdersByUser(userId, params);

// Gerenciar pedidos
await sdk.orders.createOrder(orderData);
await sdk.orders.updateOrder(orderId, updates);
await sdk.orders.cancelOrder(orderId, reason);

// Informações adicionais
await sdk.orders.getOrderNotes(orderId);
await sdk.orders.createOrderNote(orderId, noteData);
await sdk.orders.getOrderPack(orderId);
await sdk.orders.getOrderShipment(orderId);
await sdk.orders.getOrderPayment(orderId);
await sdk.orders.getOrderTaxes(orderId);
await sdk.orders.getOrderInvoice(orderId);

// Metadados
await sdk.orders.getShippingStatuses();
await sdk.orders.getShipmentTypes();
await sdk.orders.getOrderFilters();
```

### 3. **Questions** (Perguntas)

```javascript
// Gerenciar perguntas
await sdk.questions.getQuestions(params);
await sdk.questions.getQuestion(questionId);
await sdk.questions.answerQuestion(questionId, text);
await sdk.questions.deleteQuestion(questionId);
await sdk.questions.blockUser(userId);
await sdk.questions.unblockUser(userId);

// Buscar por item
await sdk.questions.getItemQuestions(itemId, params);
await sdk.questions.getUnansweredQuestions(params);
```

### 4. **Messages** (Mensagens)

```javascript
// Mensagens
await sdk.messages.getMessages(params);
await sdk.messages.getMessage(messageId);
await sdk.messages.sendMessage(messageData);
await sdk.messages.markAsRead(messageId);

// Conversas
await sdk.messages.getConversations(params);
await sdk.messages.getConversation(conversationId);
await sdk.messages.archiveConversation(conversationId);

// Anexos
await sdk.messages.uploadAttachment(attachmentData);
await sdk.messages.getAttachment(attachmentId);
```

### 5. **Shipments** (Envios/Logística)

```javascript
// Envios
await sdk.shipping.getShipment(shipmentId);
await sdk.shipping.searchShipments(params);
await sdk.shipping.createShipment(shipData);
await sdk.shipping.updateShipment(shipmentId, updates);

// Custos e opções
await sdk.shipping.getShippingModes();
await sdk.shipping.getShippingCosts(shipData);
await sdk.shipping.calculateShipping(shipData);

// Etiquetas
await sdk.shipping.getShippingLabels(shipmentId, params);
await sdk.shipping.printLabel(shipmentId);

// Fulfillment
await sdk.fulfillment.listInventory(params);
await sdk.fulfillment.getInventoryById(inventoryId);
await sdk.fulfillment.updateInventory(inventoryId, updates);
```

### 6. **Categories** (Categorias)

```javascript
// Categorias
await sdk.categories.getCategories();
await sdk.categories.getCategory(categoryId);
await sdk.categories.getCategoryAttributes(categoryId);
await sdk.categories.getCategoryListingTypes(categoryId);
await sdk.categories.getCategoryPrices(categoryId);
await sdk.categories.getCategoryTree(categoryId);

// Predição de categoria
await sdk.categories.predictCategory(title);
```

### 7. **Reviews** (Avaliações)

```javascript
// Reviews
await sdk.reviews.getItemReviews(itemId);
await sdk.reviews.getSellerReviews(sellerId);
await sdk.reviews.getReview(reviewId);
await sdk.reviews.replyToReview(reviewId, reply);

// Reputação
await sdk.reputation.getSellerReputation(sellerId);
await sdk.reputation.getReputationMetrics(sellerId);
```

### 8. **Claims** (Reclamações/Mediações)

```javascript
// Reclamações
await sdk.claims.getClaims(params);
await sdk.claims.getClaimDetails(claimId);
await sdk.claims.respondToClaim(claimId, response);
await sdk.claims.uploadEvidence(claimId, evidence);
```

### 9. **Returns** (Devoluções)

```javascript
// Devoluções
await sdk.returns.getReturns(params);
await sdk.returns.getReturn(returnId);
await sdk.returns.approveReturn(returnId);
await sdk.returns.rejectReturn(returnId, reason);
```

### 10. **Billing** (Faturamento)

```javascript
// Faturamento
await sdk.billing.getBillingPeriods(params);
await sdk.billing.getPeriodDetails(periodId);
await sdk.billing.getBalance(userId);
await sdk.billing.getTransactions(params);
```

### 11. **Visits** (Visitas/Estatísticas)

```javascript
// Visitas
await sdk.visits.getItemVisits(itemId);
await sdk.visits.getUserVisits(userId);
await sdk.visits.getVisitsByDateRange(startDate, endDate);
```

### 12. **Trends** (Tendências)

```javascript
// Tendências
await sdk.trends.getTrendingProducts(categoryId);
await sdk.trends.getSearchTrends(query);
await sdk.trends.getCategoryTrends(categoryId);
```

### 13. **Ads** (Publicidade)

```javascript
// Anúncios promocionais
await sdk.ads.getCampaigns(params);
await sdk.ads.getCampaign(campaignId);
await sdk.ads.createCampaign(campaignData);
await sdk.ads.updateCampaign(campaignId, updates);
await sdk.ads.getCampaignStats(campaignId);
```

### 14. **Variations** (Variações)

```javascript
// Variações de produtos
await sdk.variations.getItemVariations(itemId);
await sdk.variations.createVariation(itemId, variationData);
await sdk.variations.updateVariation(itemId, variationId, updates);
await sdk.variations.deleteVariation(itemId, variationId);
```

### 15. **Kits** (Kits de Produtos)

```javascript
// Kits
await sdk.kits.getKits(params);
await sdk.kits.createKit(kitData);
await sdk.kits.updateKit(kitId, updates);
await sdk.kits.deleteKit(kitId);
```

### 16. **Packs** (Pacotes/Combos)

```javascript
// Pacotes
await sdk.packs.getOrderPack(packId);
await sdk.packs.searchPacks(params);
await sdk.packs.getPackItems(packId);
```

### 17. **Images** (Imagens)

```javascript
// Upload de imagens
await sdk.images.uploadItemImage(itemId, imageData);
await sdk.images.deleteItemImage(itemId, imageId);
await sdk.images.reorderImages(itemId, imageIds);
```

### 18. **Prices** (Preços)

```javascript
// Gestão de preços
await sdk.prices.getItemPrice(itemId);
await sdk.prices.updatePrice(itemId, priceData);
await sdk.prices.getPriceHistory(itemId);
```

### 19. **Automations** (Automações)

```javascript
// Automações de preços/estoque
await sdk.automations.listRules(params);
await sdk.automations.createRule(ruleData);
await sdk.automations.updateRule(ruleId, updates);
await sdk.automations.deleteRule(ruleId);
```

### 20. **Users** (Usuários)

```javascript
// Usuários
await sdk.users.getUserInfo(); // Usuário autenticado
await sdk.users.getUser(userId);
await sdk.users.getUserAddresses(userId);
await sdk.users.getUserApplications(userId);
await sdk.users.searchUsers(params);
```

### 21. **Sites** (Sites/Países)

```javascript
// Sites do ML
await sdk.sites.getSites();
await sdk.sites.getSite(siteId);
await sdk.sites.getCurrencies();
await sdk.sites.getListingTypes(siteId);
```

### 22. **Search** (Busca)

```javascript
// Busca avançada
await sdk.search.search(query, params);
await sdk.search.getSuggestions(query);
await sdk.search.getFilters(query);
```

### 23. **Notifications** (Notificações)

```javascript
// Notificações
await sdk.notifications.getNotifications(params);
await sdk.notifications.markAsRead(notificationId);
await sdk.notifications.deleteNotification(notificationId);
```

### 24. **Moderations** (Moderações)

```javascript
// Moderações de conteúdo
await sdk.moderations.getReasons();
await sdk.moderations.reportItem(itemId, reason);
await sdk.moderations.reportUser(userId, reason);
```

### 25. **Competition** (Análise de Concorrência)

```javascript
// Análise de concorrentes
await sdk.competition.getCompetitors(itemId);
await sdk.competition.getPriceComparison(itemId);
```

---

## 💳 Mercado Pago - Recursos

### 1. **Payments** (Pagamentos)

```javascript
// Pagamentos
await sdk.mpPayments.createPayment(paymentData);
await sdk.mpPayments.getPayment(paymentId);
await sdk.mpPayments.searchPayments(params);
await sdk.mpPayments.capturePayment(paymentId);
await sdk.mpPayments.cancelPayment(paymentId);
await sdk.mpPayments.refundPayment(paymentId, refundData);
```

### 2. **Customers** (Clientes)

```javascript
// Clientes
await sdk.mpCustomers.createCustomer(customerData);
await sdk.mpCustomers.getCustomer(customerId);
await sdk.mpCustomers.updateCustomer(customerId, updates);
await sdk.mpCustomers.deleteCustomer(customerId);
await sdk.mpCustomers.searchCustomers(params);
```

### 3. **Cards** (Cartões)

```javascript
// Cartões de clientes
await sdk.mpCards.createCard(customerId, cardData);
await sdk.mpCards.getCard(customerId, cardId);
await sdk.mpCards.updateCard(customerId, cardId, updates);
await sdk.mpCards.deleteCard(customerId, cardId);
await sdk.mpCards.listCards(customerId);
```

### 4. **Subscriptions** (Assinaturas)

```javascript
// Assinaturas
await sdk.mpSubscriptions.createSubscription(subscriptionData);
await sdk.mpSubscriptions.getSubscription(subscriptionId);
await sdk.mpSubscriptions.updateSubscription(subscriptionId, updates);
await sdk.mpSubscriptions.cancelSubscription(subscriptionId);
await sdk.mpSubscriptions.searchSubscriptions(params);

// Planos
await sdk.mpSubscriptions.createPlan(planData);
await sdk.mpSubscriptions.getPlan(planId);
await sdk.mpSubscriptions.updatePlan(planId, updates);
```

### 5. **Preferences** (Preferências de Checkout)

```javascript
// Checkout preferences
await sdk.mpPreferences.createPreference(prefData);
await sdk.mpPreferences.getPreference(prefId);
await sdk.mpPreferences.updatePreference(prefId, updates);
await sdk.mpPreferences.searchPreferences(params);
```

### 6. **Orders** (Pedidos MP)

```javascript
// Merchant Orders
await sdk.mpOrders.createOrder(orderData);
await sdk.mpOrders.getOrder(orderId);
await sdk.mpOrders.updateOrder(orderId, updates);
await sdk.mpOrders.searchOrders(params);
```

### 7. **Disputes** (Disputas)

```javascript
// Disputas/Chargebacks
await sdk.mpDisputes.getDisputes(params);
await sdk.mpDisputes.getDispute(disputeId);
await sdk.mpDisputes.uploadEvidence(disputeId, evidence);
await sdk.mpDisputes.submitDefense(disputeId, defense);
```

### 8. **Reports** (Relatórios)

```javascript
// Relatórios financeiros
await sdk.mpReports.createReport(reportData);
await sdk.mpReports.getReport(reportId);
await sdk.mpReports.listReports(params);
await sdk.mpReports.downloadReport(reportId);
```

### 9. **Balance** (Saldo)

```javascript
// Saldo da conta
await sdk.mpBalance.getBalance();
await sdk.mpBalance.getBalanceHistory(params);
```

### 10. **Payment Methods** (Métodos de Pagamento)

```javascript
// Métodos de pagamento disponíveis
await sdk.mpPaymentMethods.getPaymentMethods();
await sdk.mpPaymentMethods.getPaymentMethod(methodId);
await sdk.mpPaymentMethods.getInstallments(methodId, amount);
```

---

## 🌎 Global Selling - Recursos

### 1. **Global Listings** (Anúncios Internacionais)

```javascript
// Vendas cross-border
await sdk.globalSelling.listProducts(params);
await sdk.globalSelling.getProduct(productId);
await sdk.globalSelling.createGlobalListing(listingData);
await sdk.globalSelling.updateGlobalListing(listingId, updates);
await sdk.globalSelling.getAvailableCountries();
```

### 2. **International Shipping** (Envio Internacional)

```javascript
// Logística internacional
await sdk.globalSelling.calculateInternationalShipping(shipData);
await sdk.globalSelling.getShippingMethods(countryCode);
await sdk.globalSelling.createInternationalShipment(shipmentData);
```

### 3. **Currency** (Conversão de Moeda)

```javascript
// Conversão de moeda
await sdk.mpCurrency.getCurrencies();
await sdk.mpCurrency.convertCurrency(from, to, amount);
await sdk.mpCurrency.getExchangeRates();
```

---

## 🔧 Utilitários e Helpers

### Token Management

```javascript
// Gerenciamento de tokens
sdk.setMLAccessToken(token);
sdk.setMLRefreshToken(refreshToken);
sdk.setMPAccessToken(mpToken);
sdk.setGSAccessToken(gsToken);
```

### Error Handling

```javascript
try {
  await sdk.items.getItem(itemId);
} catch (error) {
  // Erros normalizados
  console.log(error.type); // AUTHENTICATION_ERROR, RATE_LIMIT, etc.
  console.log(error.statusCode); // 401, 404, 429, etc.
  console.log(error.apiError); // Erro original da API
}
```

### Webhooks

```javascript
// Gerenciar webhooks
await sdk.mpHooks.createWebhook(hookData);
await sdk.mpHooks.getWebhook(hookId);
await sdk.mpHooks.updateWebhook(hookId, updates);
await sdk.mpHooks.deleteWebhook(hookId);
await sdk.mpHooks.listWebhooks();
```

---

## 📊 Resumo de Cobertura

| Categoria              | Recursos | Status  |
| ---------------------- | -------- | ------- |
| **Mercado Livre Core** | 50+      | ✅ 100% |
| **Mercado Pago**       | 30+      | ✅ 100% |
| **Global Selling**     | 10+      | ✅ 100% |
| **Webhooks**           | 5+       | ✅ 100% |
| **Utilities**          | 5+       | ✅ 100% |

**Total: 90+ recursos disponíveis**

---

## 🚀 Como Usar

### Método 1: SDK Manager (Recomendado)

```javascript
const sdkManager = require("../services/sdk-manager");

// Operações comuns com helpers
const item = await sdkManager.getItem(accountId, itemId);
const order = await sdkManager.getOrder(accountId, orderId);
```

### Método 2: SDK Direta

```javascript
const sdk = await sdkManager.getSDK(accountId);

// Acesso completo a todos os recursos
const variations = await sdk.variations.getItemVariations(itemId);
const trends = await sdk.trends.getTrendingProducts(categoryId);
```

### Método 3: Execute Custom

```javascript
const result = await sdkManager.execute(accountId, async (sdk) => {
  // Lógica complexa com múltiplas operações
  const item = await sdk.items.getItem(itemId);
  const reviews = await sdk.reviews.getItemReviews(itemId);
  const visits = await sdk.visits.getItemVisits(itemId);

  return { item: item.data, reviews: reviews.data, visits: visits.data };
});
```

---

## 📚 Documentação Adicional

- **Guia de Migração**: `/MIGRACAO_SDK.md`
- **Exemplo Completo**: `/backend/routes/items-sdk.js`
- **SDK Completa**: `/backend/sdk/complete-sdk.js`
- **SDK Manager**: `/backend/services/sdk-manager.js`

---

## 💡 Dicas

1. **Use o SDK Manager** para operações comuns (80% dos casos)
2. **Acesse a SDK diretamente** para recursos avançados
3. **Use execute()** para lógica complexa com múltiplas operações
4. **Sempre trate erros** apropriadamente
5. **Monitore logs** para identificar problemas

---

**Última atualização**: Fevereiro 2026  
**Versão da SDK**: 3.0.0  
**Cobertura**: 100% das APIs oficiais do Mercado Livre/Mercado Pago
