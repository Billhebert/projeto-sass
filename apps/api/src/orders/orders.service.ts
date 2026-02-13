import { Injectable } from '@nestjs/common';
import { MercadoLivreService } from '../mercadolivre/mercadolivre.service';

@Injectable()
export class OrdersService {
  constructor(private readonly mlService: MercadoLivreService) {}

  async findAll(userId: string, params: any = {}) {
    try {
      // Get orders from all accounts
      return this.mlService.getAllAccountsOrders(userId, params);
    } catch (error) {
      console.error('Error fetching orders:', error);
      return { results: [] };
    }
  }

  async findOne(userId: string, orderId: string, accountId?: string) {
    return this.mlService.getOrder(userId, orderId, accountId);
  }
}
