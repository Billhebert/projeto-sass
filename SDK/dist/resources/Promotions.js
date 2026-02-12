"use strict";
/**
 * Recursos de Promoções
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Promotions = void 0;
class Promotions {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém promoções de um usuário
     */
    async getUserPromotions(userId, appVersion = 'v2') {
        return this.mercadoLivre.get(`/seller-promotions/users/${userId}?app_version=${appVersion}`);
    }
    /**
     * Obtém promoções de um item
     */
    async getItemPromotions(itemId, appVersion = 'v2') {
        return this.mercadoLivre.get(`/seller-promotions/items/${itemId}?app_version=${appVersion}`);
    }
    /**
     * Obtém detalhes de uma promoção
     */
    async getPromotion(promoId, promotionType, appVersion = 'v2') {
        return this.mercadoLivre.get(`/seller-promotions/promotions/${promoId}?promotion_type=${promotionType}&app_version=${appVersion}`);
    }
    /**
     * Obtém itens de uma promoção
     */
    async getPromotionItems(promoId, promotionType, appVersion = 'v2') {
        return this.mercadoLivre.get(`/seller-promotions/promotions/${promoId}/items?promotion_type=${promotionType}&app_version=${appVersion}`);
    }
    /**
     * Obtém ofertas
     */
    async getOffer(offerId) {
        return this.mercadoLivre.get(`/seller-promotions/offers/${offerId}`);
    }
    /**
     * Cria promoção
     */
    async createPromotion(data) {
        return this.mercadoLivre.post('/seller-promotions', data);
    }
    /**
     * Atualiza promoção
     */
    async updatePromotion(promoId, data) {
        return this.mercadoLivre.put(`/seller-promotions/${promoId}`, data);
    }
    /**
     * Ativa promoção
     */
    async activatePromotion(promoId) {
        return this.mercadoLivre.post(`/seller-promotions/${promoId}/activate`);
    }
    /**
     * Pausa promoção
     */
    async pausePromotion(promoId) {
        return this.mercadoLivre.post(`/seller-promotions/${promoId}/pause`);
    }
    /**
     * Finaliza promoção
     */
    async finishPromotion(promoId) {
        return this.mercadoLivre.post(`/seller-promotions/${promoId}/finish`);
    }
    /**
     * Adiciona item à promoção
     */
    async addItemToPromotion(promoId, itemId, discount) {
        return this.mercadoLivre.post(`/seller-promotions/promotions/${promoId}/items`, {
            item_id: itemId,
            ...discount,
        });
    }
    /**
     * Remove item da promoção
     */
    async removeItemFromPromotion(promoId, itemId) {
        await this.mercadoLivre.delete(`/seller-promotions/promotions/${promoId}/items/${itemId}`);
    }
}
exports.Promotions = Promotions;
exports.default = Promotions;
//# sourceMappingURL=Promotions.js.map