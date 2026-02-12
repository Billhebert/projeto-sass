"use strict";
/**
 * Recursos de Moedas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Currencies = void 0;
class Currencies {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Lista todas as moedas
     */
    async list() {
        return this.mercadoLivre.get('/currencies');
    }
    /**
     * Obtém uma moeda pelo ID
     */
    async get(currencyId) {
        return this.mercadoLivre.get(`/currencies/${currencyId}`);
    }
    /**
     * Obtém conversão de moeda
     */
    async convert(from, to) {
        return this.mercadoLivre.get(`/currency_conversions/search?from=${from}&to=${to}`);
    }
    /**
     * Obtém cotação de dólar
     */
    async getUSDRate() {
        return this.mercadoLivre.get('/currency_conversions/search?from=USD&to=BRL');
    }
}
exports.Currencies = Currencies;
exports.default = Currencies;
//# sourceMappingURL=Currencies.js.map