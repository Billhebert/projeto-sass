import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoLivreService } from '../mercadolivre/mercadolivre.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mlService: MercadoLivreService,
  ) {}

  async getStats(userId: string, dateFrom?: string, dateTo?: string) {
    try {
      console.log('[Dashboard getStats] dateFrom:', dateFrom, 'dateTo:', dateTo);
      
      // Check if user has any ML accounts
      const accounts = await this.mlService.getUserAccounts(userId);
      console.log('[Dashboard getStats] accounts count:', accounts.length);
      
      if (accounts.length === 0) {
        return this.getEmptyStats();
      }

      // Calculate date range
      let startDate: Date;
      let endDate: Date = dateTo ? new Date(dateTo) : new Date();

      if (dateFrom) {
        startDate = new Date(dateFrom);
      } else {
        // Default: last 30 days
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }

      console.log('[Dashboard getStats] startDate:', startDate.toISOString(), 'endDate:', endDate.toISOString());

      // Pass date_from and date_to to get all data with pagination
      const [ordersData, questionsData] = await Promise.all([
        this.mlService.getAllAccountsOrders(userId, {
          date_from: startDate.toISOString(),
          date_to: endDate.toISOString(),
        }),
        this.mlService.getAllAccountsQuestions(userId, {
          status: 'UNANSWERED',
        }),
      ]);

      console.log('[Dashboard getStats] ordersData:', ordersData?.results?.length, 'paging:', ordersData?.paging);

      const orders = ordersData.results || [];
      const totalSales = orders.reduce(
        (sum: number, order: any) => sum + (order.total_amount || 0),
        0,
      );

      // Get previous period for comparison (same duration)
      const periodDuration = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodDuration);
      const previousEndDate = new Date(startDate);

      const previousOrdersData = await this.mlService.getAllAccountsOrders(userId, {
        date_from: previousStartDate.toISOString(),
        date_to: previousEndDate.toISOString(),
      });

      const previousOrders = previousOrdersData.results || [];
      const previousTotalSales = previousOrders.reduce(
        (sum: number, order: any) => sum + (order.total_amount || 0),
        0,
      );

      const salesGrowth =
        previousTotalSales > 0
          ? Math.round(((totalSales - previousTotalSales) / previousTotalSales) * 100)
          : 0;

      const ordersGrowth =
        previousOrders.length > 0
          ? Math.round(
              ((orders.length - previousOrders.length) / previousOrders.length) * 100,
            )
          : 0;

      // Get total active products from all accounts and reputation
      const [itemsData, reputationData] = await Promise.all([
        this.mlService.getAllAccountsItems(userId, {}),
        this.getAverageReputation(userId, accounts),
      ]);

      // Calculate discount metrics from raw ML data
      const allProducts = itemsData.results || [];
      
      // Fetch sale_price for each product to detect active promotions
      const mlAccounts = await this.mlService.getUserAccounts(userId);
      const productsWithSalePriceData: any[] = [];
      
      // Get sale_price for each product (this may be slow for many products)
      for (const product of allProducts) {
        try {
          const accountId = product._accountId || mlAccounts[0]?.id;
          if (accountId) {
            const salePriceData = await this.mlService.getItemSalePrice(userId, product.id, accountId);
            if (salePriceData && salePriceData.amount !== undefined) {
              productsWithSalePriceData.push({
                ...product,
                _salePriceData: salePriceData
              });
            }
          }
        } catch (e) {
          // Ignore errors for individual products
        }
      }
      
      console.log('[DEBUG] Products with active sale_price:', productsWithSalePriceData.length);
      if (productsWithSalePriceData.length > 0) {
        console.log('[DEBUG] Sample sale_price data:', JSON.stringify(productsWithSalePriceData[0]._salePriceData));
      }
      
      // Process products to detect discounts (same logic as ProductsService)
      // Also check _salePriceData for promotions
      const productsWithDiscount = allProducts.filter((item: any) => {
        const hasBasePriceDiscount = item.base_price && item.base_price > item.price;
        const hasOriginalPriceDiscount = item.original_price && item.original_price > item.price;
        const hasSalePriceDiscount = item.sale_price?.regular_amount && item.sale_price.regular_amount > item.price;
        
        // Check if this product has active promotion from sale_price API
        const productWithSalePrice = productsWithSalePriceData.find((p: any) => p.id === item.id);
        const hasActivePromotion = productWithSalePrice && 
          productWithSalePrice._salePriceData?.amount < item.price;
        
        return hasBasePriceDiscount || hasOriginalPriceDiscount || hasSalePriceDiscount || hasActivePromotion;
      });
      
      const totalDiscountedProducts = productsWithDiscount.length;
      
      // Calculate average discount percentage using sale_price data when available
      const averageDiscount = productsWithDiscount.length > 0
        ? Math.round(productsWithDiscount.reduce((sum: number, item: any) => {
            // Try to find sale_price data for this product
            const productWithSalePrice = productsWithSalePriceData.find((p: any) => p.id === item.id);
            
            // Use sale_price data if available and has discount, otherwise fall back to other fields
            let currentPrice: number;
            let originalPrice: number;
            
            if (productWithSalePrice && productWithSalePrice._salePriceData?.amount) {
              // Has promotional price
              currentPrice = productWithSalePrice._salePriceData.amount;
              originalPrice = productWithSalePrice._salePriceData.regular_amount || item.price;
            } else {
              currentPrice = item.price;
              originalPrice = item.base_price || item.original_price || item.sale_price?.regular_amount || item.price;
            }
            
            const discountPercentage = originalPrice > currentPrice 
              ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
              : 0;
            return sum + discountPercentage;
          }, 0) / productsWithDiscount.length)
        : 0;
      
      // Calculate total discount value (savings) using sale_price data when available
      const totalDiscountValue = productsWithDiscount.reduce((sum: number, item: any) => {
        // Try to find sale_price data for this product
        const productWithSalePrice = productsWithSalePriceData.find((p: any) => p.id === item.id);
        
        // Use sale_price data if available and has discount, otherwise fall back to other fields
        let currentPrice: number;
        let originalPrice: number;
        
        if (productWithSalePrice && productWithSalePrice._salePriceData?.amount) {
          currentPrice = productWithSalePrice._salePriceData.amount;
          originalPrice = productWithSalePrice._salePriceData.regular_amount || item.price;
        } else {
          currentPrice = item.price;
          originalPrice = item.base_price || item.original_price || item.sale_price?.regular_amount || item.price;
        }
        
        const discount = originalPrice > currentPrice ? originalPrice - currentPrice : 0;
        return sum + discount;
      }, 0);

      return {
        metrics: {
          totalSales,
          totalOrders: orders.length,
          activeProducts: itemsData.results?.length || 0,
          reputation: reputationData,
          pendingQuestions: questionsData.questions?.length || 0,
          salesGrowth,
          ordersGrowth,
          // Discount metrics
          totalDiscountedProducts,
          averageDiscount,
          totalDiscountValue,
          discountPercentage: allProducts.length > 0 
            ? Math.round((totalDiscountedProducts / allProducts.length) * 100)
            : 0,
        },
        accounts: accounts.map((acc: any) => ({
          id: acc.id,
          nickname: acc.mlNickname,
          isPrimary: acc.isPrimary,
        })),
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return this.getEmptyStats();
    }
  }

  private getEmptyStats() {
    return {
      metrics: {
        totalSales: 0,
        totalOrders: 0,
        activeProducts: 0,
        reputation: 0,
        pendingQuestions: 0,
        salesGrowth: 0,
        ordersGrowth: 0,
        totalDiscountedProducts: 0,
        averageDiscount: 0,
        totalDiscountValue: 0,
        discountPercentage: 0,
      },
      accounts: [],
    };
  }

  async getSalesChart(userId: string, dateFrom?: string, dateTo?: string) {
    try {
      console.log('[Dashboard getSalesChart] dateFrom:', dateFrom, 'dateTo:', dateTo);
      
      const accounts = await this.mlService.getUserAccounts(userId);
      console.log('[Dashboard getSalesChart] accounts count:', accounts.length);
      
      if (accounts.length === 0) {
        return { data: [] };
      }

      // Calculate date range
      let startDate: Date;
      let endDate: Date = dateTo ? new Date(dateTo) : new Date();

      if (dateFrom) {
        startDate = new Date(dateFrom);
      } else {
        // Default: last 30 days
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }

      console.log('[Dashboard getSalesChart] startDate:', startDate.toISOString(), 'endDate:', endDate.toISOString());

      const ordersData = await this.mlService.getAllAccountsOrders(userId, {
        date_from: startDate.toISOString(),
        date_to: endDate.toISOString(),
      });

      console.log('[Dashboard getSalesChart] ordersData:', ordersData?.results?.length, 'paging:', ordersData?.paging);

      const orders = ordersData.results || [];

      // Group by date
      const salesByDate: Record<string, number> = {};
      orders.forEach((order: any) => {
        const date = new Date(order.date_created).toLocaleDateString('pt-BR');
        salesByDate[date] = (salesByDate[date] || 0) + (order.total_amount || 0);
      });

      const data = Object.entries(salesByDate)
        .map(([date, sales]) => ({ date, sales }))
        .sort((a, b) => {
          const dateA = new Date(a.date.split('/').reverse().join('-'));
          const dateB = new Date(b.date.split('/').reverse().join('-'));
          return dateA.getTime() - dateB.getTime();
        });

      return { data };
    } catch (error) {
      console.error('Error getting sales chart:', error);
      return { data: [] };
    }
  }

  async getRecentOrders(userId: string, dateFrom?: string, dateTo?: string) {
    try {
      const accounts = await this.mlService.getUserAccounts(userId);
      
      if (accounts.length === 0) {
        return { orders: [] };
      }

      // Recent orders should always show the most recent orders, not filtered by date
      const params: any = {
        limit: 10,
      };

      const ordersData = await this.mlService.getAllAccountsOrders(userId, params);

      const orders = (ordersData.results || [])
        .slice(0, 5)
        .map((order: any) => ({
          id: order.id,
          mlOrderId: order.id.toString(),
          buyerName: order.buyer?.nickname || 'Comprador',
          total: order.total_amount,
          status: order.status,
          createdAt: order.date_created,
          accountNickname: order._accountNickname,
        }));

      return { orders };
    } catch (error) {
      console.error('Error getting recent orders:', error);
      return { orders: [] };
    }
  }

  async getTopProducts(userId: string, dateFrom?: string, dateTo?: string) {
    try {
      const accounts = await this.mlService.getUserAccounts(userId);
      
      if (accounts.length === 0) {
        return { products: [] };
      }

      const itemsData = await this.mlService.getAllAccountsItems(userId, {});
      const items = itemsData.results || [];

      if (items.length === 0) {
        return { products: [] };
      }

      // Log sample item to verify structure
      if (items.length > 0) {
        console.log('\n📦 Sample item structure:');
        console.log('  - id:', items[0].id);
        console.log('  - title:', items[0].title?.substring(0, 50));
        console.log('  - price:', items[0].price);
        console.log('  - base_price:', items[0].base_price);
        console.log('  - original_price:', items[0].original_price);
        console.log('  - sale_price:', items[0].sale_price);
        console.log('  - deal_ids:', items[0].deal_ids);
        console.log('  - thumbnail:', items[0].thumbnail);
        console.log('  - secure_thumbnail:', items[0].secure_thumbnail);
        console.log('  - pictures:', items[0].pictures ? `${items[0].pictures.length} pictures` : 'no pictures');
        if (items[0].pictures && items[0].pictures[0]) {
          console.log('  - pictures[0].url:', items[0].pictures[0].url);
          console.log('  - pictures[0].secure_url:', items[0].pictures[0].secure_url);
        }
        console.log('');
      }

      // If date range is provided, we should filter based on orders in that period
      // For now, just return top products by sold quantity (total sales)
      const products = items
        .map((item: any) => {
          // Priorizar URLs HTTPS e melhor qualidade
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
          
          // Calcular preços (original e com desconto)
          let originalPrice = null;
          let discountedPrice = item.price;
          let hasDiscount = false;
          
          // Verificar se há desconto comparando com base_price ou original_price
          if (item.base_price && item.base_price > item.price) {
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
          
          return {
            id: item.id,
            title: item.title,
            thumbnail: thumbnail,
            price: discountedPrice,
            originalPrice: originalPrice,
            hasDiscount: hasDiscount,
            discountPercentage: hasDiscount && originalPrice ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100) : 0,
            sold: item.sold_quantity || 0,
            revenue: (item.sold_quantity || 0) * discountedPrice,
            accountNickname: item._accountNickname,
          };
        })
        .sort((a: any, b: any) => b.sold - a.sold)
        .slice(0, 5);

      console.log(`\n🏆 Top 5 produtos mais vendidos:`);
      products.forEach((p: any, i: number) => {
        console.log(`  ${i + 1}. ${p.title?.substring(0, 40)} - ${p.sold} vendidos`);
        console.log(`      Thumbnail: ${p.thumbnail || 'MISSING'}`);
      });
      console.log('');

      return { products };
    } catch (error) {
      console.error('Error getting top products:', error);
      return { products: [] };
    }
  }

  private async getAverageReputation(userId: string, accounts: any[]): Promise<number> {
    try {
      if (accounts.length === 0) {
        console.log('No accounts found for reputation');
        return 0;
      }

      const reputations: number[] = [];

      for (const acc of accounts) {
        try {
          const sdk = await this.mlService.getSdk(userId, acc.id);
          const user: any = await sdk.users.getMe();
          
          console.log(`User data for ${acc.mlNickname}:`, JSON.stringify(user.seller_reputation, null, 2));
          
          if (user.seller_reputation?.level_id) {
            // Mercado Livre usa level_id que pode ser número ou string como "5_green"
            // Extrair o número do level_id
            let levelNumber: number;
            
            if (typeof user.seller_reputation.level_id === 'string') {
              // Extrair número do início da string (ex: "5_green" -> 5)
              const match = user.seller_reputation.level_id.match(/^(\d+)/);
              levelNumber = match ? parseInt(match[1], 10) : 0;
            } else {
              levelNumber = user.seller_reputation.level_id;
            }
            
            // Converter para porcentagem: level_id * 20 (1=20%, 2=40%, 3=60%, 4=80%, 5=100%)
            const reputationScore = levelNumber * 20;
            console.log(`Reputation score for ${acc.mlNickname}: ${reputationScore} (level_id: ${user.seller_reputation.level_id})`);
            reputations.push(reputationScore);
          } else if (user.seller_reputation?.power_seller_status) {
            // Usar power_seller_status como alternativa
            const powerSellerStatus = user.seller_reputation.power_seller_status;
            if (powerSellerStatus === 'platinum') {
              reputations.push(100);
            } else if (powerSellerStatus === 'gold') {
              reputations.push(80);
            } else if (powerSellerStatus === 'silver') {
              reputations.push(60);
            } else {
              reputations.push(40);
            }
            console.log(`Power seller status for ${acc.mlNickname}: ${powerSellerStatus}`);
          } else if (user.seller_reputation?.transactions) {
            // Alternativa: usar taxa de transações completadas
            const completed = user.seller_reputation.transactions.completed || 0;
            const total = user.seller_reputation.transactions.total || 1;
            const score = Math.round((completed / total) * 100);
            console.log(`Transactions score for ${acc.mlNickname}: ${score} (${completed}/${total})`);
            reputations.push(score);
          }
        } catch (error) {
          console.error(`Error fetching reputation for account ${acc.mlNickname}:`, error);
        }
      }

      console.log('All reputations:', reputations);

      if (reputations.length === 0) {
        console.log('No reputation data found, returning fallback');
        return 85; // Fallback
      }

      // Calcular média
      const average = reputations.reduce((sum, rep) => sum + rep, 0) / reputations.length;
      const result = Math.round(average);
      console.log(`Average reputation: ${result}`);
      return result;
    } catch (error) {
      console.error('Error calculating average reputation:', error);
      return 85; // Fallback
    }
  }

  async getPromotedProducts(userId: string, limit: number = 10) {
    try {
      const accounts = await this.mlService.getUserAccounts(userId);
      
      if (accounts.length === 0) {
        return { products: [] };
      }

      const itemsData = await this.mlService.getAllAccountsItems(userId, {});
      const items = itemsData.results || [];

      if (items.length === 0) {
        return { products: [] };
      }

      // Fetch sale_price for each product to detect active promotions
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

      // Filter products with discount
      const promotedProducts = items
        .map((item: any) => {
          // Priorizar URLs HTTPS e melhor qualidade
          let thumbnail = null;
          
          if (item.pictures && item.pictures[0]?.secure_url) {
            thumbnail = item.pictures[0].secure_url;
          } else if (item.secure_thumbnail) {
            thumbnail = item.secure_thumbnail;
          } else if (item.thumbnail) {
            thumbnail = item.thumbnail.replace('http://', 'https://');
          } else if (item.pictures && item.pictures[0]?.url) {
            thumbnail = item.pictures[0].url.replace('http://', 'https://');
          }
          
          // Find sale_price data for this product
          const productWithSalePrice = productsWithSalePrice.find((p: any) => p.id === item.id);
          
          // Calcular preços (original e com desconto) - using sale_price data when available
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
          
          if (!hasDiscount) {
            return null; // Skip products without discount
          }
          
          const discountPercentage = originalPrice ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100) : 0;
          
          return {
            id: item.id,
            title: item.title,
            thumbnail: thumbnail,
            price: discountedPrice,
            originalPrice: originalPrice,
            hasDiscount: hasDiscount,
            discountPercentage: discountPercentage,
            sold: item.sold_quantity || 0,
            available: item.available_quantity || 0,
            status: item.status,
            accountNickname: item._accountNickname,
          };
        })
        .filter((item: any) => item !== null) // Remove null items
        .sort((a: any, b: any) => b.discountPercentage - a.discountPercentage) // Sort by discount percentage
        .slice(0, limit);

      console.log(`\n🏷️  Top ${limit} produtos em promoção:`);
      promotedProducts.forEach((p: any, i: number) => {
        console.log(`  ${i + 1}. ${p.title?.substring(0, 40)} - ${p.discountPercentage}% OFF`);
        console.log(`      De ${p.originalPrice} por ${p.price}`);
      });
      console.log('');

      return { products: promotedProducts };
    } catch (error) {
      console.error('Error getting promoted products:', error);
      return { products: [] };
    }
  }
}
