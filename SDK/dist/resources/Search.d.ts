/**
 * Recursos de Busca
 */
import { MercadoLivre } from '../MercadoLivre';
import { SearchResult } from '../types';
export interface SearchOptions {
    query?: string;
    category?: string;
    sellerId?: number | string;
    offset?: number;
    limit?: number;
    order?: string;
    sort?: string;
    condition?: string;
    buyingMode?: string;
    priceFrom?: number;
    priceTo?: number;
    currency?: string;
}
export declare class Search {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Busca produtos
     */
    search(options: SearchOptions): Promise<SearchResult>;
    /**
     * Busca por termo
     */
    byQuery(query: string, options?: Omit<SearchOptions, 'query'>): Promise<SearchResult>;
    /**
     * Busca por categoria
     */
    byCategory(categoryId: string, options?: Omit<SearchOptions, 'category'>): Promise<SearchResult>;
    /**
     * Busca por vendedor
     */
    bySeller(sellerId: number | string, options?: Omit<SearchOptions, 'sellerId'>): Promise<SearchResult>;
    /**
     * Busca por rango de preço
     */
    byPriceRange(priceFrom: number, priceTo: number, options?: Omit<SearchOptions, 'priceFrom' | 'priceTo'>): Promise<SearchResult>;
    /**
     * Busca por condição
     */
    byCondition(condition: 'new' | 'used', options?: Omit<SearchOptions, 'condition'>): Promise<SearchResult>;
    /**
     * Obtém sugestões de busca
     */
    getSuggestions(query: string, limit?: number): Promise<any>;
    /**
     * Busca produtos catalogados
     */
    searchCatalog(options: {
        status?: string;
        productIdentifier?: string;
    }): Promise<any>;
}
export default Search;
//# sourceMappingURL=Search.d.ts.map