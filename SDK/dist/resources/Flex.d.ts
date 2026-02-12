/**
 * Recursos de Flex
 */
import { MercadoLivre } from '../MercadoLivre';
export declare class Flex {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém assinaturas de flex
     */
    getSubscriptions(siteId: string, userId: number | string): Promise<any>;
    /**
     * Cria assinatura de flex
     */
    createSubscription(siteId: string, userId: number | string, serviceId: string): Promise<any>;
    /**
     * Atualiza assinatura de flex
     */
    updateSubscription(siteId: string, userId: number | string, serviceId: string, data: any): Promise<any>;
    /**
     * Cancela assinatura de flex
     */
    cancelSubscription(siteId: string, userId: number | string, serviceId: string): Promise<any>;
    /**
     * Lista zonas de cobertura
     */
    listCoverageZones(siteId: string, userId: number | string, serviceId: string, showAvailable?: boolean): Promise<any>;
    /**
     * Adiciona zona de cobertura
     */
    addCoverageZone(siteId: string, userId: number | string, serviceId: string, zone: any): Promise<any>;
    /**
     * Remove zona de cobertura
     */
    removeCoverageZone(siteId: string, userId: number | string, serviceId: string, zoneId: string): Promise<void>;
    /**
     * Lista feriados
     */
    listHolidays(siteId: string, userId: number | string, serviceId: string): Promise<any>;
    /**
     * Adiciona feriado
     */
    addHoliday(siteId: string, userId: number | string, serviceId: string, holiday: any): Promise<any>;
    /**
     * Remove feriado
     */
    removeHoliday(siteId: string, userId: number | string, serviceId: string, holidayId: string): Promise<void>;
}
export default Flex;
//# sourceMappingURL=Flex.d.ts.map