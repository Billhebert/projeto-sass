/**
 * Recursos de Publicidade (Mercado Ads)
 */
import { MercadoLivre } from '../MercadoLivre';
import { Advertiser, AdvertisingCampaign, ProductAd, AdGroup } from '../types';
export declare class Advertising {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Lista anunciantes
     */
    listAdvertisers(productId?: string): Promise<Advertiser[]>;
    /**
     * Obtém campanhas de um anunciante
     */
    getCampaigns(advertiserId: number | string): Promise<AdvertisingCampaign[]>;
    /**
     * Obtém métricas de campanha
     */
    getCampaignMetrics(advertiserId: number | string, campaignId: string, dateFrom: string, dateTo: string, aggregationType?: string): Promise<any>;
    /**
     * Lista campanhas de display
     */
    listDisplayCampaigns(advertiserId: number | string): Promise<any>;
    /**
     * Obtém creativos de campanha
     */
    getCampaignCreatives(advertiserId: number | string, campaignId: string, lineItemId: string): Promise<any>;
    /**
     * Obtém product ads de um item
     */
    getProductAd(siteId: string, itemId: string): Promise<ProductAd>;
    /**
     * Lista product ads de um anunciante
     */
    searchProductAds(siteId: string, advertiserId: number | string, options?: {
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
        filters?: Record<string, any>;
        metrics?: string[];
        metricsSummary?: boolean;
        aggregationType?: string;
    }): Promise<any>;
    /**
     * Busca product ads
     */
    searchProductAdsByFilter(siteId: string, advertiserId: number | string, itemId: string, dateFrom?: string, dateTo?: string): Promise<any>;
    /**
     * Obtém campanhas de product ads
     */
    getProductAdCampaigns(siteId: string, advertiserId: number | string, campaignId: string, dateFrom: string, dateTo: string, metrics?: string[], aggregationType?: string): Promise<any>;
    /**
     * Lista ad groups
     */
    listAdGroups(siteId: string, advertiserId: number | string, options?: {
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
        sort?: string;
        sortBy?: string;
        metrics?: string[];
        metricsSummary?: boolean;
        filters?: Record<string, any>;
    }): Promise<any>;
    /**
     * Obtém ads de um ad group
     */
    getAdsFromAdGroup(siteId: string, advertiserId: number | string, adGroupId: string, dateFrom: string, dateTo: string, metrics?: string[]): Promise<any>;
    /**
     * Obtém detalhes de ad group
     */
    getAdGroupDetails(siteId: string, advertiserId: number | string, adGroupId: string): Promise<AdGroup>;
    /**
     * Obtém bonificações
     */
    getBonifications(): Promise<any>;
    /**
     * Cria product ad
     */
    createProductAd(siteId: string, itemId: string, campaignId: number, bid: number): Promise<ProductAd>;
    /**
     * Atualiza product ad
     */
    updateProductAd(siteId: string, itemId: string, data: any): Promise<ProductAd>;
    /**
     * Pausa product ad
     */
    pauseProductAd(siteId: string, itemId: string): Promise<any>;
    /**
     * Ativa product ad
     */
    activateProductAd(siteId: string, itemId: string): Promise<any>;
}
export default Advertising;
//# sourceMappingURL=Advertising.d.ts.map