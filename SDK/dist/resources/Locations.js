"use strict";
/**
 * Recursos de Localização
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Locations = void 0;
class Locations {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Lista países
     */
    async listCountries() {
        return this.mercadoLivre.get('/classified_locations/countries');
    }
    /**
     * Obtém um país
     */
    async getCountry(countryId) {
        return this.mercadoLivre.get(`/classified_locations/countries/${countryId}`);
    }
    /**
     * Lista estados
     */
    async listStates() {
        return this.mercadoLivre.get('/classified_locations/states');
    }
    /**
     * Obtém estados de um país
     */
    async getStates(countryId) {
        return this.mercadoLivre.get(`/classified_locations/countries/${countryId}/states`);
    }
    /**
     * Obtém um estado
     */
    async getState(stateId) {
        return this.mercadoLivre.get(`/classified_locations/states/${stateId}`);
    }
    /**
     * Lista cidades
     */
    async listCities(stateId) {
        return this.mercadoLivre.get(`/classified_locations/states/${stateId}/cities`);
    }
    /**
     * Obtém uma cidade
     */
    async getCity(cityId) {
        return this.mercadoLivre.get(`/classified_locations/cities/${cityId}`);
    }
    /**
     * Busca CEP
     */
    async searchZipCode(countryId, zipCode) {
        return this.mercadoLivre.get(`/countries/${countryId}/zip_codes/${zipCode}`);
    }
    /**
     * Busca CEPs em range
     */
    async searchZipCodeRange(countryId, zipCodeFrom, zipCodeTo) {
        return this.mercadoLivre.get(`/country/${countryId}/zip_codes/search_between?zip_code_from=${zipCodeFrom}&zip_code_to=${zipCodeTo}`);
    }
    /**
     * Lista países para DCe
     */
    async getDCECountries() {
        return this.mercadoLivre.get('/dce/countries');
    }
}
exports.Locations = Locations;
exports.default = Locations;
//# sourceMappingURL=Locations.js.map