"use strict";
/**
 * Recursos de Usuários
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Users = void 0;
class Users {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém informações do usuário atual
     */
    async getMe() {
        return this.mercadoLivre.get('/users/me');
    }
    /**
     * Obtém informações de um usuário específico
     */
    async get(userId) {
        return this.mercadoLivre.get(`/users/${userId}`);
    }
    /**
     * Busca usuários por IDs
     */
    async getByIds(userIds) {
        const ids = userIds.join(',');
        const result = await this.mercadoLivre.get(`/users?ids=${ids}`);
        return result.users;
    }
    /**
     * Obtém endereços de um usuário
     */
    async getAddresses(userId) {
        return this.mercadoLivre.get(`/users/${userId}/addresses`);
    }
    /**
     * Obtém itens de um usuário
     */
    async getItems(userId, options) {
        const params = new URLSearchParams();
        if (options?.offset)
            params.append('offset', options.offset.toString());
        if (options?.limit)
            params.append('limit', options.limit.toString());
        const queryString = params.toString();
        const url = `/users/${userId}/items${queryString ? `?${queryString}` : ''}`;
        return this.mercadoLivre.get(url);
    }
    /**
     * Busca itens de um usuário com filtros
     */
    async searchItems(userId, filters) {
        const params = new URLSearchParams();
        if (filters?.searchType)
            params.append('search_type', filters.searchType);
        if (filters?.sku)
            params.append('sku', filters.sku);
        if (filters?.status)
            params.append('status', filters.status);
        if (filters?.tags)
            params.append('tags', filters.tags);
        if (filters?.catalogListing !== undefined)
            params.append('catalog_listing', String(filters.catalogListing));
        const queryString = params.toString();
        const url = `/users/${userId}/items/search${queryString ? `?${queryString}` : ''}`;
        return this.mercadoLivre.get(url);
    }
    /**
     * Verifica se usuário está bloqueado
     */
    async isBlocked(userId) {
        try {
            await this.mercadoLivre.get(`/block-api/search/users/${userId}`);
            return false;
        }
        catch (error) {
            if (error.statusCode === 404)
                return true;
            throw error;
        }
    }
    /**
     * Obtém marcas de um usuário
     */
    async getBrands(userId) {
        return this.mercadoLivre.get(`/users/${userId}/brands`);
    }
    /**
     * Obtém tempo médio de resposta às perguntas
     */
    async getResponseTime(userId) {
        return this.mercadoLivre.get(`/users/${userId}/questions/response_time`);
    }
    /**
     * Obtém preferências de envio de um usuário
     */
    async getShippingPreferences(userId) {
        return this.mercadoLivre.get(`/users/${userId}/shipping_preferences`);
    }
    /**
     * Obtém opções de envio gratuitas
     */
    async getFreeShippingOptions(userId, options) {
        const params = new URLSearchParams();
        if (options?.dimensions)
            params.append('dimensions', options.dimensions);
        if (options?.verbose)
            params.append('verbose', String(options.verbose));
        if (options?.itemPrice)
            params.append('item_price', String(options.itemPrice));
        if (options?.listingTypeId)
            params.append('listing_type_id', options.listingTypeId);
        if (options?.mode)
            params.append('mode', options.mode);
        if (options?.condition)
            params.append('condition', options.condition);
        if (options?.logisticType)
            params.append('logistic_type', options.logisticType);
        const queryString = params.toString();
        const url = `/users/${userId}/shipping_options/free${queryString ? `?${queryString}` : ''}`;
        return this.mercadoLivre.get(url);
    }
    /**
     * Obtém capacidade de fulfillment
     */
    async getCapacityMiddleend(userId, logisticType) {
        const url = logisticType
            ? `/users/${userId}/capacity_middleend/${logisticType}`
            : `/users/${userId}/capacity_middleend`;
        return this.mercadoLivre.get(url);
    }
    /**
     * Obtém agenda de envio
     */
    async getShippingSchedule(userId, logisticType) {
        return this.mercadoLivre.get(`/users/${userId}/shipping/schedule/${logisticType}`);
    }
    /**
     * Busca componentes de kits
     */
    async searchKitComponents(sellerId, searchText, limit) {
        const params = new URLSearchParams({ searchText });
        if (limit)
            params.append('limit', String(limit));
        const queryString = params.toString();
        return this.mercadoLivre.get(`/users/${sellerId}/kits/components/search?${queryString}`);
    }
    /**
     * Obtém ranking de recuperação de reputação
     */
    async getSellerRecoveryStatus(userId) {
        return this.mercadoLivre.get(`/users/${userId}/reputation/seller_recovery/status`);
    }
}
exports.Users = Users;
exports.default = Users;
//# sourceMappingURL=Users.js.map