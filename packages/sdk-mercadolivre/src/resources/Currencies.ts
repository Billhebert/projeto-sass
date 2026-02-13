/**
 * Recursos de Moedas
 */

import { MercadoLivre } from '../MercadoLivre';
import { Currency, CurrencyConversion } from '../types';

export class Currencies {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Lista todas as moedas
   */
  async list(): Promise<Currency[]> {
    return this.mercadoLivre.get<Currency[]>('/currencies');
  }

  /**
   * Obtém uma moeda pelo ID
   */
  async get(currencyId: string): Promise<Currency> {
    return this.mercadoLivre.get<Currency>(`/currencies/${currencyId}`);
  }

  /**
   * Obtém conversão de moeda
   */
  async convert(from: string, to: string): Promise<CurrencyConversion> {
    return this.mercadoLivre.get<CurrencyConversion>(
      `/currency_conversions/search?from=${from}&to=${to}`
    );
  }

  /**
   * Obtém cotação de dólar
   */
  async getUSDRate(): Promise<any> {
    return this.mercadoLivre.get('/currency_conversions/search?from=USD&to=BRL');
  }
}

export default Currencies;
