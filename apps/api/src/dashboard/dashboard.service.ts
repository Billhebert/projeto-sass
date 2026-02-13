import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoLivreService } from '../mercadolivre/mercadolivre.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mlService: MercadoLivreService,
  ) {}

  async getStats(userId: string) {
    try {
      // Check if user has any ML accounts
      const accounts = await this.mlService.getUserAccounts(userId);
      
      if (accounts.length === 0) {
        return this.getEmptyStats();
      }

      // Get orders from last 30 days (from all accounts)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [ordersData, questionsData] = await Promise.all([
        this.mlService.getAllAccountsOrders(userId, {
          'order.date_created.from': thirtyDaysAgo.toISOString(),
        }),
        this.mlService.getAllAccountsQuestions(userId, {
          status: 'UNANSWERED',
        }),
      ]);

      const orders = ordersData.results || [];
      const totalSales = orders.reduce(
        (sum: number, order: any) => sum + (order.total_amount || 0),
        0,
      );

      // Get previous period for comparison
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const previousOrdersData = await this.mlService.getAllAccountsOrders(userId, {
        'order.date_created.from': sixtyDaysAgo.toISOString(),
        'order.date_created.to': thirtyDaysAgo.toISOString(),
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

      // Get total active products from all accounts
      const itemsData = await this.mlService.getAllAccountsItems(userId, { limit: 0 });

      return {
        metrics: {
          totalSales,
          totalOrders: orders.length,
          activeProducts: itemsData.results?.length || 0,
          reputation: 85, // Average placeholder - could calculate from all accounts
          pendingQuestions: questionsData.questions?.length || 0,
          salesGrowth,
          ordersGrowth,
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
      },
      accounts: [],
    };
  }

  async getSalesChart(userId: string) {
    try {
      const accounts = await this.mlService.getUserAccounts(userId);
      
      if (accounts.length === 0) {
        return { data: [] };
      }

      // Get orders from last 30 days (from all accounts)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const ordersData = await this.mlService.getAllAccountsOrders(userId, {
        'order.date_created.from': thirtyDaysAgo.toISOString(),
        limit: 50, // ML API max is 51
      });

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

  async getRecentOrders(userId: string) {
    try {
      const accounts = await this.mlService.getUserAccounts(userId);
      
      if (accounts.length === 0) {
        return { orders: [] };
      }

      const ordersData = await this.mlService.getAllAccountsOrders(userId, {
        limit: 10,
        sort: 'date_desc',
      });

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

  async getTopProducts(userId: string) {
    try {
      const accounts = await this.mlService.getUserAccounts(userId);
      
      if (accounts.length === 0) {
        return { products: [] };
      }

      const itemsData = await this.mlService.getAllAccountsItems(userId, { limit: 20 });
      const items = itemsData.results || [];

      if (items.length === 0) {
        return { products: [] };
      }

      const products = items
        .map((item: any) => ({
          id: item.id,
          title: item.title,
          thumbnail: item.thumbnail,
          sold: item.sold_quantity || 0,
          revenue: (item.sold_quantity || 0) * (item.price || 0),
          accountNickname: item._accountNickname,
        }))
        .sort((a: any, b: any) => b.sold - a.sold)
        .slice(0, 5);

      return { products };
    } catch (error) {
      console.error('Error getting top products:', error);
      return { products: [] };
    }
  }
}
