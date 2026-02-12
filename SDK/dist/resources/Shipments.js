"use strict";
/**
 * Recursos de Envios
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Shipments = void 0;
class Shipments {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém um envio pelo ID
     */
    async get(shipmentId) {
        return this.mercadoLivre.get(`/shipments/${shipmentId}`);
    }
    /**
     * Busca envios
     */
    async search(options) {
        const params = new URLSearchParams();
        if (options.orderId !== undefined)
            params.append('order_id', String(options.orderId));
        if (options.status)
            params.append('status', options.status);
        if (options.logisticType)
            params.append('logistic_type', options.logisticType);
        if (options.offset !== undefined)
            params.append('offset', String(options.offset));
        if (options.limit !== undefined)
            params.append('limit', String(options.limit));
        const queryString = params.toString();
        return this.mercadoLivre.get(`/shipments/search${queryString ? `?${queryString}` : ''}`);
    }
    /**
     * Obtém itens de um envio
     */
    async getItems(shipmentId) {
        return this.mercadoLivre.get(`/shipments/${shipmentId}/items`);
    }
    /**
     * Obtém pagamentos de um envio
     */
    async getPayments(shipmentId) {
        return this.mercadoLivre.get(`/shipments/${shipmentId}/payments`);
    }
    /**
     * Obtém SLA de um envio
     */
    async getSla(shipmentId) {
        return this.mercadoLivre.get(`/shipments/${shipmentId}/sla`);
    }
    /**
     * Obtém atrasos de um envio
     */
    async getDelays(shipmentId) {
        return this.mercadoLivre.get(`/shipments/${shipmentId}/delays`);
    }
    /**
     * Obtém tempo de processamento
     */
    async getLeadTime(shipmentId) {
        return this.mercadoLivre.get(`/shipments/${shipmentId}/lead_time`);
    }
    /**
     * Obtém histórico de um envio
     */
    async getHistory(shipmentId) {
        return this.mercadoLivre.get(`/shipments/${shipmentId}/history`);
    }
    /**
     * Obtém transportadora de um envio
     */
    async getCarrier(shipmentId) {
        return this.mercadoLivre.get(`/shipments/${shipmentId}/carrier`);
    }
    /**
     * Obtém notificações de um envio
     */
    async getSellerNotifications(shipmentId) {
        return this.mercadoLivre.get(`/shipments/${shipmentId}/seller_notifications`);
    }
    /**
     * Marca envio como pronto para envio
     */
    async readyToShip(shipmentId) {
        return this.mercadoLivre.post(`/shipments/${shipmentId}/process/ready_to_ship`);
    }
    /**
     * Faz split de um envio
     */
    async split(shipmentId, items) {
        return this.mercadoLivre.post(`/shipments/${shipmentId}/split`, { items });
    }
    /**
     * Obtém informações de faturamento
     */
    async getBillingInfo(shipmentId) {
        return this.mercadoLivre.get(`/shipments/${shipmentId}/billing_info`);
    }
    /**
     * Define dados de NF
     */
    async setInvoiceData(shipmentId, siteId, data) {
        return this.mercadoLivre.post(`/shipments/${shipmentId}/invoice_data?siteId=${siteId}`, data);
    }
    /**
     * Obtém todos os status de envio
     */
    async getStatuses() {
        return this.mercadoLivre.get('/shipment_statuses');
    }
    /**
     * Simula cotação
     */
    async simulateQuote(data) {
        return this.mercadoLivre.post('/shipping/me1/v1/quotation/simulate', data);
    }
    /**
     * Atualiza tarifa
     */
    async updateTariff(data) {
        return this.mercadoLivre.post('/shipping/me1/v1/tariff/update', data);
    }
    /**
     * Obtém métricas de ME1
     */
    async getMe1Metrics(siteId, dateFrom, dateTo) {
        return this.mercadoLivre.get(`/shipping/me1/sites/${siteId}/metrics?ts_from=${dateFrom}&ts_to=${dateTo}`);
    }
    /**
     * Obtém template de tarifa
     */
    async getTariffTemplate(siteId) {
        return this.mercadoLivre.get(`/shipping/me1/v1/tariff/template?site=${siteId}`);
    }
    /**
     * Obtém dias úteis
     */
    async getWorkingDayMiddleend(sellerId) {
        return this.mercadoLivre.get(`/shipping/seller/${sellerId}/working_day_middleend`);
    }
    /**
     * Obtém template de etiqueta
     */
    async getLabelTemplate(shipmentId) {
        return this.mercadoLivre.get(`/shipments/${shipmentId}/label`);
    }
    /**
     * Baixa etiqueta
     */
    async downloadLabel(shipmentId) {
        return this.mercadoLivre.get(`/shipments/${shipmentId}/label/download`);
    }
}
exports.Shipments = Shipments;
exports.default = Shipments;
//# sourceMappingURL=Shipments.js.map