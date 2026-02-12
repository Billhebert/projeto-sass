"use strict";
/**
 * Recursos de Reputação
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reputation = void 0;
class Reputation {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém reputação de um vendedor
     */
    async getSellerReputation(sellerId) {
        return this.mercadoLivre.get(`/users/${sellerId}/reputation`);
    }
    /**
     * Obtém métricas de reputação de um item
     */
    async getItemReputation(itemId) {
        return this.mercadoLivre.get(`/reputation/items/${itemId}/purchase_experience/integrators`);
    }
    /**
     * Obtém performance de um item
     */
    async getItemPerformance(itemId) {
        return this.mercadoLivre.get(`/item/${itemId}/performance`);
    }
    /**
     * Obtém performance de um user product
     */
    async getUserProductPerformance(itemId) {
        return this.mercadoLivre.get(`/user-product/${itemId}/performance`);
    }
    /**
     * Obtém reviews de um item
     */
    async getItemReviews(itemId) {
        return this.mercadoLivre.get(`/reviews/item/${itemId}`);
    }
    /**
     * Obtém status de recuperação de reputação
     */
    async getSellerRecoveryStatus(sellerId) {
        return this.mercadoLivre.get(`/users/${sellerId}/reputation/seller_recovery/status`);
    }
    /**
     * Obtém métricas de vendedores
     */
    async getSellersMetrics(sellerIds) {
        const ids = sellerIds.join(',');
        return this.mercadoLivre.get(`/users/reputation?ids=${ids}`);
    }
}
exports.Reputation = Reputation;
exports.default = Reputation;
//# sourceMappingURL=Reputation.js.map