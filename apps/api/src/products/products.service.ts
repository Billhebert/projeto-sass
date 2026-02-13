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

      const products = items.map((item: any) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        currency: item.currency_id,
        availableQuantity: item.available_quantity,
        soldQuantity: item.sold_quantity,
        thumbnail: item.thumbnail,
        status: item.status,
        permalink: item.permalink,
        categoryId: item.category_id,
        condition: item.condition,
        listingType: item.listing_type_id,
        createdAt: item.date_created,
        accountId: item._accountId,
        accountNickname: item._accountNickname,
      }));

      return {
        products,
        total: products.length,
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      return {
        products: [],
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
}
