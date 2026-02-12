"use strict";
/**
 * Recursos de Favoritos
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Favorites = void 0;
class Favorites {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Lista favoritos
     */
    async list(options) {
        const params = new URLSearchParams();
        if (options?.offset)
            params.append('offset', String(options.offset));
        if (options?.limit)
            params.append('limit', String(options.limit));
        const queryString = params.toString();
        return this.mercadoLivre.get(`/favorites${queryString ? `?${queryString}` : ''}`);
    }
    /**
     * Adiciona favorito
     */
    async add(itemId) {
        return this.mercadoLivre.post('/favorites', { item_id: itemId });
    }
    /**
     * Remove favorito
     */
    async remove(itemId) {
        await this.mercadoLivre.delete(`/favorites/${itemId}`);
    }
    /**
     * Verifica se é favorito
     */
    async isFavorite(itemId) {
        try {
            await this.mercadoLivre.get(`/favorites/${itemId}`);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.Favorites = Favorites;
exports.default = Favorites;
//# sourceMappingURL=Favorites.js.map