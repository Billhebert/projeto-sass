/**
 * Recursos de Fulfillment (exportado como objeto com funções)
 */

import { MercadoLivre } from '../MercadoLivre';

export function fulfillment(mercadoLivre: MercadoLivre) {
  return {
    /**
     * Obtém inventário de fulfillment
     */
    async getInventory(inventoryId: string): Promise<any> {
      return mercadoLivre.get(`/inventories/${inventoryId}/stock/fulfillment`);
    },

    /**
     * Obtém inventário com atributos
     */
    async getInventoryWithAttributes(inventoryId: string): Promise<any> {
      return mercadoLivre.get(`/inventories/${inventoryId}/stock/fulfillment?include_attributes=conditions`);
    },

    /**
     * Atualiza estoque de fulfillment
     */
    async updateStock(inventoryId: string, stock: any): Promise<any> {
      return mercadoLivre.put(`/inventories/${inventoryId}/stock/fulfillment`, stock);
    },

    /**
     * Busca operações de fulfillment
     */
    async searchOperations(options: {
      sellerId: number | string;
      inventoryId?: string;
      dateFrom?: string;
      dateTo?: string;
    }): Promise<any> {
      const params = new URLSearchParams({
        seller_id: String(options.sellerId),
      });
      if (options.inventoryId) params.append('inventory_id', options.inventoryId);
      if (options.dateFrom) params.append('date_from', options.dateFrom);
      if (options.dateTo) params.append('date_to', options.dateTo);

      return mercadoLivre.get(`/stock/fulfillment/operations/search?${params.toString()}`);
    },

    /**
     * Obtém capacidade de fulfillment
     */
    async getCapacityMiddleend(userId: number | string, logisticType: string = 'cross_docking'): Promise<any> {
      return mercadoLivre.get(`/users/${userId}/capacity_middleend/${logisticType}`);
    },

    /**
     * Obtém capacidade de node
     */
    async getNodeCapacity(networkNodeId: string): Promise<any> {
      return mercadoLivre.get(`/nodes/${networkNodeId}/capacity_middleend`);
    },

    /**
     * Obtém métricas de ME1
     */
    async getMe1Metrics(siteId: string, dateFrom: string, dateTo: string): Promise<any> {
      return mercadoLivre.get(
        `/shipping/me1/sites/${siteId}/metrics?ts_from=${dateFrom}&ts_to=${dateTo}`
      );
    },

    /**
     * Simula cotação
     */
    async simulateQuotation(data: {
      dimensions: string;
      weight: number;
      zipCode: string;
      itemPrice?: number;
      listingTypeId?: string;
    }): Promise<any> {
      return mercadoLivre.post('/shipping/me1/v1/quotation/simulate', data);
    },

    /**
     * Atualiza tarifa
     */
    async updateTariff(data: any): Promise<any> {
      return mercadoLivre.post('/shipping/me1/v1/tariff/update', data);
    },

    /**
     * Obtém template de tarifa
     */
    async getTariffTemplate(siteId: string): Promise<any> {
      return mercadoLivre.get(`/shipping/me1/v1/tariff/template?site=${siteId}`);
    },
  };
}

export default fulfillment;
