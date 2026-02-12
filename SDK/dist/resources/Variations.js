"use strict";
/**
 * Recursos de Variações (exportado como objeto com funções)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.variations = variations;
function variations(mercadoLivre) {
    return {
        /**
         * Obtém variação de um item
         */
        async get(itemId, variationId) {
            return mercadoLivre.get(`/items/${itemId}/variations/${variationId}`);
        },
        /**
         * Lista variações de um item
         */
        async list(itemId) {
            return mercadoLivre.get(`/items/${itemId}/variations`);
        },
        /**
         * Cria variação
         */
        async create(itemId, variation) {
            return mercadoLivre.post(`/items/${itemId}/variations`, variation);
        },
        /**
         * Atualiza variação
         */
        async update(itemId, variationId, data) {
            return mercadoLivre.put(`/items/${itemId}/variations/${variationId}`, data);
        },
        /**
         * Remove variação
         */
        async delete(itemId, variationId) {
            await mercadoLivre.delete(`/items/${itemId}/variations/${variationId}`);
        },
        /**
         * Atualiza estoque de variação
         */
        async updateStock(itemId, variationId, quantity) {
            return mercadoLivre.put(`/items/${itemId}/variations/${variationId}`, {
                available_quantity: quantity,
            });
        },
        /**
         * Atualiza preço de variação
         */
        async updatePrice(itemId, variationId, price) {
            return mercadoLivre.put(`/items/${itemId}/variations/${variationId}`, {
                price,
            });
        },
    };
}
exports.default = variations;
//# sourceMappingURL=Variations.js.map