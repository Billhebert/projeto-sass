"use strict";
/**
 * Recursos de Items e Publicações
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Items = void 0;
class Items {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém um item pelo ID
     */
    async get(itemId) {
        return this.mercadoLivre.get(`/items/${itemId}`);
    }
    /**
     * Obtém múltiplos itens pelos IDs
     */
    async getByIds(itemIds, attributes) {
        const params = new URLSearchParams({ ids: itemIds.join(',') });
        if (attributes && attributes.length > 0) {
            params.append('attributes', attributes.join(','));
        }
        return this.mercadoLivre.get(`/items?${params.toString()}`);
    }
    /**
     * Cria um novo item
     */
    async create(item) {
        return this.mercadoLivre.post('/items', item);
    }
    /**
     * Atualiza um item
     */
    async update(itemId, item) {
        return this.mercadoLivre.put(`/items/${itemId}`, item);
    }
    /**
     * Fecha uma publicação
     */
    async close(itemId) {
        return this.mercadoLivre.post(`/items/${itemId}/close`);
    }
    /**
     * Pausa uma publicação
     */
    async pause(itemId) {
        return this.mercadoLivre.post(`/items/${itemId}/pause`);
    }
    /**
     * Reativa uma publicação pausada
     */
    async activate(itemId) {
        return this.mercadoLivre.post(`/items/${itemId}/activate`);
    }
    /**
     * Remove uma publicação
     */
    async delete(itemId) {
        await this.mercadoLivre.delete(`/items/${itemId}`);
    }
    /**
     * Obtém a descrição de um item
     */
    async getDescription(itemId) {
        return this.mercadoLivre.get(`/items/${itemId}/description`);
    }
    /**
     * Cria/atualiza a descrição de um item
     */
    async setDescription(itemId, text, plainText) {
        const body = { text };
        if (plainText)
            body.plain_text = plainText;
        return this.mercadoLivre.put(`/items/${itemId}/description`, body);
    }
    /**
     * Obtém fotos de um item
     */
    async getPictures(itemId) {
        return this.mercadoLivre.get(`/items/${itemId}/pictures`);
    }
    /**
     * Adiciona foto a um item
     */
    async uploadPicture(itemId, picture) {
        return this.mercadoLivre.post(`/items/${itemId}/pictures`, picture);
    }
    /**
     * Remove foto de um item
     */
    async deletePicture(itemId, pictureId) {
        await this.mercadoLivre.delete(`/items/${itemId}/pictures/${pictureId}`);
    }
    /**
     * Obtém downgrades disponíveis
     */
    async getAvailableDowngrades(itemId) {
        return this.mercadoLivre.get(`/items/${itemId}/available_downgrades`);
    }
    /**
     * Obtém preços de um item
     */
    async getPrices(itemId) {
        return this.mercadoLivre.get(`/items/${itemId}/prices`);
    }
    /**
     * Define preço de venda
     */
    async setSalePrice(itemId, price, context) {
        const body = { price };
        if (context)
            body.context = context;
        return this.mercadoLivre.post(`/items/${itemId}/sale_price`, body);
    }
    /**
     * Remove preço de venda
     */
    async deleteSalePrice(itemId) {
        await this.mercadoLivre.delete(`/items/${itemId}/sale_price`);
    }
    /**
     * Obtém opções de envio
     */
    async getShippingOptions(itemId, zipCode) {
        return this.mercadoLivre.get(`/items/${itemId}/shipping_options?zip_code=${zipCode}`);
    }
    /**
     * Obtém bundle de preços
     */
    async getBundlePrices(itemId) {
        return this.mercadoLivre.get(`/items/${itemId}/bundle/prices_configuration`);
    }
    /**
     * Obtém informações fiscais
     */
    async getFiscalInformation(itemId) {
        return this.mercadoLivre.get(`/items/${itemId}/fiscal_information/detail`);
    }
    /**
     * Define informações fiscais
     */
    async setFiscalInformation(itemId, data) {
        return this.mercadoLivre.post(`/items/${itemId}/fiscal_information`, data);
    }
    /**
     * Verifica se pode emitir nota fiscal
     */
    async canInvoice(itemId) {
        return this.mercadoLivre.get(`/can_invoice/items/${itemId}`);
    }
    /**
     * Obtém lista de SKUs com informações fiscais
     */
    async getFiscalInformationBySku(sku) {
        return this.mercadoLivre.get(`/items/fiscal_information/${sku}`);
    }
    /**
     * Calcula preço para vencer concorrência
     */
    async getPriceToWin(itemId, siteId, version) {
        const params = new URLSearchParams();
        if (siteId)
            params.append('site_id', siteId);
        if (version)
            params.append('version', version);
        const queryString = params.toString();
        return this.mercadoLivre.get(`/items/${itemId}/price_to_win${queryString ? `?${queryString}` : ''}`);
    }
    /**
     * Valida um item antes de publicar
     */
    async validate(item) {
        return this.mercadoLivre.post('/items/validate', item);
    }
    /**
     * Relista um item
     */
    async relist(itemId, options) {
        return this.mercadoLivre.post(`/items/${itemId}/relist`, options);
    }
    /**
     * Atualiza variação
     */
    async updateVariation(itemId, variationId, data) {
        return this.mercadoLivre.put(`/items/${itemId}/variations/${variationId}`, data);
    }
    /**
     * Remove variação
     */
    async deleteVariation(itemId, variationId) {
        await this.mercadoLivre.delete(`/items/${itemId}/variations/${variationId}`);
    }
}
exports.Items = Items;
exports.default = Items;
//# sourceMappingURL=Items.js.map