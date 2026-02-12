"use strict";
/**
 * Recursos de Fotos
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pictures = void 0;
class Pictures {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Faz upload de foto para item
     */
    async uploadForItem(itemId, source) {
        return this.mercadoLivre.post(`/pictures/items/upload`, {
            item_id: itemId,
            source,
        });
    }
    /**
     * Adiciona foto a um item
     */
    async addToItem(itemId, source) {
        return this.mercadoLivre.post(`/items/${itemId}/pictures`, { source });
    }
    /**
     * Remove foto de um item
     */
    async removeFromItem(itemId, pictureId) {
        await this.mercadoLivre.delete(`/items/${itemId}/pictures/${pictureId}`);
    }
    /**
     * Obtém fotos de um item
     */
    async getFromItem(itemId) {
        return this.mercadoLivre.get(`/items/${itemId}/pictures`);
    }
    /**
     * Faz upload de foto para certificação
     */
    async uploadForCertifier(options) {
        const params = new URLSearchParams({
            sellerId: String(options.sellerId),
            categoryId: options.categoryId,
        });
        if (options.status)
            params.append('status', options.status);
        if (options.offset !== undefined)
            params.append('offset', String(options.offset));
        if (options.limit !== undefined)
            params.append('limit', String(options.limit));
        return this.mercadoLivre.get(`/picture-certifier/integrator/items?${params.toString()}`);
    }
}
exports.Pictures = Pictures;
exports.default = Pictures;
//# sourceMappingURL=Pictures.js.map