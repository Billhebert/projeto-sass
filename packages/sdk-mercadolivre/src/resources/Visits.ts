/**
 * Recursos de Visitas
 */

import { MercadoLivre } from '../MercadoLivre';
import { VisitSummary, VisitTimeWindow } from '../types';

export class Visits {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém visitas de um usuário
   */
  async getUserVisits(userId: number | string, dateFrom: string, dateTo: string): Promise<VisitSummary> {
    return this.mercadoLivre.get<VisitSummary>(
      `/users/${userId}/items_visits?date_from=${dateFrom}&date_to=${dateTo}`
    );
  }

  /**
   * Obtém visitas por janela de tempo
   */
  async getVisitsTimeWindow(
    userId: number | string,
    last: number = 7,
    unit: string = 'day',
    ending: string = 'today'
  ): Promise<VisitTimeWindow> {
    return this.mercadoLivre.get<VisitTimeWindow>(
      `/users/${userId}/items_visits/time_window?last=${last}&unit=${unit}&ending=${ending}`
    );
  }

  /**
   * Obtém visitas de um item
   */
  async getItemVisits(itemId: string, dateFrom: string, dateTo: string): Promise<any> {
    return this.mercadoLivre.get(
      `/items/${itemId}/visits?date_from=${dateFrom}&date_to=${dateTo}`
    );
  }
}

export default Visits;
