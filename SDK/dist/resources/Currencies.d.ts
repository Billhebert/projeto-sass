/**
 * Recursos de Moedas
 */
import { MercadoLivre } from '../MercadoLivre';
import { Currency, CurrencyConversion } from '../types';
export declare class Currencies {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Lista todas as moedas
     */
    list(): Promise<Currency[]>;
    /**
     * Obtém uma moeda pelo ID
     */
    get(currencyId: string): Promise<Currency>;
    /**
     * Obtém conversão de moeda
     */
    convert(from: string, to: string): Promise<CurrencyConversion>;
    /**
     * Obtém cotação de dólar
     */
    getUSDRate(): Promise<any>;
}
export default Currencies;
//# sourceMappingURL=Currencies.d.ts.map