"use strict";
/**
 * Recursos de Perguntas e Respostas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Questions = void 0;
class Questions {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém uma pergunta pelo ID
     */
    async get(questionId) {
        return this.mercadoLivre.get(`/questions/${questionId}`);
    }
    /**
     * Busca perguntas
     */
    async search(options) {
        const params = new URLSearchParams();
        if (options.itemId)
            params.append('item', options.itemId);
        if (options.sellerId !== undefined)
            params.append('seller_id', String(options.sellerId));
        if (options.buyerId !== undefined)
            params.append('buyer_id', String(options.buyerId));
        if (options.status)
            params.append('status', options.status);
        if (options.offset !== undefined)
            params.append('offset', String(options.offset));
        if (options.limit !== undefined)
            params.append('limit', String(options.limit));
        const queryString = params.toString();
        return this.mercadoLivre.get(`/questions/search${queryString ? `?${queryString}` : ''}`);
    }
    /**
     * Obtém perguntas de um item
     */
    async getByItem(itemId) {
        return this.search({ itemId });
    }
    /**
     * Obtém perguntas de um vendedor
     */
    async getBySeller(sellerId, options) {
        return this.search({ sellerId, ...options });
    }
    /**
     * Obtém minhas perguntas recebidas
     */
    async getMyReceived(options) {
        const params = new URLSearchParams();
        if (options?.offset)
            params.append('offset', String(options.offset));
        if (options?.limit)
            params.append('limit', String(options.limit));
        const queryString = params.toString();
        return this.mercadoLivre.get(`/my/received_questions/search${queryString ? `?${queryString}` : ''}`);
    }
    /**
     * Cria uma pergunta
     */
    async create(itemId, text) {
        return this.mercadoLivre.post('/questions', {
            item_id: itemId,
            text,
        });
    }
    /**
     * Responde uma pergunta
     */
    async answer(questionId, text) {
        return this.mercadoLivre.post(`/questions/${questionId}/answer`, { text });
    }
    /**
     * Atualiza resposta de uma pergunta
     */
    async updateAnswer(questionId, text) {
        return this.mercadoLivre.put(`/questions/${questionId}/answer`, { text });
    }
    /**
     * Remove resposta de uma pergunta
     */
    async deleteAnswer(questionId) {
        await this.mercadoLivre.delete(`/questions/${questionId}/answer`);
    }
    /**
     * Exclui uma pergunta
     */
    async delete(questionId) {
        await this.mercadoLivre.delete(`/questions/${questionId}`);
    }
    /**
     * Bloqueia pergunta
     */
    async block(questionId) {
        return this.mercadoLivre.post(`/questions/${questionId}/block`);
    }
    /**
     * Desbloqueia pergunta
     */
    async unblock(questionId) {
        return this.mercadoLivre.post(`/questions/${questionId}/unblock`);
    }
    /**
     * Obtém lista de bloqueados
     */
    async getBlocked() {
        return this.mercadoLivre.get('/users/{{user_id}}/blocked');
    }
}
exports.Questions = Questions;
exports.default = Questions;
//# sourceMappingURL=Questions.js.map