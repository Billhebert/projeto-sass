/**
 * Mercado Libre SDK Service
 * Wrapper para o novo SDK com métodos úteis para o projeto
 */

const { getSDK, setTokens } = require('../sdk');
const logger = require('../logger');

class MercadoLibreSDKService {
  constructor() {
    this.sdk = getSDK();
  }

  /**
   * Atualiza tokens do SDK
   */
  updateTokens(tokens) {
    setTokens(tokens);
    this.sdk = getSDK();
  }

  // ==================== USUÁRIOS ====================
  async getUserInfo() {
    try {
      return await this.sdk.users.getUserInfo();
    } catch (error) {
      logger.error('Erro ao obter informações do usuário', { error: error.message });
      throw error;
    }
  }

  async getUser(userId) {
    try {
      return await this.sdk.users.getUser(userId);
    } catch (error) {
      logger.error('Erro ao obter usuário', { userId, error: error.message });
      throw error;
    }
  }

  // ==================== PRODUTOS/ITENS ====================
  async getItem(itemId) {
    try {
      return await this.sdk.items.getItem(itemId);
    } catch (error) {
      logger.error('Erro ao obter item', { itemId, error: error.message });
      throw error;
    }
  }

  async getItemWithDescription(itemId) {
    try {
      return await this.sdk.items.getItemWithDescription(itemId);
    } catch (error) {
      logger.error('Erro ao obter item com descrição', { itemId, error: error.message });
      throw error;
    }
  }

  async createItem(itemData) {
    try {
      const validated = await this.sdk.items.validateItem(itemData);
      if (!validated.valid) {
        throw new Error(`Item validation failed: ${JSON.stringify(validated.errors)}`);
      }
      return await this.sdk.items.createItem(itemData);
    } catch (error) {
      logger.error('Erro ao criar item', { error: error.message });
      throw error;
    }
  }

  async updateItem(itemId, itemData) {
    try {
      return await this.sdk.items.updateItem(itemId, itemData);
    } catch (error) {
      logger.error('Erro ao atualizar item', { itemId, error: error.message });
      throw error;
    }
  }

  async deleteItem(itemId) {
    try {
      return await this.sdk.items.deleteItem(itemId);
    } catch (error) {
      logger.error('Erro ao deletar item', { itemId, error: error.message });
      throw error;
    }
  }

  async searchItems(params) {
    try {
      return await this.sdk.items.searchItems(params);
    } catch (error) {
      logger.error('Erro ao buscar itens', { params, error: error.message });
      throw error;
    }
  }

  async getItemsByUser(userId, params = {}) {
    try {
      return await this.sdk.items.getItemsByUser(userId, params);
    } catch (error) {
      logger.error('Erro ao obter itens do usuário', { userId, error: error.message });
      throw error;
    }
  }

  // ==================== IMAGENS ====================
  async uploadItemImage(itemId, imageData) {
    try {
      return await this.sdk.images.uploadItemImage(itemId, imageData);
    } catch (error) {
      logger.error('Erro ao upload de imagem', { itemId, error: error.message });
      throw error;
    }
  }

  // ==================== CATEGORIAS ====================
  async getCategories() {
    try {
      return await this.sdk.categories.getCategories();
    } catch (error) {
      logger.error('Erro ao obter categorias', { error: error.message });
      throw error;
    }
  }

  async getCategory(categoryId) {
    try {
      return await this.sdk.categories.getCategory(categoryId);
    } catch (error) {
      logger.error('Erro ao obter categoria', { categoryId, error: error.message });
      throw error;
    }
  }

  async getCategoryAttributes(categoryId) {
    try {
      return await this.sdk.categories.getCategoryAttributes(categoryId);
    } catch (error) {
      logger.error('Erro ao obter atributos da categoria', { categoryId, error: error.message });
      throw error;
    }
  }

  // ==================== PEDIDOS ====================
  async getOrder(orderId) {
    try {
      return await this.sdk.orders.getOrder(orderId);
    } catch (error) {
      logger.error('Erro ao obter pedido', { orderId, error: error.message });
      throw error;
    }
  }

  async getUserOrders(userId, params = {}) {
    try {
      return await this.sdk.orders.getUserOrders(userId, params);
    } catch (error) {
      logger.error('Erro ao obter pedidos do usuário', { userId, error: error.message });
      throw error;
    }
  }

  async searchOrders(params) {
    try {
      return await this.sdk.orders.searchOrders(params);
    } catch (error) {
      logger.error('Erro ao buscar pedidos', { params, error: error.message });
      throw error;
    }
  }

  // ==================== SHIPMENTS ====================
  async getShipment(shipmentId) {
    try {
      return await this.sdk.shipments.getShipment(shipmentId);
    } catch (error) {
      logger.error('Erro ao obter envio', { shipmentId, error: error.message });
      throw error;
    }
  }

  async createShipment(shipmentData) {
    try {
      return await this.sdk.shipments.createShipment(shipmentData);
    } catch (error) {
      logger.error('Erro ao criar envio', { error: error.message });
      throw error;
    }
  }

  // ==================== MERCADO PAGO ====================
  async createPayment(paymentData) {
    try {
      return await this.sdk.mpPayments.createPayment(paymentData);
    } catch (error) {
      logger.error('Erro ao criar pagamento', { error: error.message });
      throw error;
    }
  }

  async getPayment(paymentId) {
    try {
      return await this.sdk.mpPayments.getPayment(paymentId);
    } catch (error) {
      logger.error('Erro ao obter pagamento', { paymentId, error: error.message });
      throw error;
    }
  }

  async createCustomer(customerData) {
    try {
      return await this.sdk.mpCustomers.createCustomer(customerData);
    } catch (error) {
      logger.error('Erro ao criar cliente', { error: error.message });
      throw error;
    }
  }

  async getCustomer(customerId) {
    try {
      return await this.sdk.mpCustomers.getCustomer(customerId);
    } catch (error) {
      logger.error('Erro ao obter cliente', { customerId, error: error.message });
      throw error;
    }
  }

  // ==================== VARIAÇÕES ====================
  async getItemVariations(itemId) {
    try {
      return await this.sdk.variations.getItemVariations(itemId);
    } catch (error) {
      logger.error('Erro ao obter variações do item', { itemId, error: error.message });
      throw error;
    }
  }

  async createVariation(itemId, variationData) {
    try {
      return await this.sdk.variations.createVariation(itemId, variationData);
    } catch (error) {
      logger.error('Erro ao criar variação', { itemId, error: error.message });
      throw error;
    }
  }

  // ==================== ACESSO DIRETO AO SDK ====================
  getSDKInstance() {
    return this.sdk;
  }
}

// Exporta uma instância singleton
module.exports = new MercadoLibreSDKService();
