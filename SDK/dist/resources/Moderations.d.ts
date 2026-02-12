/**
 * Recursos de Moderação
 */
import { MercadoLivre } from '../MercadoLivre';
import { ModerationSearchResult, ModerationLast } from '../types';
export declare class Moderations {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém última moderação
     */
    getLast(moderationId: string): Promise<ModerationLast>;
    /**
     * Busca moderações
     */
    search(options?: {
        userId?: number | string;
        status?: string;
        offset?: number;
        limit?: number;
    }): Promise<ModerationSearchResult>;
    /**
     * Obtém moderações com pausa
     */
    getPaused(userId: number | string): Promise<any>;
    /**
     * Obtém diagnóstico de imagens
     */
    getImageDiagnosis(itemId: string): Promise<any>;
    /**
     * Obtém status de qualidade de catálogo
     */
    getCatalogQualityStatus(sellerId: number | string, includeItems?: boolean, version?: string): Promise<any>;
}
export default Moderations;
//# sourceMappingURL=Moderations.d.ts.map