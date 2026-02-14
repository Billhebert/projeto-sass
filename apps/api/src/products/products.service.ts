import { Injectable } from '@nestjs/common';
import { MercadoLivreService } from '../mercadolivre/mercadolivre.service';

@Injectable()
export class ProductsService {
  constructor(private readonly mlService: MercadoLivreService) {}

  async findAll(userId: string, params: any = {}) {
    try {
      // Get items from all accounts
      const itemsData = await this.mlService.getAllAccountsItems(userId, params);
      const items = itemsData.results || [];

      if (items.length === 0) {
        return {
          products: [],
          total: 0,
        };
      }

      // Fetch sale_price for each product to detect active promotions
      const accounts = await this.mlService.getUserAccounts(userId);
      const productsWithSalePrice: any[] = [];
      
      for (const item of items) {
        try {
          const accountId = item._accountId || accounts[0]?.id;
          if (accountId) {
            const salePriceData = await this.mlService.getItemSalePrice(userId, item.id, accountId);
            if (salePriceData && salePriceData.amount !== undefined) {
              productsWithSalePrice.push({
                ...item,
                _salePriceData: salePriceData
              });
            }
          }
        } catch (e) {
          // Ignore errors for individual products
        }
      }

      const products = items.map((item: any) => {
        // Priorizar URLs HTTPS e melhor qualidade para thumbnail
        let thumbnail = null;
        
        // 1. Tentar pictures[0].secure_url (melhor qualidade e sempre HTTPS)
        if (item.pictures && item.pictures[0]?.secure_url) {
          thumbnail = item.pictures[0].secure_url;
        }
        // 2. Tentar secure_thumbnail
        else if (item.secure_thumbnail) {
          thumbnail = item.secure_thumbnail;
        }
        // 3. Tentar thumbnail (converter HTTP para HTTPS se necessário)
        else if (item.thumbnail) {
          thumbnail = item.thumbnail.replace('http://', 'https://');
        }
        // 4. Fallback para pictures[0].url (converter HTTP para HTTPS)
        else if (item.pictures && item.pictures[0]?.url) {
          thumbnail = item.pictures[0].url.replace('http://', 'https://');
        }
        
        // Calcular preços (original e com desconto) - using sale_price data when available
        // Find sale_price data for this product
        const productWithSalePrice = productsWithSalePrice.find((p: any) => p.id === item.id);
        
        let originalPrice = null;
        let discountedPrice = item.price;
        let hasDiscount = false;
        
        // Check sale_price API data first
        if (productWithSalePrice && productWithSalePrice._salePriceData?.amount) {
          discountedPrice = productWithSalePrice._salePriceData.amount;
          originalPrice = productWithSalePrice._salePriceData.regular_amount || item.price;
          if (discountedPrice < item.price) {
            hasDiscount = true;
          }
        } else if (item.base_price && item.base_price > item.price) {
          originalPrice = item.base_price;
          hasDiscount = true;
        } else if (item.original_price && item.original_price > item.price) {
          originalPrice = item.original_price;
          hasDiscount = true;
        } else if (item.sale_price?.regular_amount && item.sale_price.regular_amount > item.price) {
          originalPrice = item.sale_price.regular_amount;
          hasDiscount = true;
        }
        
        // Se não há desconto, original_price = price
        if (!hasDiscount) {
          originalPrice = item.price;
        }
        
        // Extrair todas as imagens (não apenas thumbnail)
        const pictures = (item.pictures || []).map((pic: any) => ({
          id: pic.id,
          url: pic.secure_url || pic.url?.replace('http://', 'https://'),
          size: pic.size,
        }));
        
        // Informações de envio
        const shipping = {
          freeShipping: item.shipping?.free_shipping || false,
          mode: item.shipping?.mode || 'not_specified',
          methods: item.shipping?.methods || [],
          dimensions: item.shipping?.dimensions || null,
          tags: item.shipping?.tags || [],
        };
        
        // Atributos importantes
        const attributes = (item.attributes || []).map((attr: any) => ({
          id: attr.id,
          name: attr.name,
          valueName: attr.value_name,
          valueId: attr.value_id,
        }));
        
        return {
          id: item.id,
          title: item.title,
          sku: item.seller_custom_field || null, // SKU do produto
          price: discountedPrice, // Preço atual (com desconto se houver)
          originalPrice: originalPrice, // Preço original (antes do desconto)
          basePrice: item.base_price || null, // Preço base do ML
          hasDiscount: hasDiscount, // Se tem desconto ativo
          discountPercentage: hasDiscount && originalPrice ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100) : 0,
          currency: item.currency_id,
          availableQuantity: item.available_quantity,
          soldQuantity: item.sold_quantity,
          thumbnail: thumbnail,
          pictures: pictures, // Todas as imagens
          status: item.status,
          permalink: item.permalink,
          categoryId: item.category_id,
          condition: item.condition,
          listingType: item.listing_type_id,
          buyingMode: item.buying_mode,
          warranty: item.warranty,
          acceptsMercadopago: item.accepts_mercadopago,
          tags: item.tags || [],
          shipping: shipping,
          attributes: attributes,
          subtitle: item.subtitle,
          videoId: item.video_id,
          healthScore: item.health,
          catalogProductId: item.catalog_product_id,
          createdAt: item.date_created,
          lastUpdated: item.last_updated,
          accountId: item._accountId,
          accountNickname: item._accountNickname,
          // Dados da promoção (se houver)
          promotion: productWithSalePrice?._salePriceData ? {
            priceId: productWithSalePrice._salePriceData.price_id,
            amount: productWithSalePrice._salePriceData.amount,
            regularAmount: productWithSalePrice._salePriceData.regular_amount,
            promotionId: productWithSalePrice._salePriceData.metadata?.promotion_id,
            promotionType: productWithSalePrice._salePriceData.metadata?.promotion_type,
            campaignId: productWithSalePrice._salePriceData.metadata?.campaign_id,
          } : null,
        };
      });

      return {
        results: products, // Frontend espera 'results'
        total: products.length,
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      return {
        results: [], // Frontend espera 'results'
        total: 0,
      };
    }
  }

