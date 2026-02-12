/**
 * Recursos de Sites
 */
import { MercadoLivre } from '../MercadoLivre';
export declare class Sites {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Lista todos os sites
     */
    list(): Promise<any[]>;
    /**
     * Obtém um site pelo ID
     */
    get(siteId: string): Promise<any>;
    /**
     * Obtém tipos de listagem de um site
     */
    getListingTypes(siteId: string): Promise<any>;
    /**
     * Obtém preços de listagem de um site
     */
    getListingPrices(siteId: string, options?: {
        price?: number;
        listingTypeId?: string;
        categoryId?: string;
    }): Promise<any>;
    /**
     * Obtém categorias de um site
     */
    getCategories(siteId: string): Promise<any[]>;
    /**
     * Obtém métodos de pagamento de um site
     */
    getPaymentMethods(siteId: string): Promise<any[]>;
    /**
     * Obtém métodos de envio de um site
     */
    getShippingMethods(siteId: string): Promise<any[]>;
    /**
     * Busca por domínio
     */
    searchDomain(siteId: string, query: string): Promise<any>;
    /**
     * Obtém listing types gold_special
     */
    getGoldSpecialListingTypes(siteId: string): Promise<any>;
}
export default Sites;
//# sourceMappingURL=Sites.d.ts.map