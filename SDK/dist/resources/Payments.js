"use strict";
/**
 * Recursos de Pagamentos
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payments = void 0;
class Payments {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém um pagamento pelo ID (Mercado Livre)
     */
    async get(paymentId) {
        return this.mercadoLivre.get(`/payments/${paymentId}`);
    }
    /**
     * Obtém método de pagamento
     */
    async getMethod(siteId, methodId) {
        return this.mercadoLivre.get(`/sites/${siteId}/payment_methods/${methodId}`);
    }
    /**
     * Lista métodos de pagamento
     */
    async listMethods(siteId) {
        return this.mercadoLivre.get(`/sites/${siteId}/payment_methods`);
    }
    /**
     * Obtém pagamento do Mercado Pago
     */
    async getMercadoPago(paymentId) {
        return this.mercadoLivre.get(`https://api.mercadopago.com/v1/payments/${paymentId}`);
    }
    /**
     * Cria pagamento
     */
    async create(data) {
        return this.mercadoLivre.post('/payments', data);
    }
    /**
     * Atualiza pagamento
     */
    async update(paymentId, data) {
        return this.mercadoLivre.put(`/payments/${paymentId}`, data);
    }
    /**
     * Cancela pagamento
     */
    async cancel(paymentId) {
        return this.mercadoLivre.post(`/payments/${paymentId}/cancel`);
    }
    /**
     * Estorna pagamento
     */
    async refund(paymentId, amount) {
        const body = amount ? { amount } : {};
        return this.mercadoLivre.post(`/payments/${paymentId}/refunds`, body);
    }
    /**
     * Obtém refunds de um pagamento
     */
    async getRefunds(paymentId) {
        return this.mercadoLivre.get(`/payments/${paymentId}/refunds`);
    }
    /**
     * Obtém dados de transaction
     */
    async getTransactionDetails(paymentId) {
        return this.mercadoLivre.get(`/payments/${paymentId}/transaction_details`);
    }
}
exports.Payments = Payments;
exports.default = Payments;
//# sourceMappingURL=Payments.js.map