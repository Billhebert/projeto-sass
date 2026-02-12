/**
 * Recursos de Catálogo
 */
import { MercadoLivre } from '../MercadoLivre';
import { CatalogProduct, CatalogSearchResult, CatalogSuggestion } from '../types';
import { PaginationOptions } from '../utils';
export declare class Catalog {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Busca produtos no catálogo
     */
    search(options?: {
        status?: string;
        productIdentifier?: string;
        siteId?: string;
    }): Promise<CatalogSearchResult>;
    /**
     * Obtém um produto do catálogo
     */
    getProduct(productId: string): Promise<CatalogProduct>;
    /**
     * Lista products de catálogo de um usuário
     */
    listUserProducts(userId: number | string, options?: PaginationOptions): Promise<any>;
    /**
     * Obtém um user product
     */
    getUserProduct(userProductId: string): Promise<any>;
    /**
     * Atualiza estoque de user product
     */
    updateUserProductStock(userProductId: string, stock: any): Promise<any>;
    /**
     * Obtém bundles de user product
     */
    getUserProductBundles(userProductId: string): Promise<any>;
    /**
     * Obtém sugestões de catálogo
     */
    getSuggestions(userId: number | string): Promise<any>;
    /**
     * Obtém quota de sugestões
     */
    getSuggestionQuota(userId: number | string): Promise<any>;
    /**
     * Obtém uma sugestão
     */
    getSuggestion(suggestionId: string): Promise<CatalogSuggestion>;
    /**
     * Obtém descrição de sugestão
     */
    getSuggestionDescription(suggestionId: string): Promise<any>;
    /**
     * Obtém validações de sugestão
     */
    getSuggestionValidations(suggestionId: string): Promise<any>;
    /**
     * Aceita sugestão
     */
    acceptSuggestion(suggestionId: string, productId?: string): Promise<any>;
    /**
     * Rejeita sugestão
     */
    rejectSuggestion(suggestionId: string, reason: string): Promise<any>;
    /**
     * Lista domínios disponíveis
     */
    listAvailableDomains(siteId: string): Promise<any>;
    /**
     * Obtém especificações técnicas
     */
    getTechnicalSpecs(domainId: string, channel?: string): Promise<any>;
    /**
     * Obtém especificações técnicas de input
     */
    getTechnicalSpecsInput(domainId: string, channel?: string): Promise<any>;
    /**
     * Obtém domínios ativos
     */
    getActiveDomains(siteId: string): Promise<any>;
    /**
     * Importa DCe
     */
    importDCe(orderId: string): Promise<any>;
}
export default Catalog;
//# sourceMappingURL=Catalog.d.ts.map