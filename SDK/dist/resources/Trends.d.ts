/**
 * Recursos de Tendências
 */
import { MercadoLivre } from '../MercadoLivre';
import { TrendSearchResult } from '../types';
export declare class Trends {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém tendências de um site
     */
    getBySite(siteId: string): Promise<TrendSearchResult>;
    /**
     * Obtém tendências do Brasil
     */
    getBrazilTrends(): Promise<TrendSearchResult>;
    /**
     * Obtém tendências de uma categoria
     */
    getByCategory(siteId: string, categoryId: string): Promise<TrendSearchResult>;
    /**
     * Obtém tendências de categoria no Brasil
     */
    getBrazilCategoryTrends(categoryId: string): Promise<TrendSearchResult>;
}
export default Trends;
//# sourceMappingURL=Trends.d.ts.map