"use strict";
/**
 * Recursos de Feedback
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Feedback = void 0;
class Feedback {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém feedback de um pedido
     */
    async getFromOrder(orderId) {
        return this.mercadoLivre.get(`/orders/${orderId}/feedback`);
    }
    /**
     * Obtém feedback pelo ID
     */
    async get(feedbackId) {
        return this.mercadoLivre.get(`/feedback/${feedbackId}`);
    }
    /**
     * Obtém resposta do feedback
     */
    async getReply(feedbackId) {
        return this.mercadoLivre.get(`/feedback/${feedbackId}/reply`);
    }
    /**
     * Cria resposta para feedback
     */
    async reply(feedbackId, message) {
        return this.mercadoLivre.post(`/feedback/${feedbackId}/reply`, { message });
    }
    /**
     * Atualiza resposta de feedback
     */
    async updateReply(feedbackId, message) {
        return this.mercadoLivre.put(`/feedback/${feedbackId}/reply`, { message });
    }
    /**
     * Remove resposta de feedback
     */
    async deleteReply(feedbackId) {
        await this.mercadoLivre.delete(`/feedback/${feedbackId}/reply`);
    }
    /**
     * Obtém reviews de um item
     */
    async getItemReviews(itemId) {
        return this.mercadoLivre.get(`/reviews/item/${itemId}`);
    }
}
exports.Feedback = Feedback;
exports.default = Feedback;
//# sourceMappingURL=Feedback.js.map