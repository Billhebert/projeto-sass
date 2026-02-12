"use strict";
/**
 * Recursos de Flex
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flex = void 0;
class Flex {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém assinaturas de flex
     */
    async getSubscriptions(siteId, userId) {
        return this.mercadoLivre.get(`/flex/sites/${siteId}/users/${userId}/subscriptions/v1`);
    }
    /**
     * Cria assinatura de flex
     */
    async createSubscription(siteId, userId, serviceId) {
        return this.mercadoLivre.post(`/flex/sites/${siteId}/users/${userId}/services/${serviceId}/subscriptions`, {});
    }
    /**
     * Atualiza assinatura de flex
     */
    async updateSubscription(siteId, userId, serviceId, data) {
        return this.mercadoLivre.put(`/flex/sites/${siteId}/users/${userId}/services/${serviceId}/subscriptions`, data);
    }
    /**
     * Cancela assinatura de flex
     */
    async cancelSubscription(siteId, userId, serviceId) {
        return this.mercadoLivre.delete(`/flex/sites/${siteId}/users/${userId}/services/${serviceId}/subscriptions`);
    }
    /**
     * Lista zonas de cobertura
     */
    async listCoverageZones(siteId, userId, serviceId, showAvailable) {
        const params = showAvailable ? '?show_availables=true' : '';
        return this.mercadoLivre.get(`/flex/sites/${siteId}/users/${userId}/services/${serviceId}/configurations/coverage/zones/v1${params}`);
    }
    /**
     * Adiciona zona de cobertura
     */
    async addCoverageZone(siteId, userId, serviceId, zone) {
        return this.mercadoLivre.post(`/flex/sites/${siteId}/users/${userId}/services/${serviceId}/configurations/coverage/zones/v1`, zone);
    }
    /**
     * Remove zona de cobertura
     */
    async removeCoverageZone(siteId, userId, serviceId, zoneId) {
        await this.mercadoLivre.delete(`/flex/sites/${siteId}/users/${userId}/services/${serviceId}/configurations/coverage/zones/v1/${zoneId}`);
    }
    /**
     * Lista feriados
     */
    async listHolidays(siteId, userId, serviceId) {
        return this.mercadoLivre.get(`/flex/sites/${siteId}/users/${userId}/services/${serviceId}/configurations/holidays/v1`);
    }
    /**
     * Adiciona feriado
     */
    async addHoliday(siteId, userId, serviceId, holiday) {
        return this.mercadoLivre.post(`/flex/sites/${siteId}/users/${userId}/services/${serviceId}/configurations/holidays/v1`, holiday);
    }
    /**
     * Remove feriado
     */
    async removeHoliday(siteId, userId, serviceId, holidayId) {
        await this.mercadoLivre.delete(`/flex/sites/${siteId}/users/${userId}/services/${serviceId}/configurations/holidays/v1/${holidayId}`);
    }
}
exports.Flex = Flex;
exports.default = Flex;
//# sourceMappingURL=Flex.js.map