/**
 * Recursos de Flex
 */

import { MercadoLivre } from '../MercadoLivre';

export class Flex {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém assinaturas de flex
   */
  async getSubscriptions(siteId: string, userId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/flex/sites/${siteId}/users/${userId}/subscriptions/v1`);
  }

  /**
   * Cria assinatura de flex
   */
  async createSubscription(siteId: string, userId: number | string, serviceId: string): Promise<any> {
    return this.mercadoLivre.post(`/flex/sites/${siteId}/users/${userId}/services/${serviceId}/subscriptions`, {});
  }

  /**
   * Atualiza assinatura de flex
   */
  async updateSubscription(siteId: string, userId: number | string, serviceId: string, data: any): Promise<any> {
    return this.mercadoLivre.put(`/flex/sites/${siteId}/users/${userId}/services/${serviceId}/subscriptions`, data);
  }

  /**
   * Cancela assinatura de flex
   */
  async cancelSubscription(siteId: string, userId: number | string, serviceId: string): Promise<any> {
    return this.mercadoLivre.delete(`/flex/sites/${siteId}/users/${userId}/services/${serviceId}/subscriptions`);
  }

  /**
   * Lista zonas de cobertura
   */
  async listCoverageZones(siteId: string, userId: number | string, serviceId: string, showAvailable?: boolean): Promise<any> {
    const params = showAvailable ? '?show_availables=true' : '';
    return this.mercadoLivre.get(
      `/flex/sites/${siteId}/users/${userId}/services/${serviceId}/configurations/coverage/zones/v1${params}`
    );
  }

  /**
   * Adiciona zona de cobertura
   */
  async addCoverageZone(siteId: string, userId: number | string, serviceId: string, zone: any): Promise<any> {
    return this.mercadoLivre.post(
      `/flex/sites/${siteId}/users/${userId}/services/${serviceId}/configurations/coverage/zones/v1`,
      zone
    );
  }

  /**
   * Remove zona de cobertura
   */
  async removeCoverageZone(siteId: string, userId: number | string, serviceId: string, zoneId: string): Promise<void> {
    await this.mercadoLivre.delete(
      `/flex/sites/${siteId}/users/${userId}/services/${serviceId}/configurations/coverage/zones/v1/${zoneId}`
    );
  }

  /**
   * Lista feriados
   */
  async listHolidays(siteId: string, userId: number | string, serviceId: string): Promise<any> {
    return this.mercadoLivre.get(
      `/flex/sites/${siteId}/users/${userId}/services/${serviceId}/configurations/holidays/v1`
    );
  }

  /**
   * Adiciona feriado
   */
  async addHoliday(siteId: string, userId: number | string, serviceId: string, holiday: any): Promise<any> {
    return this.mercadoLivre.post(
      `/flex/sites/${siteId}/users/${userId}/services/${serviceId}/configurations/holidays/v1`,
      holiday
    );
  }

  /**
   * Remove feriado
   */
  async removeHoliday(siteId: string, userId: number | string, serviceId: string, holidayId: string): Promise<void> {
    await this.mercadoLivre.delete(
      `/flex/sites/${siteId}/users/${userId}/services/${serviceId}/configurations/holidays/v1/${holidayId}`
    );
  }
}

export default Flex;
