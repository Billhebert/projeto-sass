/**
 * Mercado Libre API Client Service
 * Complete implementation of ML Products API
 * https://developers.mercadolivre.com.br/pt_br/guia-para-produtos
 */

const axios = require('axios');
const FormData = require('form-data');
const logger = require('../logger');

// Mercado Libre API Base URL
const ML_API_BASE_URL = 'https://api.mercadolibre.com';

/**
 * Create configured axios instance for ML API
 */
const createMLClient = (accessToken) => {
  const client = axios.create({
    baseURL: ML_API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  client.interceptors.request.use(
    (config) => {
      logger.debug('ML API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
      });
      return config;
    },
    (error) => {
      logger.error('ML API Request Error:', { error: error.message });
      return Promise.reject(error);
    }
  );

  client.interceptors.response.use(
    (response) => {
      logger.debug('ML API Response:', {
        status: response.status,
        url: response.config.url,
      });
      return response;
    },
    (error) => {
      const errorData = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      };
      logger.error('ML API Response Error:', errorData);
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * MercadoLibre API Service - Complete Implementation
 */
class MercadoLibreService {
  constructor(accessToken, siteId = 'MLB') {
    this.accessToken = accessToken;
    this.siteId = siteId;
    this.client = createMLClient(accessToken);
  }

  setAccessToken(accessToken) {
    this.accessToken = accessToken;
    this.client = createMLClient(accessToken);
  }

  setSiteId(siteId) {
    this.siteId = siteId;
  }

  // ============================================
  // USERS API
  // ============================================

  async getMe() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async getUser(userId) {
    const response = await this.client.get(`/users/${userId}`);
    return response.data;
  }

  async getUserAddresses(userId) {
    const response = await this.client.get(`/users/${userId}/addresses`);
    return response.data;
  }

  // ============================================
  // ITEMS API - CRUD Operations
  // ============================================

  /**
   * Create new item/listing
   * POST /items
   */
  async createItem(itemData) {
    const response = await this.client.post('/items', itemData);
    return response.data;
  }

  /**
   * Get item by ID
   * GET /items/{item_id}
   */
  async getItem(itemId, params = {}) {
    const response = await this.client.get(`/items/${itemId}`, { params });
    return response.data;
  }

  /**
   * Get multiple items
   * GET /items?ids={ids}
   */
  async getItems(itemIds) {
    const ids = Array.isArray(itemIds) ? itemIds.join(',') : itemIds;
    const response = await this.client.get('/items', { params: { ids } });
    return response.data;
  }

  /**
   * Update item
   * PUT /items/{item_id}
   */
  async updateItem(itemId, updateData) {
    const response = await this.client.put(`/items/${itemId}`, updateData);
    return response.data;
  }

  /**
   * Delete/close item
   * PUT /items/{item_id} with status: closed
   */
  async closeItem(itemId) {
    const response = await this.client.put(`/items/${itemId}`, { status: 'closed' });
    return response.data;
  }

  /**
   * Pause item
   * PUT /items/{item_id} with status: paused
   */
  async pauseItem(itemId) {
    const response = await this.client.put(`/items/${itemId}`, { status: 'paused' });
    return response.data;
  }

  /**
   * Activate item
   * PUT /items/{item_id} with status: active
   */
  async activateItem(itemId) {
    const response = await this.client.put(`/items/${itemId}`, { status: 'active' });
    return response.data;
  }

  /**
   * Relist item
   * POST /items/{item_id}/relist
   */
  async relistItem(itemId, data = {}) {
    const response = await this.client.post(`/items/${itemId}/relist`, data);
    return response.data;
  }

  // ============================================
  // ITEM SEARCH API
  // ============================================

  /**
   * Search seller items
   * GET /users/{user_id}/items/search
   */
  async searchSellerItems(userId, params = {}) {
    const response = await this.client.get(`/users/${userId}/items/search`, { params });
    return response.data;
  }

  /**
   * Search items by status
   */
  async searchItemsByStatus(userId, status, params = {}) {
    return this.searchSellerItems(userId, { ...params, status });
  }

  /**
   * Search items by SKU
   */
  async searchItemsBySKU(userId, sku, params = {}) {
    return this.searchSellerItems(userId, { ...params, sku });
  }

  /**
   * Get all seller item IDs
   * GET /users/{user_id}/items/search?search_type=scan
   */
  async scanSellerItems(userId, params = {}) {
    const response = await this.client.get(`/users/${userId}/items/search`, {
      params: { ...params, search_type: 'scan' },
    });
    return response.data;
  }

  // ============================================
  // ITEM DESCRIPTION API
  // ============================================

  /**
   * Get item description
   * GET /items/{item_id}/description
   */
  async getItemDescription(itemId) {
    const response = await this.client.get(`/items/${itemId}/description`);
    return response.data;
  }

  /**
   * Update item description
   * PUT /items/{item_id}/description
   */
  async updateItemDescription(itemId, description) {
    const data = typeof description === 'string' ? { plain_text: description } : description;
    const response = await this.client.put(`/items/${itemId}/description`, data);
    return response.data;
  }

  // ============================================
  // VARIATIONS API
  // ============================================

  /**
   * Create item with variations
   */
  async createItemWithVariations(itemData) {
    return this.createItem(itemData);
  }

  /**
   * Get item variations
   * GET /items/{item_id}?attributes=variations
   */
  async getItemVariations(itemId) {
    const response = await this.client.get(`/items/${itemId}`, {
      params: { attributes: 'variations' },
    });
    return response.data.variations || [];
  }

  /**
   * Add variation to item
   * PUT /items/{item_id}
   */
  async addVariation(itemId, variation) {
    const item = await this.getItem(itemId, { attributes: 'variations' });
    const variations = item.variations || [];
    variations.push(variation);
    return this.updateItem(itemId, { variations });
  }

  /**
   * Update variation
   */
  async updateVariation(itemId, variationId, updateData) {
    const item = await this.getItem(itemId, { attributes: 'variations' });
    const variations = (item.variations || []).map(v => 
      v.id === variationId ? { ...v, ...updateData } : v
    );
    return this.updateItem(itemId, { variations });
  }

  /**
   * Delete variation
   * DELETE /items/{item_id}/variations/{variation_id}
   */
  async deleteVariation(itemId, variationId) {
    const response = await this.client.delete(`/items/${itemId}/variations/${variationId}`);
    return response.data;
  }

  // ============================================
  // PICTURES/IMAGES API
  // ============================================

  /**
   * Upload picture
   * POST /pictures/items/upload
   */
  async uploadPicture(imageBuffer, filename = 'image.jpg') {
    const formData = new FormData();
    formData.append('file', imageBuffer, filename);

    const response = await this.client.post('/pictures/items/upload', formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  }

  /**
   * Upload picture from URL
   * POST /pictures
   */
  async uploadPictureFromURL(imageUrl) {
    const response = await this.client.post('/pictures', { source: imageUrl });
    return response.data;
  }

  /**
   * Add picture to item
   * POST /items/{item_id}/pictures
   */
  async addPictureToItem(itemId, pictureId) {
    const response = await this.client.post(`/items/${itemId}/pictures`, { id: pictureId });
    return response.data;
  }

  /**
   * Delete picture from item
   * DELETE /items/{item_id}/pictures/{picture_id}
   */
  async deletePictureFromItem(itemId, pictureId) {
    const response = await this.client.delete(`/items/${itemId}/pictures/${pictureId}`);
    return response.data;
  }

  /**
   * Get picture errors
   * GET /pictures/{picture_id}/errors
   */
  async getPictureErrors(pictureId) {
    const response = await this.client.get(`/pictures/${pictureId}/errors`);
    return response.data;
  }

  // ============================================
  // CATEGORIES API
  // ============================================

  /**
   * Get site categories
   * GET /sites/{site_id}/categories
   */
  async getSiteCategories(siteId = this.siteId) {
    const response = await this.client.get(`/sites/${siteId}/categories`);
    return response.data;
  }

  /**
   * Get category details
   * GET /categories/{category_id}
   */
  async getCategory(categoryId) {
    const response = await this.client.get(`/categories/${categoryId}`);
    return response.data;
  }

  /**
   * Get category attributes
   * GET /categories/{category_id}/attributes
   */
  async getCategoryAttributes(categoryId) {
    const response = await this.client.get(`/categories/${categoryId}/attributes`);
    return response.data;
  }

  /**
   * Get category technical specs (input)
   * GET /categories/{category_id}/technical_specs/input
   */
  async getCategoryTechnicalSpecsInput(categoryId) {
    const response = await this.client.get(`/categories/${categoryId}/technical_specs/input`);
    return response.data;
  }

  /**
   * Get category technical specs (output)
   * GET /categories/{category_id}/technical_specs/output
   */
  async getCategoryTechnicalSpecsOutput(categoryId) {
    const response = await this.client.get(`/categories/${categoryId}/technical_specs/output`);
    return response.data;
  }

  /**
   * Predict category from title
   * GET /sites/{site_id}/domain_discovery/search?q={title}
   */
  async predictCategory(title, siteId = this.siteId) {
    const response = await this.client.get(`/sites/${siteId}/domain_discovery/search`, {
      params: { q: title },
    });
    return response.data;
  }

  /**
   * Get listing types
   * GET /sites/{site_id}/listing_types
   */
  async getListingTypes(siteId = this.siteId) {
    const response = await this.client.get(`/sites/${siteId}/listing_types`);
    return response.data;
  }

  // ============================================
  // CATALOG PRODUCTS API
  // ============================================

  /**
   * Search catalog products by keyword
   * GET /products/search?q={query}
   */
  async searchCatalogProducts(query, params = {}) {
    const response = await this.client.get('/products/search', {
      params: { q: query, status: 'active', ...params },
    });
    return response.data;
  }

  /**
   * Search catalog products by GTIN/EAN
   * GET /products/search?product_identifier={gtin}
   */
  async searchCatalogByGTIN(gtin, params = {}) {
    const response = await this.client.get('/products/search', {
      params: { product_identifier: gtin, ...params },
    });
    return response.data;
  }

  /**
   * Get catalog product
   * GET /products/{product_id}
   */
  async getCatalogProduct(productId) {
    const response = await this.client.get(`/products/${productId}`);
    return response.data;
  }

  /**
   * Get items competing on catalog product
   * GET /products/{product_id}/items
   */
  async getCatalogProductItems(productId) {
    const response = await this.client.get(`/products/${productId}/items`);
    return response.data;
  }

  /**
   * Check catalog listing eligibility
   * GET /items/{item_id}/catalog_listing_eligibility
   */
  async getCatalogEligibility(itemId) {
    const response = await this.client.get(`/items/${itemId}/catalog_listing_eligibility`);
    return response.data;
  }

  /**
   * Bulk check catalog eligibility
   * GET /multiget/catalog_listing_eligibility?ids={ids}
   */
  async getCatalogEligibilityBulk(itemIds) {
    const ids = Array.isArray(itemIds) ? itemIds.join(',') : itemIds;
    const response = await this.client.get('/multiget/catalog_listing_eligibility', {
      params: { ids },
    });
    return response.data;
  }

  /**
   * Opt-in item to catalog
   * POST /items/catalog_listings
   */
  async optInToCatalog(itemId, catalogProductId, variationId = null) {
    const data = {
      item_id: itemId,
      catalog_product_id: catalogProductId,
    };
    if (variationId) data.variation_id = variationId;
    
    const response = await this.client.post('/items/catalog_listings', data);
    return response.data;
  }

  /**
   * Create catalog listing directly
   * POST /items with catalog_product_id
   */
  async createCatalogListing(itemData) {
    const data = { ...itemData, catalog_listing: true };
    const response = await this.client.post('/items', data);
    return response.data;
  }

  /**
   * Get price to win
   * GET /items/{item_id}/price_to_win
   */
  async getPriceToWin(itemId, siteId = this.siteId) {
    const response = await this.client.get(`/items/${itemId}/price_to_win`, {
      params: { siteId, version: 'v2' },
    });
    return response.data;
  }

  // ============================================
  // ORDERS API
  // ============================================

  /**
   * Get order by ID
   * GET /orders/{order_id}
   */
  async getOrder(orderId) {
    const response = await this.client.get(`/orders/${orderId}`);
    return response.data;
  }

  /**
   * Search orders
   * GET /orders/search?seller={seller_id}
   */
  async searchOrders(sellerId, params = {}) {
    const response = await this.client.get('/orders/search', {
      params: { seller: sellerId, ...params },
    });
    return response.data;
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(sellerId, params = {}) {
    return this.searchOrders(sellerId, {
      sort: 'date_desc',
      ...params,
    });
  }

  /**
   * Get order by pack
   * GET /packs/{pack_id}
   */
  async getPack(packId) {
    const response = await this.client.get(`/packs/${packId}`);
    return response.data;
  }

  // ============================================
  // SHIPMENTS API
  // ============================================

  /**
   * Get shipment by ID
   * GET /shipments/{shipment_id}
   */
  async getShipment(shipmentId) {
    const response = await this.client.get(`/shipments/${shipmentId}`);
    return response.data;
  }

  /**
   * Get shipment costs
   * GET /shipments/{shipment_id}/costs
   */
  async getShipmentCosts(shipmentId) {
    const response = await this.client.get(`/shipments/${shipmentId}/costs`);
    return response.data;
  }

  /**
   * Get shipment label
   * GET /shipment_labels?shipment_ids={shipment_id}
   */
  async getShipmentLabel(shipmentId, format = 'pdf') {
    const response = await this.client.get('/shipment_labels', {
      params: { shipment_ids: shipmentId, response_type: format },
      responseType: 'arraybuffer',
    });
    return response.data;
  }

  /**
   * Get shipping options for item
   * GET /items/{item_id}/shipping_options
   */
  async getItemShippingOptions(itemId, params = {}) {
    const response = await this.client.get(`/items/${itemId}/shipping_options`, { params });
    return response.data;
  }

  /**
   * Update shipment tracking
   * POST /shipments/{shipment_id}/tracking
   */
  async updateShipmentTracking(shipmentId, trackingData) {
    const response = await this.client.post(`/shipments/${shipmentId}/tracking`, trackingData);
    return response.data;
  }

  // ============================================
  // QUESTIONS API
  // ============================================

  /**
   * Search questions
   * GET /my/received_questions/search
   */
  async searchQuestions(params = {}) {
    const response = await this.client.get('/my/received_questions/search', { params });
    return response.data;
  }

  /**
   * Get question by ID
   * GET /questions/{question_id}
   */
  async getQuestion(questionId) {
    const response = await this.client.get(`/questions/${questionId}`);
    return response.data;
  }

  /**
   * Answer question
   * POST /answers
   */
  async answerQuestion(questionId, text) {
    const response = await this.client.post('/answers', {
      question_id: questionId,
      text,
    });
    return response.data;
  }

  /**
   * Delete question
   * DELETE /questions/{question_id}
   */
  async deleteQuestion(questionId) {
    const response = await this.client.delete(`/questions/${questionId}`);
    return response.data;
  }

  /**
   * Get item questions
   * GET /items/{item_id}/questions
   */
  async getItemQuestions(itemId, params = {}) {
    const response = await this.client.get(`/items/${itemId}/questions`, { params });
    return response.data;
  }

  // ============================================
  // MESSAGES API (Post-sale)
  // ============================================

  /**
   * Get pack messages
   * GET /messages/packs/{pack_id}/sellers/{seller_id}
   */
  async getPackMessages(packId, sellerId) {
    const response = await this.client.get(`/messages/packs/${packId}/sellers/${sellerId}`);
    return response.data;
  }

  /**
   * Send message
   * POST /messages/packs/{pack_id}/sellers/{seller_id}
   */
  async sendMessage(packId, sellerId, messageData) {
    const response = await this.client.post(
      `/messages/packs/${packId}/sellers/${sellerId}`,
      messageData
    );
    return response.data;
  }

  /**
   * Upload message attachment
   * POST /messages/attachments
   */
  async uploadMessageAttachment(fileBuffer, filename) {
    const formData = new FormData();
    formData.append('file', fileBuffer, filename);

    const response = await this.client.post('/messages/attachments', formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  }

  // ============================================
  // CLAIMS API
  // ============================================

  /**
   * Get claim by ID
   * GET /claims/{claim_id}
   */
  async getClaim(claimId) {
    const response = await this.client.get(`/claims/${claimId}`);
    return response.data;
  }

  /**
   * Search claims
   * GET /claims/search
   */
  async searchClaims(params = {}) {
    const response = await this.client.get('/claims/search', { params });
    return response.data;
  }

  // ============================================
  // RETURNS API
  // ============================================

  /**
   * Get return info
   * GET /v2/claims/{claim_id}/returns
   */
  async getReturn(claimId) {
    const response = await this.client.get(`/v2/claims/${claimId}/returns`);
    return response.data;
  }

  // ============================================
  // PROMOTIONS API
  // ============================================

  /**
   * Get seller promotions
   * GET /seller-promotions/users/{user_id}
   */
  async getSellerPromotions(userId) {
    const response = await this.client.get(`/seller-promotions/users/${userId}`);
    return response.data;
  }

  /**
   * Get promotion details
   * GET /seller-promotions/promotions/{promotion_id}
   */
  async getPromotion(promotionId) {
    const response = await this.client.get(`/seller-promotions/promotions/${promotionId}`);
    return response.data;
  }

  /**
   * Get promotion items
   * GET /seller-promotions/promotions/{promotion_id}/items
   */
  async getPromotionItems(promotionId) {
    const response = await this.client.get(`/seller-promotions/promotions/${promotionId}/items`);
    return response.data;
  }

  /**
   * Add item to promotion
   * POST /seller-promotions/items/{item_id}
   */
  async addItemToPromotion(itemId, promotionData) {
    const response = await this.client.post(`/seller-promotions/items/${itemId}`, promotionData);
    return response.data;
  }

  /**
   * Remove item from promotion
   * DELETE /seller-promotions/items/{item_id}
   */
  async removeItemFromPromotion(itemId) {
    const response = await this.client.delete(`/seller-promotions/items/${itemId}`);
    return response.data;
  }

  // ============================================
  // PRODUCT ADS / ADVERTISING API
  // ============================================

  /**
   * Get advertiser info
   * GET /advertising/advertisers
   */
  async getAdvertiser(params = {}) {
    const response = await this.client.get('/advertising/advertisers', { params });
    return response.data;
  }

  /**
   * Get ad campaigns
   * GET /advertising/{site_id}/advertisers/{advertiser_id}/product_ads/campaigns/search
   */
  async getAdCampaigns(siteId, advertiserId, params = {}) {
    const response = await this.client.get(
      `/advertising/${siteId}/advertisers/${advertiserId}/product_ads/campaigns/search`,
      { params }
    );
    return response.data;
  }

  /**
   * Create ad campaign
   * POST /advertising/{site_id}/advertisers/{advertiser_id}/product_ads/campaigns
   */
  async createAdCampaign(siteId, advertiserId, campaignData) {
    const response = await this.client.post(
      `/advertising/${siteId}/advertisers/${advertiserId}/product_ads/campaigns`,
      campaignData
    );
    return response.data;
  }

  /**
   * Update ad campaign
   * PUT /advertising/{site_id}/product_ads/campaigns/{campaign_id}
   */
  async updateAdCampaign(siteId, campaignId, updateData) {
    const response = await this.client.put(
      `/advertising/${siteId}/product_ads/campaigns/${campaignId}`,
      updateData
    );
    return response.data;
  }

  /**
   * Get item ad
   * GET /advertising/{site_id}/product_ads/ads/{item_id}
   */
  async getItemAd(siteId, itemId) {
    const response = await this.client.get(`/advertising/${siteId}/product_ads/ads/${itemId}`);
    return response.data;
  }

  /**
   * Update item ad
   * PUT /advertising/{site_id}/product_ads/ads/{item_id}
   */
  async updateItemAd(siteId, itemId, adData) {
    const response = await this.client.put(
      `/advertising/${siteId}/product_ads/ads/${itemId}`,
      adData
    );
    return response.data;
  }

  // ============================================
  // PRICING AUTOMATION API
  // ============================================

  /**
   * Get pricing rules
   * GET /items/{item_id}/prices/automate/rules
   */
  async getPricingRules(itemId) {
    const response = await this.client.get(`/items/${itemId}/prices/automate/rules`);
    return response.data;
  }

  /**
   * Create pricing automation
   * POST /items/{item_id}/prices/automate
   */
  async createPricingAutomation(itemId, pricingData) {
    const response = await this.client.post(`/items/${itemId}/prices/automate`, pricingData);
    return response.data;
  }

  /**
   * Get pricing automation
   * GET /items/{item_id}/prices/automate
   */
  async getPricingAutomation(itemId) {
    const response = await this.client.get(`/items/${itemId}/prices/automate`);
    return response.data;
  }

  /**
   * Update pricing automation
   * PUT /items/{item_id}/prices/automate
   */
  async updatePricingAutomation(itemId, pricingData) {
    const response = await this.client.put(`/items/${itemId}/prices/automate`, pricingData);
    return response.data;
  }

  /**
   * Delete pricing automation
   * DELETE /items/{item_id}/prices/automate
   */
  async deletePricingAutomation(itemId) {
    const response = await this.client.delete(`/items/${itemId}/prices/automate`);
    return response.data;
  }

  // ============================================
  // TRENDS API
  // ============================================

  /**
   * Get site trends
   * GET /trends/{site_id}
   */
  async getTrends(siteId = this.siteId) {
    const response = await this.client.get(`/trends/${siteId}`);
    return response.data;
  }

  /**
   * Get category trends
   * GET /trends/{site_id}/{category_id}
   */
  async getCategoryTrends(categoryId, siteId = this.siteId) {
    const response = await this.client.get(`/trends/${siteId}/${categoryId}`);
    return response.data;
  }

  // ============================================
  // VISITS API
  // ============================================

  /**
   * Get item visits
   * GET /visits/items?ids={item_id}
   */
  async getItemVisits(itemIds) {
    const ids = Array.isArray(itemIds) ? itemIds.join(',') : itemIds;
    const response = await this.client.get('/visits/items', { params: { ids } });
    return response.data;
  }

  /**
   * Get item visits by date range
   * GET /items/visits?ids={item_id}&date_from={date}&date_to={date}
   */
  async getItemVisitsByDateRange(itemIds, dateFrom, dateTo) {
    const ids = Array.isArray(itemIds) ? itemIds.join(',') : itemIds;
    const response = await this.client.get('/items/visits', {
      params: { ids, date_from: dateFrom, date_to: dateTo },
    });
    return response.data;
  }

  /**
   * Get item visits by time window
   * GET /items/{item_id}/visits/time_window?last={n}&unit=day
   */
  async getItemVisitsTimeWindow(itemId, last = 30, unit = 'day') {
    const response = await this.client.get(`/items/${itemId}/visits/time_window`, {
      params: { last, unit },
    });
    return response.data;
  }

  // ============================================
  // REVIEWS API
  // ============================================

  /**
   * Get item reviews
   * GET /reviews/item/{item_id}
   */
  async getItemReviews(itemId, params = {}) {
    const response = await this.client.get(`/reviews/item/${itemId}`, { params });
    return response.data;
  }

  /**
   * Get catalog product reviews
   * GET /reviews/item/{item_id}?catalog_product_id={product_id}
   */
  async getCatalogProductReviews(itemId, catalogProductId, params = {}) {
    const response = await this.client.get(`/reviews/item/${itemId}`, {
      params: { catalog_product_id: catalogProductId, ...params },
    });
    return response.data;
  }

  // ============================================
  // SELLER REPUTATION API
  // ============================================

  /**
   * Get seller reputation
   * GET /users/{user_id}
   */
  async getSellerReputation(userId) {
    const user = await this.getUser(userId);
    return user.seller_reputation || null;
  }

  // ============================================
  // SIZE CHARTS API
  // ============================================

  /**
   * Get size chart
   * GET /catalog/charts/{chart_id}
   */
  async getSizeChart(chartId) {
    const response = await this.client.get(`/catalog/charts/${chartId}`);
    return response.data;
  }

  /**
   * Create size chart
   * POST /catalog/charts
   */
  async createSizeChart(chartData) {
    const response = await this.client.post('/catalog/charts', chartData);
    return response.data;
  }

  /**
   * Update size chart
   * PUT /catalog/charts/{chart_id}
   */
  async updateSizeChart(chartId, chartData) {
    const response = await this.client.put(`/catalog/charts/${chartId}`, chartData);
    return response.data;
  }

  /**
   * Delete size chart
   * DELETE /catalog/charts/{chart_id}
   */
  async deleteSizeChart(chartId) {
    const response = await this.client.delete(`/catalog/charts/${chartId}`);
    return response.data;
  }

  /**
   * Add rows to size chart
   * POST /catalog/charts/{chart_id}/rows
   */
  async addSizeChartRows(chartId, rows) {
    const response = await this.client.post(`/catalog/charts/${chartId}/rows`, rows);
    return response.data;
  }

  /**
   * Get size equivalences
   * GET /sizechart/equivalences
   */
  async getSizeEquivalences(domainId, gender, siteId = this.siteId) {
    const response = await this.client.get('/sizechart/equivalences', {
      params: { domain_id: domainId, gender, site_id: siteId },
    });
    return response.data;
  }

  // ============================================
  // OFFICIAL STORES API
  // ============================================

  /**
   * Get user brands
   * GET /users/{user_id}/brands
   */
  async getUserBrands(userId) {
    const response = await this.client.get(`/users/${userId}/brands`);
    return response.data;
  }

  /**
   * Get brand details
   * GET /users/{user_id}/brands/{brand_id}
   */
  async getBrand(userId, brandId) {
    const response = await this.client.get(`/users/${userId}/brands/${brandId}`);
    return response.data;
  }

  // ============================================
  // FULFILLMENT API
  // ============================================

  /**
   * Get fulfillment inventory
   * GET /inventories/{inventory_id}/stock/fulfillment
   */
  async getFulfillmentStock(inventoryId, sellerId) {
    const response = await this.client.get(`/inventories/${inventoryId}/stock/fulfillment`, {
      params: { seller_id: sellerId },
    });
    return response.data;
  }

  /**
   * Search fulfillment operations
   * GET /stock/fulfillment/operations/search
   */
  async searchFulfillmentOperations(sellerId, params = {}) {
    const response = await this.client.get('/stock/fulfillment/operations/search', {
      params: { seller_id: sellerId, ...params },
    });
    return response.data;
  }

  /**
   * Get fulfillment operation
   * GET /stock/fulfillment/operations/{operation_id}
   */
  async getFulfillmentOperation(operationId, sellerId) {
    const response = await this.client.get(`/stock/fulfillment/operations/${operationId}`, {
      params: { seller_id: sellerId },
    });
    return response.data;
  }

  // ============================================
  // ITEM PERFORMANCE / QUALITY API
  // ============================================

  /**
   * Get item performance/quality
   * GET /items/{item_id}/performance
   */
  async getItemPerformance(itemId) {
    const response = await this.client.get(`/items/${itemId}/performance`);
    return response.data;
  }

  // ============================================
  // NOTIFICATIONS API
  // ============================================

  /**
   * Get missed notifications
   * GET /missed_feeds?app_id={app_id}
   */
  async getMissedNotifications(appId) {
    const response = await this.client.get('/missed_feeds', { params: { app_id: appId } });
    return response.data;
  }

  // ============================================
  // SEARCH API (Public)
  // ============================================

  /**
   * Search products on site
   * GET /sites/{site_id}/search?q={query}
   */
  async search(query, params = {}, siteId = this.siteId) {
    const response = await this.client.get(`/sites/${siteId}/search`, {
      params: { q: query, ...params },
    });
    return response.data;
  }

  /**
   * Search by category
   * GET /sites/{site_id}/search?category={category_id}
   */
  async searchByCategory(categoryId, params = {}, siteId = this.siteId) {
    const response = await this.client.get(`/sites/${siteId}/search`, {
      params: { category: categoryId, ...params },
    });
    return response.data;
  }

  /**
   * Search by seller
   * GET /sites/{site_id}/search?seller_id={seller_id}
   */
  async searchBySeller(sellerId, params = {}, siteId = this.siteId) {
    const response = await this.client.get(`/sites/${siteId}/search`, {
      params: { seller_id: sellerId, ...params },
    });
    return response.data;
  }
}

// Factory function
const createMercadoLibreService = (accessToken, siteId = 'MLB') => {
  return new MercadoLibreService(accessToken, siteId);
};

module.exports = {
  MercadoLibreService,
  createMercadoLibreService,
};
