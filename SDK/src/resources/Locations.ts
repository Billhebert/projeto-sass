/**
 * Recursos de Localização
 */

import { MercadoLivre } from '../MercadoLivre';
import { Country, State, City, Neighborhood, ZipCodeResult } from '../types';

export class Locations {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Lista países
   */
  async listCountries(): Promise<Country[]> {
    return this.mercadoLivre.get<Country[]>('/classified_locations/countries');
  }

  /**
   * Obtém um país
   */
  async getCountry(countryId: string): Promise<Country> {
    return this.mercadoLivre.get<Country>(`/classified_locations/countries/${countryId}`);
  }

  /**
   * Lista estados
   */
  async listStates(): Promise<State[]> {
    return this.mercadoLivre.get<State[]>('/classified_locations/states');
  }

  /**
   * Obtém estados de um país
   */
  async getStates(countryId: string): Promise<State[]> {
    return this.mercadoLivre.get<State[]>(`/classified_locations/countries/${countryId}/states`);
  }

  /**
   * Obtém um estado
   */
  async getState(stateId: string): Promise<State> {
    return this.mercadoLivre.get<State>(`/classified_locations/states/${stateId}`);
  }

  /**
   * Lista cidades
   */
  async listCities(stateId: string): Promise<City[]> {
    return this.mercadoLivre.get<City[]>(`/classified_locations/states/${stateId}/cities`);
  }

  /**
   * Obtém uma cidade
   */
  async getCity(cityId: string): Promise<City> {
    return this.mercadoLivre.get<City>(`/classified_locations/cities/${cityId}`);
  }

  /**
   * Busca CEP
   */
  async searchZipCode(countryId: string, zipCode: string): Promise<ZipCodeResult> {
    return this.mercadoLivre.get<ZipCodeResult>(
      `/countries/${countryId}/zip_codes/${zipCode}`
    );
  }

  /**
   * Busca CEPs em range
   */
  async searchZipCodeRange(countryId: string, zipCodeFrom: string, zipCodeTo: string): Promise<ZipCodeResult[]> {
    return this.mercadoLivre.get<ZipCodeResult[]>(
      `/country/${countryId}/zip_codes/search_between?zip_code_from=${zipCodeFrom}&zip_code_to=${zipCodeTo}`
    );
  }

  /**
   * Lista países para DCe
   */
  async getDCECountries(): Promise<any> {
    return this.mercadoLivre.get('/dce/countries');
  }
}

export default Locations;
