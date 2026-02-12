"use strict";
/**
 * Recursos de Visitas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Visits = void 0;
class Visits {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém visitas de um usuário
     */
    async getUserVisits(userId, dateFrom, dateTo) {
        return this.mercadoLivre.get(`/users/${userId}/items_visits?date_from=${dateFrom}&date_to=${dateTo}`);
    }
    /**
     * Obtém visitas por janela de tempo
     */
    async getVisitsTimeWindow(userId, last = 7, unit = 'day', ending = 'today') {
        return this.mercadoLivre.get(`/users/${userId}/items_visits/time_window?last=${last}&unit=${unit}&ending=${ending}`);
    }
    /**
     * Obtém visitas de um item
     */
    async getItemVisits(itemId, dateFrom, dateTo) {
        return this.mercadoLivre.get(`/items/${itemId}/visits?date_from=${dateFrom}&date_to=${dateTo}`);
    }
}
exports.Visits = Visits;
exports.default = Visits;
//# sourceMappingURL=Visits.js.map