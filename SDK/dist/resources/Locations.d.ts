/**
 * Recursos de Localização
 */
import { MercadoLivre } from '../MercadoLivre';
import { Country, State, City, ZipCodeResult } from '../types';
export declare class Locations {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Lista países
     */
    listCountries(): Promise<Country[]>;
    /**
     * Obtém um país
     */
    getCountry(countryId: string): Promise<Country>;
    /**
     * Lista estados
     */
    listStates(): Promise<State[]>;
    /**
     * Obtém estados de um país
     */
    getStates(countryId: string): Promise<State[]>;
    /**
     * Obtém um estado
     */
    getState(stateId: string): Promise<State>;
    /**
     * Lista cidades
     */
    listCities(stateId: string): Promise<City[]>;
    /**
     * Obtém uma cidade
     */
    getCity(cityId: string): Promise<City>;
    /**
     * Busca CEP
     */
    searchZipCode(countryId: string, zipCode: string): Promise<ZipCodeResult>;
    /**
     * Busca CEPs em range
     */
    searchZipCodeRange(countryId: string, zipCodeFrom: string, zipCodeTo: string): Promise<ZipCodeResult[]>;
    /**
     * Lista países para DCe
     */
    getDCECountries(): Promise<any>;
}
export default Locations;
//# sourceMappingURL=Locations.d.ts.map