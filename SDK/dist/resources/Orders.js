"use strict";
/**
 * Recursos de Pedidos
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orders = void 0;
class Orders {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém um pedido pelo ID
     */
    async get(orderId) {
        return this.mercadoLivre.get(`/orders/${orderId}`);
    }
    /**
     * Busca pedidos
     */
    async search(options) {
        const params = new URLSearchParams();
        if (options.seller !== undefined)
            params.append('seller', String(options.seller));
        if (options.buyer !== undefined)
            params.append('buyer', String(options.buyer));
        if (options.status)
            params.append('order.status', options.status);
        if (options.orderId)
            params.append('q', options.orderId);
        if (options.dateCreated)
            params.append('order.date_created.from', options.dateCreated);
        if (options.dateLastUpdated)
            params.append('order.date_last_updated.from', options.dateLastUpdated);
        if (options.offset !== undefined)
            params.append('offset', String(options.offset));
        if (options.limit !== undefined)
            params.append('limit', String(options.limit));
        const queryString = params.toString();
        return this.mercadoLivre.get(`/orders/search${queryString ? `?${queryString}` : ''}`);
    }
    /**
     * Obtém pedidos de um vendedor
     */
    async getBySeller(sellerId, options) {
        const params = new URLSearchParams({ seller: String(sellerId) });
        if (options?.offset)
            params.append('offset', String(options.offset));
        if (options?.limit)
            params.append('limit', String(options.limit));
        return this.mercadoLivre.get(`/orders/search?${params.toString()}`);
    }
    /**
     * Obtém pedidos de um comprador
     */
    async getByBuyer(buyerId, options) {
        const params = new URLSearchParams({ buyer: String(buyerId) });
        if (options?.offset)
            params.append('offset', String(options.offset));
        if (options?.limit)
            params.append('limit', String(options.limit));
        return this.mercadoLivre.get(`/orders/search?${params.toString()}`);
    }
    /**
     * Obtém pedidos pagos
     */
    async getPaid(sellerId, options) {
        const params = new URLSearchParams({ seller: String(sellerId) });
        params.append('order.status', 'paid');
        if (options?.offset)
            params.append('offset', String(options.offset));
        if (options?.limit)
            params.append('limit', String(options.limit));
        return this.mercadoLivre.get(`/orders/search?${params.toString()}`);
    }
    /**
     * Obtém itens de um pedido
     */
    async getItems(orderId) {
        return this.mercadoLivre.get(`/orders/${orderId}/items`);
    }
    /**
     * Obtém desconto de um pedido
     */
    async getDiscounts(orderId) {
        return this.mercadoLivre.get(`/orders/${orderId}/discounts`);
    }
    /**
     * Obtém informações de feedback
     */
    async getFeedback(orderId) {
        return this.mercadoLivre.get(`/orders/${orderId}/feedback`);
    }
    /**
     * Cria feedback de venda
     */
    async createSaleFeedback(orderId, feedback) {
        return this.mercadoLivre.post(`/orders/${orderId}/feedback/sale`, feedback);
    }
    /**
     * Cria feedback de compra
     */
    async createPurchaseFeedback(orderId, feedback) {
        return this.mercadoLivre.post(`/orders/${orderId}/feedback/purchase`, feedback);
    }
    /**
     * Obtém notas de um pedido
     */
    async getNotes(orderId) {
        return this.mercadoLivre.get(`/orders/${orderId}/notes`);
    }
    /**
     * Cria nota em pedido
     */
    async createNote(orderId, note) {
        return this.mercadoLivre.post(`/orders/${orderId}/notes`, { note });
    }
    /**
     * Atualiza nota em pedido
     */
    async updateNote(orderId, noteId, note) {
        return this.mercadoLivre.put(`/orders/${orderId}/notes/${noteId}`, { note });
    }
    /**
     * Remove nota de pedido
     */
    async deleteNote(orderId, noteId) {
        await this.mercadoLivre.delete(`/orders/${orderId}/notes/${noteId}`);
    }
    /**
     * Obtém envios de um pedido
     */
    async getShipments(orderId) {
        return this.mercadoLivre.get(`/orders/${orderId}/shipments`);
    }
    /**
     * Obtém produto de um pedido
     */
    async getProduct(orderId) {
        return this.mercadoLivre.get(`/orders/${orderId}/product`);
    }
    /**
     * Obtém informações de faturamento
     */
    async getBillingInfo(orderId, siteId, billingInfoId) {
        return this.mercadoLivre.get(`/orders/${orderId}/billing-info/${siteId}/${billingInfoId}`);
    }
    /**
     * Cancela um pedido
     */
    async cancel(orderId, reason) {
        return this.mercadoLivre.post(`/orders/${orderId}/cancel`, { reason });
    }
    /**
     * Adiciona/remover itens do carrinho
     */
    async addItem(orderId, itemId, quantity) {
        return this.mercadoLivre.post(`/orders/${orderId}/items`, {
            id: itemId,
            quantity,
        });
    }
    /**
     * Remove item do carrinho
     */
    async removeItem(orderId, itemId) {
        await this.mercadoLivre.delete(`/orders/${orderId}/items/${itemId}`);
    }
}
exports.Orders = Orders;
exports.default = Orders;
//# sourceMappingURL=Orders.js.map