/**
 * Recursos de Publicidade (Mercado Ads)
 */

import { MercadoLivre } from '../MercadoLivre';
import {
  Advertiser,
  AdvertisingCampaign,
  ProductAd,
  AdGroup,
  AdvertisingSearchResult,
} from '../types';
import { PaginationOptions } from '../utils';

export class Advertising {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Lista anunciantes
   * Requer: product_id (PADS para Product Ads, DISPLAY, BADS para Brand Ads)
   * Documentação: https://developers.mercadolivre.com.br/pt_br/product-ads-leitura#Consultar-anunciante
   */
  async listAdvertisers(productId: string = 'PADS'): Promise<Advertiser[]> {
    return this.mercadoLivre.get<Advertiser[]>(`/advertising/advertisers?product_id=${productId}`);
  }

  /**
   * Pesquisa campanhas de Product Ads
   * Documentação: https://developers.mercadolivre.com.br/pt_br/product-ads-leitura#Pesquisa-e-m%C3%A9tricas-de-todas-as-campanhas
   */
  async searchCampaigns(
    siteId: string,
    advertiserId: number | string,
    options?: {
      limit?: number;
      offset?: number;
      dateFrom?: string;
      dateTo?: string;
      metrics?: string[];
      campaignIds?: string;
      status?: string;
    }
  ): Promise<any> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.dateFrom) params.append('date_from', options.dateFrom);
    if (options?.dateTo) params.append('date_to', options.dateTo);
    if (options?.metrics) params.append('metrics', options.metrics.join(','));
    if (options?.campaignIds) params.append('filters[campaign_ids]', options.campaignIds);
    if (options?.status) params.append('filters[status]', options.status);

    return this.mercadoLivre.get(
      `/advertising/${siteId}/advertisers/${advertiserId}/product_ads/campaigns/search?${params.toString()}`
    );
  }

  /**
   * Obtém detalhes de uma campanha (Brand Ads)
   * Nota: Brand Ads pode requerer permissões especiais
   */
  async getCampaigns(siteId: string = 'MLB', advertiserId: number | string): Promise<AdvertisingCampaign[]> {
    return this.mercadoLivre.get<AdvertisingCampaign[]>(
      `/advertising/${siteId}/advertisers/${advertiserId}/brand_ads/campaigns`
    );
  }

  /**
   * Obtém métricas de campanha
   * Nota: Este endpoint de Brand Ads requer permissões especiais
   */
  async getCampaignMetrics(
    siteId: string = 'MLB',
    advertiserId: number | string,
    campaignId: string,
    dateFrom: string,
    dateTo: string,
    aggregationType: string = 'daily'
  ): Promise<any> {
    return this.mercadoLivre.get(
      `/advertising/${siteId}/advertisers/${advertiserId}/brand_ads/campaigns/${campaignId}/metrics?date_from=${dateFrom}&date_to=${dateTo}&aggregation_type=${aggregationType}`
    );
  }

  /**
   * Lista campanhas de display
   * Nota: Este endpoint de Display Ads requer permissões especiais
   */
  async listDisplayCampaigns(siteId: string = 'MLB', advertiserId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/advertising/${siteId}/advertisers/${advertiserId}/display/campaigns`);
  }

  /**
   * Obtém creativos de campanha
   * Nota: Este endpoint de Display Ads requer permissões especiais
   */
  async getCampaignCreatives(
    siteId: string = 'MLB',
    advertiserId: number | string,
    campaignId: string,
    lineItemId: string
  ): Promise<any> {
    return this.mercadoLivre.get(
      `/advertising/${siteId}/advertisers/${advertiserId}/display/campaigns/${campaignId}/line_items/${lineItemId}/creatives?sort_by=start_date&sort_order=asc`
    );
  }

  /**
   * Obtém product ads de um item
   */
  async getProductAd(siteId: string, itemId: string): Promise<ProductAd> {
    return this.mercadoLivre.get<ProductAd>(`/advertising/${siteId}/product_ads/ads/${itemId}`);
  }

  /**
   * Lista product ads de um anunciante
   */
  async searchProductAds(
    siteId: string,
    advertiserId: number | string,
    options?: {
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
      filters?: Record<string, any>;
      metrics?: string[];
      metricsSummary?: boolean;
      aggregationType?: string;
    }
  ): Promise<any> {
    const params = new URLSearchParams();

    if (options?.dateFrom) params.append('date_from', options.dateFrom);
    if (options?.dateTo) params.append('date_to', options.dateTo);
    if (options?.limit !== undefined) params.append('limit', String(options.limit));
    if (options?.offset !== undefined) params.append('offset', String(options.offset));
    if (options?.metricsSummary) params.append('metrics_summary', String(options.metricsSummary));
    if (options?.aggregationType) params.append('aggregation_type', options.aggregationType);

    if (options?.metrics && options.metrics.length > 0) {
      params.append('metrics', options.metrics.join(','));
    }

    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        params.append(`filters[${key}]`, String(value));
      });
    }

    return this.mercadoLivre.get(
      `/advertising/${siteId}/advertisers/${advertiserId}/product_ads/campaigns/search?${params.toString()}`
    );
  }

  /**
   * Busca product ads
   */
  async searchProductAdsByFilter(
    siteId: string,
    advertiserId: number | string,
    itemId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      'filters[item_id]': itemId,
    });

    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    return this.mercadoLivre.get(
      `/advertising/${siteId}/advertisers/${advertiserId}/product_ads/ads/search?${params.toString()}`
    );
  }

  /**
   * Obtém campanhas de product ads
   */
  async getProductAdCampaigns(
    siteId: string,
    advertiserId: number | string,
    campaignId: string,
    dateFrom: string,
    dateTo: string,
    metrics?: string[],
    aggregationType?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    });

    if (metrics && metrics.length > 0) {
      params.append('metrics', metrics.join(','));
    }
    if (aggregationType) {
      params.append('aggregation_type', aggregationType);
    }

    return this.mercadoLivre.get(
      `/advertising/${siteId}/product_ads/campaigns/${campaignId}?${params.toString()}`
    );
  }

  /**
   * Lista ad groups
   */
  async listAdGroups(
    siteId: string,
    advertiserId: number | string,
    options?: {
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
      sort?: string;
      sortBy?: string;
      metrics?: string[];
      metricsSummary?: boolean;
      filters?: Record<string, any>;
    }
  ): Promise<any> {
    const params = new URLSearchParams();

    if (options?.dateFrom) params.append('date_to', options.dateTo!);
    if (options?.dateTo) params.append('date_from', options.dateFrom!);
    if (options?.limit !== undefined) params.append('limit', String(options.limit));
    if (options?.offset !== undefined) params.append('offset', String(options.offset));
    if (options?.sort) params.append('sort', options.sort);
    if (options?.sortBy) params.append('sort_by', options.sortBy);
    if (options?.metricsSummary) params.append('metrics_summary', String(options.metricsSummary));

    if (options?.metrics && options.metrics.length > 0) {
      params.append('metrics', options.metrics.join(','));
    }

    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        params.append(`filters[${key}]`, String(value));
      });
    }

    return this.mercadoLivre.get(
      `/advertising/${siteId}/advertisers/${advertiserId}/product_ads/ad_groups/search?${params.toString()}`
    );
  }

  /**
   * Obtém ads de um ad group
   */
  async getAdsFromAdGroup(
    siteId: string,
    advertiserId: number | string,
    adGroupId: string,
    dateFrom: string,
    dateTo: string,
    metrics?: string[]
  ): Promise<any> {
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    });

    if (metrics && metrics.length > 0) {
      params.append('metrics', metrics.join(','));
    }

    return this.mercadoLivre.get(
      `/advertising/${siteId}/advertisers/${advertiserId}/product_ads/ad_groups/${adGroupId}/ads?${params.toString()}`
    );
  }

  /**
   * Obtém detalhes de ad group
   */
  async getAdGroupDetails(siteId: string, advertiserId: number | string, adGroupId: string): Promise<AdGroup> {
    return this.mercadoLivre.get<AdGroup>(
      `/advertising/${siteId}/advertisers/${advertiserId}/product_ads/ad_groups/${adGroupId}`
    );
  }

  /**
   * Obtém bonificações
   * Nota: Este endpoint requer permissões especiais
   */
  async getBonifications(siteId: string = 'MLB'): Promise<any> {
    return this.mercadoLivre.get(`/advertising/${siteId}/advertisers/bonifications`);
  }

  /**
   * Cria product ad
   */
  async createProductAd(siteId: string, itemId: string, campaignId: number, bid: number): Promise<ProductAd> {
    return this.mercadoLivre.post<ProductAd>(`/advertising/${siteId}/product_ads/ads`, {
      item_id: itemId,
      campaign_id: campaignId,
      bid,
    });
  }

  /**
   * Atualiza product ad
   */
  async updateProductAd(siteId: string, itemId: string, data: any): Promise<ProductAd> {
    return this.mercadoLivre.put<ProductAd>(`/advertising/${siteId}/product_ads/ads/${itemId}`, data);
  }

  /**
   * Pausa product ad
   */
  async pauseProductAd(siteId: string, itemId: string): Promise<any> {
    return this.mercadoLivre.post(`/advertising/${siteId}/product_ads/ads/${itemId}/pause`);
  }

  /**
   * Ativa product ad
   */
  async activateProductAd(siteId: string, itemId: string): Promise<any> {
    return this.mercadoLivre.post(`/advertising/${siteId}/product_ads/ads/${itemId}/activate`);
  }
}

export default Advertising;
