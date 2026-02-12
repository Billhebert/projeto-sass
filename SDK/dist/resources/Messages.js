"use strict";
/**
 * Recursos de Mensagens
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Messages = void 0;
class Messages {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém uma mensagem pelo ID
     */
    async get(messageId, tag = 'post_sale') {
        return this.mercadoLivre.get(`/messages/${messageId}?tag=${tag}`);
    }
    /**
     * Busca mensagens
     */
    async search(options) {
        const params = new URLSearchParams();
        if (options.resource)
            params.append('resource', options.resource);
        if (options.role)
            params.append('role', options.role);
        if (options.tag)
            params.append('tag', options.tag);
        if (options.offset !== undefined)
            params.append('offset', String(options.offset));
        if (options.limit !== undefined)
            params.append('limit', String(options.limit));
        const queryString = params.toString();
        return this.mercadoLivre.get(`/messages/search${queryString ? `?${queryString}` : ''}`);
    }
    /**
     * Obtém mensagens de um pack
     */
    async getByPack(packId, sellerId, tag = 'post_sale') {
        return this.mercadoLivre.get(`/messages/packs/${packId}/sellers/${sellerId}?tag=${tag}`);
    }
    /**
     * Obtém mensagens não lidas
     */
    async getUnread(tag = 'post_sale', role) {
        const params = new URLSearchParams({ tag });
        if (role)
            params.append('role', role);
        return this.mercadoLivre.get(`/messages/unread?${params.toString()}`);
    }
    /**
     * Obtém mensagens não lidas de um recurso
     */
    async getUnreadByResource(resource, tag = 'post_sale') {
        return this.mercadoLivre.get(`/messages/unread/${resource}?tag=${tag}`);
    }
    /**
     * Envia mensagem
     */
    async send(data) {
        return this.mercadoLivre.post('/messages', data);
    }
    /**
     * Responde mensagem
     */
    async reply(messageId, text, tag = 'post_sale') {
        return this.mercadoLivre.post(`/messages/${messageId}/reply`, { text, tag });
    }
    /**
     * Faz upload de anexo
     */
    async uploadAttachment(file, tag = 'post_sale', siteId) {
        const params = new URLSearchParams({ tag });
        if (siteId)
            params.append('site_id', siteId);
        return this.mercadoLivre.post(`/messages/attachments?${params.toString()}`, file);
    }
    /**
     * Remove anexo
     */
    async deleteAttachment(attachmentId, tag = 'post_sale', siteId) {
        const params = new URLSearchParams({ tag });
        if (siteId)
            params.append('site_id', siteId);
        await this.mercadoLivre.delete(`/messages/attachments/${attachmentId}?${params.toString()}`);
    }
    /**
     * Obtém guide de ações
     */
    async getActionGuide(packId, tag = 'post_sale') {
        return this.mercadoLivre.get(`/messages/action_guide/packs/${packId}?tag=${tag}`);
    }
    /**
     * Obtém caps disponíveis
     */
    async getCapsAvailable(packId, tag = 'post_sale') {
        return this.mercadoLivre.get(`/messages/action_guide/packs/${packId}/caps_available?tag=${tag}`);
    }
    /**
     * Transforma em thread
     */
    async createThread(packId, messages) {
        return this.mercadoLivre.post(`/messages/packs/${packId}/threads`, { messages });
    }
}
exports.Messages = Messages;
exports.default = Messages;
//# sourceMappingURL=Messages.js.map