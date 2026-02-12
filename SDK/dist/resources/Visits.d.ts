/**
 * Recursos de Visitas
 */
import { MercadoLivre } from '../MercadoLivre';
import { VisitSummary, VisitTimeWindow } from '../types';
export declare class Visits {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém visitas de um usuário
     */
    getUserVisits(userId: number | string, dateFrom: string, dateTo: string): Promise<VisitSummary>;
    /**
     * Obtém visitas por janela de tempo
     */
    getVisitsTimeWindow(userId: number | string, last?: number, unit?: string, ending?: string): Promise<VisitTimeWindow>;
    /**
     * Obtém visitas de um item
     */
    getItemVisits(itemId: string, dateFrom: string, dateTo: string): Promise<any>;
}
export default Visits;
//# sourceMappingURL=Visits.d.ts.map