  async findOne(userId: string, itemId: string, accountId?: string) {
    return this.mlService.getItem(userId, itemId, accountId);
  }

  async update(userId: string, itemId: string, data: any, accountId?: string) {
    return this.mlService.updateItem(userId, itemId, data, accountId);
  }

  async pause(userId: string, itemId: string, accountId?: string) {
    return this.mlService.updateItem(userId, itemId, { status: 'paused' }, accountId);
  }

  async activate(userId: string, itemId: string, accountId?: string) {
    return this.mlService.updateItem(userId, itemId, { status: 'active' }, accountId);
  }

  async getVisits(userId: string, itemId: string, dateFrom?: string, dateTo?: string, accountId?: string) {
    try {
      // Se não houver datas, pegar últimos 30 dias
      if (!dateFrom || !dateTo) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateTo = now.toISOString().split('T')[0];
        dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
      }

      const visitsData = await this.mlService.getItemVisits(userId, itemId, dateFrom, dateTo, accountId);
      
      return {
        itemId,
        dateFrom,
        dateTo,
        totalVisits: visitsData.total_visits || 0,
        visits: visitsData.results || [],
      };
    } catch (error) {
      console.error('Error fetching item visits:', error);
      return {
        itemId,
        dateFrom: dateFrom || '',
        dateTo: dateTo || '',
        totalVisits: 0,
        visits: [],
        error: 'Não foi possível obter estatísticas de visitas',
      };
    }
  }

  async getQuestions(userId: string, itemId: string, accountId?: string) {
    try {
      const questionsData = await this.mlService.getQuestionsByItem(userId, itemId, accountId);
      const questions = questionsData.questions || [];

      return {
        itemId,
        total: questions.length,
        questions: questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          status: q.status,
          answer: q.answer?.text || null,
          answerStatus: q.answer?.status || null,
          dateCreated: q.date_created,
          from: {
            id: q.from?.id,
            answeredQuestions: q.from?.answered_questions,
          },
        })),
      };
    } catch (error) {
      console.error('Error fetching item questions:', error);
      return {
        itemId,
        total: 0,
        questions: [],
        error: 'Não foi possível obter perguntas do produto',
      };
    }
  }

  async getCompetitors(userId: string, itemId: string, limit: number = 10, accountId?: string) {
    try {
      // Primeiro, buscar dados do produto para obter categoria e preço
      const item = await this.mlService.getItem(userId, itemId, accountId);
      
      if (!item || !item.category_id) {
        return {
          itemId,
          competitors: [],
          error: 'Produto não encontrado ou sem categoria',
        };
      }

      // Buscar produtos similares na mesma categoria
      const searchParams = {
        category: item.category_id,
        limit: limit + 5, // Pegar alguns extras para filtrar o próprio produto
        sort: 'price_asc', // Ordenar por preço para análise de concorrência
      };

      const searchResults = await this.mlService.searchByCategory(userId, item.category_id, searchParams, accountId);
      const competitors = (searchResults.results || [])
        .filter((result: any) => result.id !== itemId) // Remover o próprio produto
        .slice(0, limit)
        .map((result: any) => ({
          id: result.id,
          title: result.title,
          price: result.price,
          originalPrice: result.original_price || result.price,
          currency: result.currency_id,
          availableQuantity: result.available_quantity,
          soldQuantity: result.sold_quantity,
          condition: result.condition,
          thumbnail: result.thumbnail?.replace('http://', 'https://'),
          permalink: result.permalink,
          freeShipping: result.shipping?.free_shipping || false,
          seller: {
            id: result.seller?.id,
            nickname: result.seller?.nickname,
            powerSellerStatus: result.seller?.power_seller_status,
          },
          // Calcular diferença de preço comparado ao produto analisado
          priceDifference: result.price - item.price,
          priceDifferencePercentage: item.price > 0 
            ? Math.round(((result.price - item.price) / item.price) * 100)
            : 0,
        }));

      return {
        itemId,
        productPrice: item.price,
        productTitle: item.title,
        categoryId: item.category_id,
        total: competitors.length,
        competitors,
        analysis: {
          cheaperCount: competitors.filter((c: any) => c.price < item.price).length,
          moreExpensiveCount: competitors.filter((c: any) => c.price > item.price).length,
          averagePrice: competitors.length > 0
            ? Math.round(competitors.reduce((sum: number, c: any) => sum + c.price, 0) / competitors.length * 100) / 100
            : 0,
          lowestPrice: competitors.length > 0
            ? Math.min(...competitors.map((c: any) => c.price))
            : 0,
          highestPrice: competitors.length > 0
            ? Math.max(...competitors.map((c: any) => c.price))
            : 0,
        },
      };
    } catch (error) {
      console.error('Error fetching competitors:', error);
      return {
        itemId,
        competitors: [],
        error: 'Não foi possível obter análise de concorrência',
      };
    }
  }
}
