/**
 * Recursos de Promoções
 */
import { MercadoLivre } from '../MercadoLivre';
import { Promotion, PromotionSearchResult } from '../types';
export declare class Promotions {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém promoções de um usuário
     */
    getUserPromotions(userId: number | string, appVersion?: string): Promise<PromotionSearchResult>;
    /**
     * Obtém promoções de um item
     */
    getItemPromotions(itemId: string, appVersion?: string): Promise<any>;
    /**
     * Obtém detalhes de uma promoção
     */
    getPromotion(promoId: string, promotionType: string, appVersion?: string): Promise<Promotion>;
    /**
     * Obtém itens de uma promoção
     */
    getPromotionItems(promoId: string, promotionType: string, appVersion?: string): Promise<any>;
    /**
     * Obtém ofertas
     */
    getOffer(offerId: string): Promise<any>;
    /**
     * Cria promoção
     */
    createPromotion(data: {
        name: string;
        type: string;
        startDate: string;
        endDate: string;
        conditions: any[];
        benefits: any[];
    }): Promise<Promotion>;
    /**
     * Atualiza promoção
     */
    updatePromotion(promoId: string, data: any): Promise<Promotion>;
    /**
     * Ativa promoção
     */
    activatePromotion(promoId: string): Promise<any>;
    /**
     * Pausa promoção
     */
    pausePromotion(promoId: string): Promise<any>;
    /**
     * Finaliza promoção
     */
    finishPromotion(promoId: string): Promise<any>;
    /**
     * Adiciona item à promoção
     */
    addItemToPromotion(promoId: string, itemId: string, discount: any): Promise<any>;
    /**
     * Remove item da promoção
     */
    removeItemFromPromotion(promoId: string, itemId: string): Promise<void>;
}
export default Promotions;
//# sourceMappingURL=Promotions.d.ts.map