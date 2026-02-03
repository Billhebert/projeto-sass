/**
 * Global Selling API Client Service
 * Complete implementation for cross-border e-commerce
 * https://global-selling.mercadolibre.com/devsite/en_us/introduction-globalselling
 * 
 * Supported Marketplaces:
 * - CBT (Global/Cross-Border Trade) - Parent account
 * - MLM (Mexico) - Remote & Fulfillment
 * - MLB (Brazil) - Remote only
 * - MLC (Chile) - Remote & Fulfillment
 * - MCO (Colombia) - Remote only
 */

const axios = require('axios');
const FormData = require('form-data');
const logger = require('../logger');

const ML_API_BASE_URL = 'https://api.mercadolibre.com';

const createGSClient = (accessToken) => {
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
      logger.debug('GS API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
      });
      return config;
    },
    (error) => {
      logger.error('GS API Request Error:', { error: error.message });
      return Promise.reject(error);
    }
  );

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      logger.error('GS API Response Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Global Selling Service - Complete Implementation
 */
class GlobalSellingService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.client = createGSClient(accessToken);
  }

  setAccessToken(accessToken) {
    this.accessToken = accessToken;
    this.client = createGSClient(accessToken);
  }

  // ============================================
  // USERS API (Global)
  // ============================================

  async getMe() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async getUser(userId) {
    const response = await this.client.get(`/users/${userId}`);
    return response.data;
  }

  async getGlobalUser(userId) {
    const response = await this.client.get(`/global/users/${userId}`);
    return response.data;
  }

  async getGlobalSellerReputation() {
    const response = await this.client.get('/global/users/seller_reputation');
    return response.data;
  }

  // ============================================
  // GLOBAL ITEMS API
  // ============================================

  /**
   * Create global item (cross-border listing)
   * POST /global/items
   * Note: Prices must be in USD, titles in English
   */
  async createGlobalItem(itemData) {
    const response = await this.client.post('/global/items', itemData);
    return response.data;
  }

  /**
   * Get global item
   * GET /global/items/{item_id}
   */
  async getGlobalItem(itemId) {
    const response = await this.client.get(`/global/items/${itemId}`);
    return response.data;
  }

  /**
   * Update global item
   * PUT /global/items/{item_id}
   */
  async updateGlobalItem(itemId, updateData) {
    const response = await this.client.put(`/global/items/${itemId}`, updateData);
    return response.data;
  }

  /**
   * Get marketplace-specific item
   * GET /marketplace/items/{item_id}
   */
  async getMarketplaceItem(itemId, params = {}) {
    const response = await this.client.get(`/marketplace/items/${itemId}`, { params });
    return response.data;
  }

  /**
   * Update marketplace-specific item
   * PUT /marketplace/items/{item_id}
   */
  async updateMarketplaceItem(itemId, updateData) {
    const response = await this.client.put(`/marketplace/items/${itemId}`, updateData);
    return response.data;
  }

  /**
   * Delete item
   * DELETE /items/{item_id}
   */
  async deleteItem(itemId) {
    const response = await this.client.delete(`/items/${itemId}`);
    return response.data;
  }

  /**
   * Relist item
   * PUT /items/{item_id}?action=relist
   */
  async relistItem(itemId) {
    const response = await this.client.put(`/items/${itemId}`, {}, {
      params: { action: 'relist' },
    });
    return response.data;
  }

  /**
   * Search seller items
   * GET /users/{user_id}/items/search
   */
  async searchSellerItems(userId, params = {}) {
    const response = await this.client.get(`/users/${userId}/items/search`, { params });
    return response.data;
  }

  /**
   * Search catalog-eligible items
   */
  async searchCatalogEligibleItems(userId, params = {}) {
    return this.searchSellerItems(userId, { ...params, tags: 'catalog_listing_eligible' });
  }

  /**
   * Search catalog-listed items
   */
  async searchCatalogListedItems(userId, params = {}) {
    return this.searchSellerItems(userId, { ...params, catalog_listing: true });
  }

  // ============================================
  // PICTURES API
  // ============================================

  /**
   * Upload picture
   * POST /pictures/items/upload
   * Max 10MB, formats: JPG, JPEG, PNG
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
   * Link picture to item
   * POST /items/{item_id}/pictures
   */
  async linkPictureToItem(itemId, pictureId) {
    const response = await this.client.post(`/items/${itemId}/pictures`, { id: pictureId });
    return response.data;
  }

  /**
   * Replace variation pictures
   * PUT /global/items/{item_id}
   */
  async replaceVariationPictures(itemId, variations) {
    const response = await this.client.put(`/global/items/${itemId}`, { variations });
    return response.data;
  }

  /**
   * Check picture errors
   * GET /pictures/{picture_id}/errors
   */
  async getPictureErrors(pictureId) {
    const response = await this.client.get(`/pictures/${pictureId}/errors`);
    return response.data;
  }

  // ============================================
  // VARIATIONS API
  // ============================================

  /**
   * Get item with variations
   * GET /marketplace/items/{item_id}?attributes=variations
   */
  async getItemVariations(itemId) {
    const response = await this.client.get(`/marketplace/items/${itemId}`, {
      params: { attributes: 'variations' },
    });
    return response.data.variations || [];
  }

  /**
   * Get item with all attributes
   * GET /marketplace/items/{item_id}?include_attributes=all
   */
  async getItemWithAllAttributes(itemId) {
    const response = await this.client.get(`/marketplace/items/${itemId}`, {
      params: { include_attributes: 'all' },
    });
    return response.data;
  }

  /**
   * Add variation to global item
   * PUT /global/items/{item_id}
   */
  async addVariation(itemId, variation) {
    const item = await this.getGlobalItem(itemId);
    const variations = item.variations || [];
    variations.push(variation);
    return this.updateGlobalItem(itemId, { variations });
  }

  /**
   * Delete variation
   * DELETE /marketplace/items/{item_id}/variations/{variation_id}
   */
  async deleteVariation(itemId, variationId) {
    const response = await this.client.delete(`/marketplace/items/${itemId}/variations/${variationId}`);
    return response.data;
  }

  // ============================================
  // ATTRIBUTES API
  // ============================================

  /**
   * Get category attributes
   * GET /categories/{category_id}/attributes
   */
  async getCategoryAttributes(categoryId) {
    const response = await this.client.get(`/categories/${categoryId}/attributes`);
    return response.data;
  }

  /**
   * Get technical specs input
   * GET /categories/{category_id}/technical_specs/input
   */
  async getTechnicalSpecsInput(categoryId) {
    const response = await this.client.get(`/categories/${categoryId}/technical_specs/input`);
    return response.data;
  }

  /**
   * Get technical specs output
   * GET /categories/{category_id}/technical_specs/output
   */
  async getTechnicalSpecsOutput(categoryId) {
    const response = await this.client.get(`/categories/${categoryId}/technical_specs/output`);
    return response.data;
  }

  // ============================================
  // CATEGORIES API
  // ============================================

  /**
   * Get site categories
   * GET /sites/{site_id}/categories
   */
  async getSiteCategories(siteId) {
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
   * Predict category from title
   * GET /sites/{site_id}/domain_discovery/search?q={title}
   */
  async predictCategory(title, siteId) {
    const response = await this.client.get(`/sites/${siteId}/domain_discovery/search`, {
      params: { q: title },
    });
    return response.data;
  }

  // ============================================
  // CATALOG ELIGIBILITY API
  // ============================================

  /**
   * Get item catalog eligibility
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

  // ============================================
  // CATALOG PRODUCTS SEARCH API
  // ============================================

  /**
   * Search catalog products by GTIN
   * GET /marketplace/products/search?product_identifier={gtin}
   */
  async searchProductsByGTIN(gtin, params = {}) {
    const response = await this.client.get('/marketplace/products/search', {
      params: { product_identifier: gtin, ...params },
    });
    return response.data;
  }

  /**
   * Search catalog products by keyword
   * GET /marketplace/products/search?q={query}
   */
  async searchProducts(query, params = {}) {
    const response = await this.client.get('/marketplace/products/search', {
      params: { q: query, status: 'active', ...params },
    });
    return response.data;
  }

  /**
   * Get catalog product details
   * GET /products/{product_id}
   */
  async getProduct(productId) {
    const response = await this.client.get(`/products/${productId}`);
    return response.data;
  }

  // ============================================
  // CATALOG LISTING API
  // ============================================

  /**
   * Opt-in existing item to catalog
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
   * Create direct catalog listing
   * POST /items
   */
  async createCatalogListing(itemData) {
    const data = { ...itemData, catalog_listing: true };
    const response = await this.client.post('/items', data);
    return response.data;
  }

  // ============================================
  // CATALOG COMPETITION API
  // ============================================

  /**
   * Get price to win
   * GET /items/{item_id}/price_to_win?siteId={site}&version=v2
   */
  async getPriceToWin(itemId, siteId) {
    const response = await this.client.get(`/items/${itemId}/price_to_win`, {
      params: { siteId, version: 'v2' },
    });
    return response.data;
  }

  /**
   * Get buy box winner info
   * GET /products/{product_id}
   */
  async getBuyBoxWinner(productId) {
    const product = await this.getProduct(productId);
    return product.buy_box_winner || null;
  }

  /**
   * Get all competing items for catalog product
   * GET /products/{product_id}/items
   */
  async getCompetingItems(productId) {
    const response = await this.client.get(`/products/${productId}/items`);
    return response.data;
  }

  // ============================================
  // ORDERS API (Marketplace)
  // ============================================

  /**
   * Get order by ID
   * GET /marketplace/orders/{order_id}
   */
  async getOrder(orderId) {
    const response = await this.client.get(`/marketplace/orders/${orderId}`);
    return response.data;
  }

  /**
   * Search orders
   * GET /marketplace/orders/search?seller={user_id}
   */
  async searchOrders(sellerId, params = {}) {
    const response = await this.client.get('/marketplace/orders/search', {
      params: { seller: sellerId, ...params },
    });
    return response.data;
  }

  /**
   * Search orders by status
   */
  async searchOrdersByStatus(sellerId, status, params = {}) {
    return this.searchOrders(sellerId, { ...params, 'order.status': status });
  }

  /**
   * Get pack/cart order
   * GET /marketplace/orders/pack/{pack_id}
   */
  async getPack(packId) {
    const response = await this.client.get(`/marketplace/orders/pack/${packId}`);
    return response.data;
  }

  // ============================================
  // SHIPMENTS API (Marketplace)
  // ============================================

  /**
   * Get shipment by ID
   * GET /marketplace/shipments/{shipment_id}
   */
  async getShipment(shipmentId) {
    const response = await this.client.get(`/marketplace/shipments/${shipmentId}`);
    return response.data;
  }

  /**
   * Get shipment costs
   * GET /marketplace/shipments/{shipment_id}/costs
   */
  async getShipmentCosts(shipmentId) {
    const response = await this.client.get(`/marketplace/shipments/${shipmentId}/costs`);
    return response.data;
  }

  /**
   * Update shipment tracking
   * POST /marketplace/shipments/{shipment_id}/tracking
   */
  async updateShipmentTracking(shipmentId, trackingData) {
    const response = await this.client.post(`/marketplace/shipments/${shipmentId}/tracking`, trackingData);
    return response.data;
  }

  /**
   * Get shipping compensation costs
   * GET /marketplace/shipments/{shipment_id}/compensation_costs
   */
  async getShipmentCompensationCosts(shipmentId) {
    const response = await this.client.get(`/marketplace/shipments/${shipmentId}/compensation_costs`);
    return response.data;
  }

  /**
   * Get item shipping compensation
   * GET /marketplace/items/{item_id}/shipping_compensation
   */
  async getItemShippingCompensation(itemId) {
    const response = await this.client.get(`/marketplace/items/${itemId}/shipping_compensation`);
    return response.data;
  }

  // ============================================
  // QUESTIONS API
  // ============================================

  /**
   * Search received questions
   * GET /my/received_questions/search?seller_id={user_id}
   */
  async searchQuestions(sellerId, params = {}) {
    const response = await this.client.get('/my/received_questions/search', {
      params: { seller_id: sellerId, ...params },
    });
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

  // ============================================
  // CLAIMS API (Marketplace)
  // ============================================

  /**
   * Get claim by ID
   * GET /marketplace/claims/{claim_id}
   */
  async getClaim(claimId) {
    const response = await this.client.get(`/marketplace/claims/${claimId}`);
    return response.data;
  }

  /**
   * Search claims
   * GET /marketplace/claims/search?receiver_id={user_id}
   */
  async searchClaims(receiverId, params = {}) {
    const response = await this.client.get('/marketplace/claims/search', {
      params: { receiver_id: receiverId, ...params },
    });
    return response.data;
  }

  /**
   * Search claims by status
   */
  async searchClaimsByStatus(receiverId, status, params = {}) {
    return this.searchClaims(receiverId, { ...params, status });
  }

  // ============================================
  // RETURNS API
  // ============================================

  /**
   * Get return info
   * GET /marketplace/v2/claims/{claim_id}/returns
   */
  async getReturn(claimId) {
    const response = await this.client.get(`/marketplace/v2/claims/${claimId}/returns`);
    return response.data;
  }

  /**
   * Get return reviews
   * GET /post-purchase/v1/returns/{return_id}/reviews
   */
  async getReturnReviews(returnId) {
    const response = await this.client.get(`/post-purchase/v1/returns/${returnId}/reviews`);
    return response.data;
  }

  /**
   * Create return review
   * POST /post-purchase/v1/returns/{return_id}/return-review
   */
  async createReturnReview(returnId, reviewData) {
    const response = await this.client.post(`/post-purchase/v1/returns/${returnId}/return-review`, reviewData);
    return response.data;
  }

  /**
   * Get return reasons
   * GET /post-purchase/v1/returns/reasons
   */
  async getReturnReasons(flow, claimId) {
    const response = await this.client.get('/post-purchase/v1/returns/reasons', {
      params: { flow, claim_id: claimId },
    });
    return response.data;
  }

  /**
   * Upload return attachments
   * POST /post-purchase/v1/claims/{claim_id}/returns/attachments
   */
  async uploadReturnAttachment(claimId, fileBuffer, filename) {
    const formData = new FormData();
    formData.append('file', fileBuffer, filename);

    const response = await this.client.post(
      `/post-purchase/v1/claims/${claimId}/returns/attachments`,
      formData,
      { headers: formData.getHeaders() }
    );
    return response.data;
  }

  /**
   * Get return cost
   * GET /post-purchase/v1/claims/{claim_id}/charges/return-cost
   */
  async getReturnCost(claimId) {
    const response = await this.client.get(`/post-purchase/v1/claims/${claimId}/charges/return-cost`);
    return response.data;
  }

  // ============================================
  // POST-SALE MESSAGING API
  // ============================================

  /**
   * Get pack messages
   * GET /marketplace/messages/packs/{pack_id}
   */
  async getPackMessages(packId) {
    const response = await this.client.get(`/marketplace/messages/packs/${packId}`);
    return response.data;
  }

  /**
   * Get message by ID
   * GET /marketplace/messages/{message_id}
   */
  async getMessage(messageId) {
    const response = await this.client.get(`/marketplace/messages/${messageId}`);
    return response.data;
  }

  /**
   * Send message
   * POST /marketplace/messages/packs/{pack_id}
   */
  async sendMessage(packId, messageData) {
    const response = await this.client.post(`/marketplace/messages/packs/${packId}`, messageData);
    return response.data;
  }

  /**
   * Upload message attachment
   * POST /marketplace/messages/attachments
   * Max 25MB
   */
  async uploadMessageAttachment(fileBuffer, filename) {
    const formData = new FormData();
    formData.append('file', fileBuffer, filename);

    const response = await this.client.post('/marketplace/messages/attachments', formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get message attachment
   * GET /marketplace/messages/attachments/{attachment_id}
   */
  async getMessageAttachment(attachmentId) {
    const response = await this.client.get(`/marketplace/messages/attachments/${attachmentId}`);
    return response.data;
  }

  // ============================================
  // PROMOTIONS API (Marketplace)
  // ============================================

  /**
   * Get seller promotions
   * GET /marketplace/seller-promotions/users/{user_id}
   */
  async getSellerPromotions(userId) {
    const response = await this.client.get(`/marketplace/seller-promotions/users/${userId}`);
    return response.data;
  }

  /**
   * Get promotion candidate
   * GET /marketplace/seller-promotions/promotions/candidates/{candidate_id}
   */
  async getPromotionCandidate(candidateId) {
    const response = await this.client.get(`/marketplace/seller-promotions/promotions/candidates/${candidateId}`);
    return response.data;
  }

  /**
   * Get promotion offer
   * GET /marketplace/seller-promotions/promotions/offer/{offer_id}/{user_id}
   */
  async getPromotionOffer(offerId, userId) {
    const response = await this.client.get(`/marketplace/seller-promotions/promotions/offer/${offerId}/${userId}`);
    return response.data;
  }

  /**
   * Get promotion details
   * GET /marketplace/seller-promotions/promotions/{promotion_id}
   */
  async getPromotion(promotionId) {
    const response = await this.client.get(`/marketplace/seller-promotions/promotions/${promotionId}`);
    return response.data;
  }

  /**
   * Get promotion items
   * GET /marketplace/seller-promotions/promotions/{promotion_id}/items
   */
  async getPromotionItems(promotionId) {
    const response = await this.client.get(`/marketplace/seller-promotions/promotions/${promotionId}/items`);
    return response.data;
  }

  /**
   * Get item promotions
   * GET /marketplace/seller-promotions/items/{item_id}
   */
  async getItemPromotions(itemId) {
    const response = await this.client.get(`/marketplace/seller-promotions/items/${itemId}`);
    return response.data;
  }

  /**
   * Add item to promotion
   * POST /marketplace/seller-promotions/items/{item_id}
   */
  async addItemToPromotion(itemId, promotionData) {
    const response = await this.client.post(`/marketplace/seller-promotions/items/${itemId}`, promotionData);
    return response.data;
  }

  /**
   * Remove item from promotion
   * DELETE /marketplace/seller-promotions/items/{item_id}
   */
  async removeItemFromPromotion(itemId) {
    const response = await this.client.delete(`/marketplace/seller-promotions/items/${itemId}`);
    return response.data;
  }

  /**
   * Bulk remove item from promotions
   * DELETE /marketplace/seller-promotions/items/massive/{item_id}
   */
  async removeItemFromAllPromotions(itemId) {
    const response = await this.client.delete(`/marketplace/seller-promotions/items/massive/${itemId}`);
    return response.data;
  }

  // ============================================
  // FULFILLMENT STOCK API (Mexico & Chile only)
  // ============================================

  /**
   * Get fulfillment stock
   * GET /marketplace/inventories/{inventory_id}/stock/fulfillment
   */
  async getFulfillmentStock(inventoryId, sellerId) {
    const response = await this.client.get(`/marketplace/inventories/${inventoryId}/stock/fulfillment`, {
      params: { seller_id: sellerId },
    });
    return response.data;
  }

  /**
   * Search fulfillment operations
   * GET /marketplace/stock/fulfillment/operations/search
   */
  async searchFulfillmentOperations(sellerId, params = {}) {
    const response = await this.client.get('/marketplace/stock/fulfillment/operations/search', {
      params: { seller_id: sellerId, ...params },
    });
    return response.data;
  }

  /**
   * Get fulfillment operation
   * GET /marketplace/stock/fulfillment/operations/{operation_id}
   */
  async getFulfillmentOperation(operationId, sellerId) {
    const response = await this.client.get(`/marketplace/stock/fulfillment/operations/${operationId}`, {
      params: { seller_id: sellerId },
    });
    return response.data;
  }

  // ============================================
  // LISTINGS QUALITY API
  // ============================================

  /**
   * Get item performance/quality
   * GET /item/{item_id}/performance
   */
  async getItemPerformance(itemId) {
    const response = await this.client.get(`/item/${itemId}/performance`);
    return response.data;
  }

  // ============================================
  // PRODUCT ADS API (Marketplace)
  // ============================================

  /**
   * Get advertiser info
   * GET /advertising/advertisers?product_id=PADS
   */
  async getAdvertiser() {
    const response = await this.client.get('/advertising/advertisers', {
      params: { product_id: 'PADS' },
    });
    return response.data;
  }

  /**
   * Search ad campaigns
   * GET /marketplace/advertising/{site_id}/advertisers/{advertiser_id}/product_ads/campaigns/search
   */
  async searchAdCampaigns(siteId, advertiserId, params = {}) {
    const response = await this.client.get(
      `/marketplace/advertising/${siteId}/advertisers/${advertiserId}/product_ads/campaigns/search`,
      { params }
    );
    return response.data;
  }

  /**
   * Create ad campaign
   * POST /marketplace/advertising/{site_id}/advertisers/{advertiser_id}/product_ads/campaigns
   */
  async createAdCampaign(siteId, advertiserId, campaignData) {
    const response = await this.client.post(
      `/marketplace/advertising/${siteId}/advertisers/${advertiserId}/product_ads/campaigns`,
      campaignData
    );
    return response.data;
  }

  /**
   * Update ad campaign
   * PUT /marketplace/advertising/{site_id}/product_ads/campaigns/{campaign_id}
   */
  async updateAdCampaign(siteId, campaignId, updateData) {
    const response = await this.client.put(
      `/marketplace/advertising/${siteId}/product_ads/campaigns/${campaignId}`,
      updateData
    );
    return response.data;
  }

  /**
   * Search ads
   * GET /marketplace/advertising/{site_id}/advertisers/{advertiser_id}/product_ads/ads/search
   */
  async searchAds(siteId, advertiserId, params = {}) {
    const response = await this.client.get(
      `/marketplace/advertising/${siteId}/advertisers/${advertiserId}/product_ads/ads/search`,
      { params }
    );
    return response.data;
  }

  /**
   * Get item ad
   * GET /marketplace/advertising/{site_id}/product_ads/ads/{item_id}
   */
  async getItemAd(siteId, itemId) {
    const response = await this.client.get(`/marketplace/advertising/${siteId}/product_ads/ads/${itemId}`);
    return response.data;
  }

  /**
   * Update item ad
   * PUT /marketplace/advertising/{site_id}/product_ads/ads/{item_id}
   */
  async updateItemAd(siteId, itemId, adData) {
    const response = await this.client.put(
      `/marketplace/advertising/${siteId}/product_ads/ads/${itemId}`,
      adData
    );
    return response.data;
  }

  /**
   * Bulk update ads
   * PUT /marketplace/advertising/{site_id}/advertisers/{advertiser_id}/product_ads/ads
   */
  async bulkUpdateAds(siteId, advertiserId, adsData) {
    const response = await this.client.put(
      `/marketplace/advertising/${siteId}/advertisers/${advertiserId}/product_ads/ads`,
      adsData
    );
    return response.data;
  }

  // ============================================
  // PRICING AUTOMATION API (Marketplace)
  // ============================================

  /**
   * Get pricing rules
   * GET /marketplace/items/{item_id}/prices/automate/rules
   */
  async getPricingRules(itemId) {
    const response = await this.client.get(`/marketplace/items/${itemId}/prices/automate/rules`);
    return response.data;
  }

  /**
   * Create pricing automation
   * POST /marketplace/items/{item_id}/prices/automate
   */
  async createPricingAutomation(itemId, pricingData) {
    const response = await this.client.post(`/marketplace/items/${itemId}/prices/automate`, pricingData);
    return response.data;
  }

  /**
   * Get pricing automation
   * GET /marketplace/items/{item_id}/prices/automate
   */
  async getPricingAutomation(itemId) {
    const response = await this.client.get(`/marketplace/items/${itemId}/prices/automate`);
    return response.data;
  }

  /**
   * Update pricing automation
   * PUT /marketplace/items/{item_id}/prices/automate
   */
  async updatePricingAutomation(itemId, pricingData) {
    const response = await this.client.put(`/marketplace/items/${itemId}/prices/automate`, pricingData);
    return response.data;
  }

  /**
   * Delete pricing automation
   * DELETE /marketplace/items/{item_id}/prices/automate
   */
  async deletePricingAutomation(itemId) {
    const response = await this.client.delete(`/marketplace/items/${itemId}/prices/automate`);
    return response.data;
  }

  // ============================================
  // TRENDS API
  // ============================================

  /**
   * Get site trends
   * GET /trends/{site_id}
   */
  async getTrends(siteId) {
    const response = await this.client.get(`/trends/${siteId}`);
    return response.data;
  }

  /**
   * Get category trends
   * GET /trends/{site_id}/{category_id}
   */
  async getCategoryTrends(siteId, categoryId) {
    const response = await this.client.get(`/trends/${siteId}/${categoryId}`);
    return response.data;
  }

  // ============================================
  // VISITS API (Local items only)
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
  // PRODUCT REVIEWS API
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
   */
  async getCatalogProductReviews(itemId, catalogProductId, params = {}) {
    const response = await this.client.get(`/reviews/item/${itemId}`, {
      params: { catalog_product_id: catalogProductId, ...params },
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
   * GET /marketplace/sizechart/equivalences
   */
  async getSizeEquivalences(domainId, gender, siteId) {
    const response = await this.client.get('/marketplace/sizechart/equivalences', {
      params: { domain_id: domainId, gender, site_id: siteId },
    });
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
}

// Factory function
const createGlobalSellingService = (accessToken) => {
  return new GlobalSellingService(accessToken);
};

module.exports = {
  GlobalSellingService,
  createGlobalSellingService,
};
