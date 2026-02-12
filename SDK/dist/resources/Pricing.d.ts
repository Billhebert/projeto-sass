/**
 * Recursos de Precificação
 */
import { MercadoLivre } from '../MercadoLivre';
export declare class Pricing {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém sugestões de preço
     */
    getSuggestions(userId: number | string): Promise<any>;
    /**
     * Obtém detalhes de sugestão
     */
    getSuggestionDetails(itemId: string): Promise<any>;
    /**
     * Aplica sugestão
     */
    applySuggestion(itemId: string, suggestedPrice: number): Promise<any>;
    /**
     * Obtém regras de precificação
     */
    getRules(itemId: string): Promise<any>;
    /**
     * Cria regra de precificação
     */
    createRule(itemId: string, rule: any): Promise<any>;
    /**
     * Atualiza regra
     */
    updateRule(itemId: string, ruleId: string, rule: any): Promise<any>;
    /**
     * Remove regra
     */
    deleteRule(itemId: string, ruleId: string): Promise<void>;
    /**
     * Obtém status de automação
     */
    getAutomationStatus(itemId: string): Promise<any>;
    /**
     * Ativa automação
     */
    activateAutomation(itemId: string, config: any): Promise<any>;
    /**
     * Desativa automação
     */
    deactivateAutomation(itemId: string): Promise<any>;
    /**
     * Obtém regras de produto de catálogo
     */
    getProductRules(catalogProductId: string): Promise<any>;
    /**
     * Obtém preço padrão
     */
    getStandardPrice(itemId: string, quantity?: number): Promise<any>;
    /**
     * Obtém preços de item
     */
    getItemPrices(itemId: string): Promise<any>;
    /**
     * Calcula preço para vencer
     */
    getPriceToWin(itemId: string, siteId?: string): Promise<any>;
}
export default Pricing;
//# sourceMappingURL=Pricing.d.ts.map