"use strict";
/**
 * Recursos de Moderação
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Moderations = void 0;
class Moderations {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém última moderação
     */
    async getLast(moderationId) {
        return this.mercadoLivre.get(`/moderations/last_moderation/${moderationId}`);
    }
    /**
     * Busca moderações
     */
    async search(options) {
        const params = new URLSearchParams();
        if (options?.userId !== undefined)
            params.append('user_id', String(options.userId));
        if (options?.status)
            params.append('status', options.status);
        if (options?.offset !== undefined)
            params.append('offset', String(options.offset));
        if (options?.limit !== undefined)
            params.append('limit', String(options.limit));
        const queryString = params.toString();
        return this.mercadoLivre.get(`/moderations${queryString ? `?${queryString}` : ''}`);
    }
    /**
     * Obtém moderações com pausa
     */
    async getPaused(userId) {
        return this.mercadoLivre.get(`/users/${userId}/items/search?tags=moderation_penalty&status=paused`);
    }
    /**
     * Obtém diagnóstico de imagens
     */
    async getImageDiagnosis(itemId) {
        return this.mercadoLivre.get(`/items/${itemId}/pictures/diagnosis`);
    }
    /**
     * Obtém status de qualidade de catálogo
     */
    async getCatalogQualityStatus(sellerId, includeItems, version) {
        const params = new URLSearchParams({ seller_id: String(sellerId) });
        if (includeItems !== undefined)
            params.append('include_items', String(includeItems));
        if (version)
            params.append('v', version);
        return this.mercadoLivre.get(`/catalog_quality/status?${params.toString()}`);
    }
}
exports.Moderations = Moderations;
exports.default = Moderations;
//# sourceMappingURL=Moderations.js.map