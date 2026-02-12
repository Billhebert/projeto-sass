"use strict";
/**
 * Recursos de Fulfillment (exportado como objeto com funções)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fulfillment = fulfillment;
function fulfillment(mercadoLivre) {
    return {
        /**
         * Obtém inventário de fulfillment
         */
        async getInventory(inventoryId) {
            return mercadoLivre.get(`/inventories/${inventoryId}/stock/fulfillment`);
        },
        /**
         * Obtém inventário com atributos
         */
        async getInventoryWithAttributes(inventoryId) {
            return mercadoLivre.get(`/inventories/${inventoryId}/stock/fulfillment?include_attributes=conditions`);
        },
        /**
         * Atualiza estoque de fulfillment
         */
        async updateStock(inventoryId, stock) {
            return mercadoLivre.put(`/inventories/${inventoryId}/stock/fulfillment`, stock);
        },
        /**
         * Busca operações de fulfillment
         */
        async searchOperations(options) {
            const params = new URLSearchParams({
                seller_id: String(options.sellerId),
            });
            if (options.inventoryId)
                params.append('inventory_id', options.inventoryId);
            if (options.dateFrom)
                params.append('date_from', options.dateFrom);
            if (options.dateTo)
                params.append('date_to', options.dateTo);
            return mercadoLivre.get(`/stock/fulfillment/operations/search?${params.toString()}`);
        },
        /**
         * Obtém capacidade de fulfillment
         */
        async getCapacityMiddleend(userId, logisticType = 'cross_docking') {
            return mercadoLivre.get(`/users/${userId}/capacity_middleend/${logisticType}`);
        },
        /**
         * Obtém capacidade de node
         */
        async getNodeCapacity(networkNodeId) {
            return mercadoLivre.get(`/nodes/${networkNodeId}/capacity_middleend`);
        },
        /**
         * Obtém métricas de ME1
         */
        async getMe1Metrics(siteId, dateFrom, dateTo) {
            return mercadoLivre.get(`/shipping/me1/sites/${siteId}/metrics?ts_from=${dateFrom}&ts_to=${dateTo}`);
        },
        /**
         * Simula cotação
         */
        async simulateQuotation(data) {
            return mercadoLivre.post('/shipping/me1/v1/quotation/simulate', data);
        },
        /**
         * Atualiza tarifa
         */
        async updateTariff(data) {
            return this.mercadoLivre.post('/shipping/me1/v1/tariff/update', data);
        },
        /**
         * Obtém template de tarifa
         */
        async getTariffTemplate(siteId) {
            return mercadoLivre.get(`/shipping/me1/v1/tariff/template?site=${siteId}`);
        },
    };
}
exports.default = fulfillment;
//# sourceMappingURL=Fulfillment.js.map