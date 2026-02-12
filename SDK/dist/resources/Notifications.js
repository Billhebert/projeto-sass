"use strict";
/**
 * Recursos de Notificações
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notifications = void 0;
class Notifications {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Lista notificações
     */
    async list(options) {
        const params = new URLSearchParams();
        if (options?.offset)
            params.append('offset', String(options.offset));
        if (options?.limit)
            params.append('limit', String(options.limit));
        const queryString = params.toString();
        return this.mercadoLivre.get(`/notifications${queryString ? `?${queryString}` : ''}`);
    }
    /**
     * Obtém uma notificação
     */
    async get(notificationId) {
        return this.mercadoLivre.get(`/notifications/${notificationId}`);
    }
    /**
     * Remove uma notificação
     */
    async delete(notificationId) {
        await this.mercadoLivre.delete(`/notifications/${notificationId}`);
    }
    /**
     * Marca como lida
     */
    async markAsRead(notificationId) {
        await this.mercadoLivre.post(`/notifications/${notificationId}/read`);
    }
}
exports.Notifications = Notifications;
exports.default = Notifications;
//# sourceMappingURL=Notifications.js.map