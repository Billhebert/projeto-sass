import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoLivre } from '@ml-saas/sdk-mercadolivre';

@Injectable()
export class MercadoLivreService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.clientId = this.configService.get<string>('ML_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('ML_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get<string>('ML_REDIRECT_URI') || '';
  }

  // ============================================
  // SDK INSTANCE FACTORY
  // ============================================

  private createSdkInstance(accessToken?: string, refreshToken?: string): MercadoLivre {
    return new MercadoLivre({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      redirectUri: this.redirectUri,
      accessToken,
      refreshToken,
      siteId: 'MLB',
    });
  }

  private async getSdkForAccount(account: any): Promise<MercadoLivre> {
    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      const sdk = this.createSdkInstance(account.accessToken, account.refreshToken);
      try {
        const tokens = await sdk.auth.refreshAccessToken(account.refreshToken);
        
        await this.prisma.mercadoLivreAccount.update({
          where: { id: account.id },
          data: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || '',
            tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          },
        });

        return this.createSdkInstance(tokens.access_token, tokens.refresh_token);
      } catch (error) {
        await this.prisma.mercadoLivreAccount.update({
          where: { id: account.id },
          data: { isActive: false },
        });
        throw new BadRequestException('Token expirado, reconecte a conta do Mercado Livre');
      }
    }

    return this.createSdkInstance(account.accessToken, account.refreshToken);
  }

  // ============================================
  // ACCOUNT MANAGEMENT
  // ============================================

  async getUserAccounts(userId: string) {
    return this.prisma.mercadoLivreAccount.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        mlUserId: true,
        mlNickname: true,
        mlEmail: true,
        mlSiteId: true,
        isPrimary: true,
        createdAt: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getAccountById(userId: string, accountId: string) {
    const account = await this.prisma.mercadoLivreAccount.findFirst({
      where: { id: accountId, userId, isActive: true },
    });

    if (!account) {
      throw new NotFoundException('Conta do Mercado Livre nao encontrada');
    }

    return account;
  }

  async getPrimaryAccount(userId: string) {
    let account = await this.prisma.mercadoLivreAccount.findFirst({
      where: { userId, isPrimary: true, isActive: true },
    });

    if (!account) {
      account = await this.prisma.mercadoLivreAccount.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    return account;
  }

  async setPrimaryAccount(userId: string, accountId: string) {
    await this.prisma.mercadoLivreAccount.updateMany({
      where: { userId },
      data: { isPrimary: false },
    });

    return this.prisma.mercadoLivreAccount.update({
      where: { id: accountId },
      data: { isPrimary: true },
    });
  }

  async disconnectAccount(userId: string, accountId: string) {
    await this.getAccountById(userId, accountId);

    await this.prisma.mercadoLivreAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    const remainingAccounts = await this.prisma.mercadoLivreAccount.count({
      where: { userId, isActive: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (user?.organizationId) {
      await this.prisma.organization.update({
        where: { id: user.organizationId },
        data: { mlConnected: remainingAccounts > 0 },
      });
    }

    return { message: 'Conta desconectada com sucesso' };
  }

  // ============================================
  // OAUTH
  // ============================================

  getAuthorizationUrl(state?: string): string {
    const sdk = this.createSdkInstance();
    return sdk.auth.getAuthorizationUrl({ state });
  }

  async handleOAuthCallback(userId: string, code: string) {
    const sdk = this.createSdkInstance();
    const tokens = await sdk.auth.exchangeCodeForToken(code);

    const authenticatedSdk = this.createSdkInstance(tokens.access_token, tokens.refresh_token);
    const mlUser = await authenticatedSdk.users.getMe();

    const existingAccount = await this.prisma.mercadoLivreAccount.findFirst({
      where: { userId, mlUserId: String(mlUser.id) },
    });

    if (existingAccount) {
      await this.prisma.mercadoLivreAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || '',
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          mlNickname: mlUser.nickname,
          mlEmail: mlUser.email,
          isActive: true,
        },
      });
    } else {
      const accountCount = await this.prisma.mercadoLivreAccount.count({
        where: { userId, isActive: true },
      });

      await this.prisma.mercadoLivreAccount.create({
        data: {
          userId,
          mlUserId: String(mlUser.id),
          mlNickname: mlUser.nickname,
          mlEmail: mlUser.email,
          mlSiteId: mlUser.site_id || 'MLB',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || '',
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          isPrimary: accountCount === 0,
        },
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (user?.organizationId) {
      await this.prisma.organization.update({
        where: { id: user.organizationId },
        data: { mlConnected: true },
      });
    }

    return {
      message: 'Conta do Mercado Livre conectada com sucesso',
      account: { mlUserId: mlUser.id, mlNickname: mlUser.nickname },
    };
  }

  // ============================================
  // SDK ACCESS FOR SPECIFIC ACCOUNT
  // ============================================

  async getSdk(userId: string, accountId?: string): Promise<MercadoLivre> {
    const account = accountId
      ? await this.getAccountById(userId, accountId)
      : await this.getPrimaryAccount(userId);

    if (!account) {
      throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    }

    return this.getSdkForAccount(account);
  }

  private async getAccountForSdk(userId: string, accountId?: string) {
    return accountId
      ? await this.getAccountById(userId, accountId)
      : await this.getPrimaryAccount(userId);
  }

  // ============================================
  // USERS (15 methods)
  // ============================================

  async getUser(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.users.getMe();
  }

  async getUserById(userId: string, mlUserId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.users.get(mlUserId);
  }

  async getUsersByIds(userId: string, mlUserIds: string[], accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.users.getByIds(mlUserIds);
  }

  async getUserAddresses(userId: string, mlUserId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.users.getAddresses(mlUserId);
  }

  async getUserBrands(userId: string, mlUserId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.users.getBrands(mlUserId);
  }

  async searchUserItems(userId: string, params: any = {}, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.users.searchItems(account.mlUserId, params);
  }

  async isUserBlocked(userId: string, targetUserId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.users.isBlocked(targetUserId);
  }

  async getUserResponseTime(userId: string, mlUserId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.users.getResponseTime(mlUserId);
  }

  async getUserShippingPreferences(userId: string, mlUserId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.users.getShippingPreferences(mlUserId);
  }

  async getUserFreeShippingOptions(userId: string, mlUserId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.users.getFreeShippingOptions(mlUserId);
  }

  async getUserCapacityMiddleend(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.users.getCapacityMiddleend(account.mlUserId);
  }

  async getUserShippingSchedule(userId: string, logisticType: string = 'fulfillment', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.users.getShippingSchedule(account.mlUserId, logisticType);
  }

  async searchKitComponents(userId: string, params: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.users.searchKitComponents(account.mlUserId, params);
  }

  async getSellerRecoveryStatus(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.users.getSellerRecoveryStatus(account.mlUserId);
  }

  // ============================================
  // ITEMS (28 methods)
  // ============================================

  async getItems(userId: string, accountId?: string, params: any = {}) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.users.getItems(account.mlUserId, params);
  }

  async getItem(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.get(itemId);
  }

  async getItemsByIds(userId: string, itemIds: string[], accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.getByIds(itemIds);
  }

  async createItem(userId: string, item: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.create(item);
  }

  async updateItem(userId: string, itemId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.update(itemId, data);
  }

  async pauseItem(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.pause(itemId);
  }

  async activateItem(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.activate(itemId);
  }

  async closeItem(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.close(itemId);
  }

  async deleteItem(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.delete(itemId);
  }

  async getItemDescription(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.getDescription(itemId);
  }

  async setItemDescription(userId: string, itemId: string, text: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.setDescription(itemId, text);
  }

  async getItemPictures(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.getPictures(itemId);
  }

  async uploadItemPicture(userId: string, itemId: string, source: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.uploadPicture(itemId, { source });
  }

  async deleteItemPicture(userId: string, itemId: string, pictureId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.deletePicture(itemId, pictureId);
  }

  async getItemAvailableDowngrades(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.getAvailableDowngrades(itemId);
  }

  async getItemPrices(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.getPrices(itemId);
  }

  async setItemSalePrice(userId: string, itemId: string, salePrice: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.setSalePrice(itemId, salePrice);
  }

  async deleteItemSalePrice(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.deleteSalePrice(itemId);
  }

  async getItemShippingOptions(userId: string, itemId: string, zipCode: string = '01310100', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.getShippingOptions(itemId, zipCode);
  }

  async getItemBundlePrices(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.getBundlePrices(itemId);
  }

  async getItemFiscalInformation(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.getFiscalInformation(itemId);
  }

  async setItemFiscalInformation(userId: string, itemId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.setFiscalInformation(itemId, data);
  }

  async canItemInvoice(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.canInvoice(itemId);
  }

  async getItemFiscalInformationBySku(userId: string, sku: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.getFiscalInformationBySku(sku);
  }

  async getItemPriceToWin(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.getPriceToWin(itemId);
  }

  async validateItem(userId: string, item: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.validate(item);
  }

  async relistItem(userId: string, itemId: string, options: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.relist(itemId, options);
  }

  async updateItemVariation(userId: string, itemId: string, variationId: number, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.updateVariation(itemId, variationId, data);
  }

  async deleteItemVariation(userId: string, itemId: string, variationId: number, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.deleteVariation(itemId, variationId);
  }

  // ============================================
  // ORDERS (20 methods)
  // ============================================

  async getOrders(userId: string, accountId?: string, params: any = {}) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    
    const MAX_RESULTS = 10000; // Limite da API do Mercado Livre
    
    // Verificar se há limite específico solicitado
    const requestedLimit = params.limit;
    
    if (requestedLimit && requestedLimit <= 50) {
      // Buscar apenas uma página
      return sdk.orders.getBySeller(account.mlUserId, params);
    } else {
      // Buscar todos os pedidos com paginação automática
      const allResults: any[] = [];
      let offset = params.offset || 0;
      const limit = 50;
      let hasMore = true;
      
      while (hasMore && allResults.length < MAX_RESULTS) {
        const response = await sdk.orders.getBySeller(account.mlUserId, { ...params, limit, offset });
        const results = response.results || [];
        allResults.push(...results);
        
        offset += limit;
        hasMore = results.length === limit;
        
        // Se há limite solicitado, parar quando atingir
        if (requestedLimit && allResults.length >= requestedLimit) {
          hasMore = false;
        }
      }
      
      return { 
        results: requestedLimit ? allResults.slice(0, requestedLimit) : allResults, 
        paging: { total: allResults.length, limit: allResults.length, offset: params.offset || 0 } 
      };
    }
  }

  async searchOrders(userId: string, params: any = {}, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.search(params);
  }

  async getOrder(userId: string, orderId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.get(orderId);
  }

  async getOrdersByBuyer(userId: string, buyerId: string, params: any = {}, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.getByBuyer(buyerId, params);
  }

  async getPaidOrders(userId: string, params: any = {}, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.orders.getPaid(account.mlUserId, params);
  }

  async getOrderItems(userId: string, orderId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.getItems(orderId);
  }

  async getOrderDiscounts(userId: string, orderId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.getDiscounts(orderId);
  }

  async getOrderFeedbackData(userId: string, orderId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.getFeedback(orderId);
  }

  async createSaleFeedback(userId: string, orderId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.createSaleFeedback(orderId, data);
  }

  async createPurchaseFeedback(userId: string, orderId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.createPurchaseFeedback(orderId, data);
  }

  async getOrderNotes(userId: string, orderId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.getNotes(orderId);
  }

  async createOrderNote(userId: string, orderId: string, note: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.createNote(orderId, note);
  }

  async updateOrderNote(userId: string, orderId: string, noteId: string, note: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.updateNote(orderId, noteId, note);
  }

  async deleteOrderNote(userId: string, orderId: string, noteId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.deleteNote(orderId, noteId);
  }

  async getOrderShipments(userId: string, orderId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.getShipments(orderId);
  }

  async getOrderProduct(userId: string, orderId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.getProduct(orderId);
  }

  async getOrderBillingInfo(userId: string, orderId: string, siteId: string = 'MLB', billingInfoId: string = 'default', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.getBillingInfo(orderId, siteId, billingInfoId);
  }

  async cancelOrder(userId: string, orderId: string, reason: string = 'OUT_OF_STOCK', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.cancel(orderId, reason);
  }

  async addOrderItem(userId: string, orderId: string, itemId: string, quantity: number = 1, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.addItem(orderId, itemId, quantity);
  }

  async removeOrderItem(userId: string, orderId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.orders.removeItem(orderId, itemId);
  }

  // ============================================
  // SHIPMENTS (22 methods)
  // ============================================

  async getShipment(userId: string, shipmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.get(shipmentId);
  }

  async searchShipments(userId: string, params: any = {}, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.search(params);
  }

  async getShipmentItems(userId: string, shipmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.getItems(shipmentId);
  }

  async getShipmentPayments(userId: string, shipmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.getPayments(shipmentId);
  }

  async getShipmentSla(userId: string, shipmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.getSla(shipmentId);
  }

  async getShipmentDelays(userId: string, shipmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.getDelays(shipmentId);
  }

  async getShipmentLeadTime(userId: string, shipmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.getLeadTime(shipmentId);
  }

  async getShipmentHistory(userId: string, shipmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.getHistory(shipmentId);
  }

  async getShipmentCarrier(userId: string, shipmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.getCarrier(shipmentId);
  }

  async getSellerShipmentNotifications(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.shipments.getSellerNotifications(account.mlUserId);
  }

  async markShipmentReadyToShip(userId: string, shipmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.readyToShip(shipmentId);
  }

  async splitShipment(userId: string, shipmentId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.split(shipmentId, data);
  }

  async getShipmentBillingInfo(userId: string, shipmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.getBillingInfo(shipmentId);
  }

  async setShipmentInvoiceData(userId: string, shipmentId: string, siteId: string = 'MLB', data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.setInvoiceData(shipmentId, siteId, data);
  }

  async getShipmentStatuses(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.getStatuses();
  }

  async simulateShipmentQuote(userId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.simulateQuote(data);
  }

  async updateShipmentTariff(userId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.updateTariff(data);
  }

  async getShipmentMe1Metrics(userId: string, dateFrom: string, dateTo: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.getMe1Metrics('MLB', dateFrom, dateTo);
  }

  async getShipmentTariffTemplate(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.getTariffTemplate('MLB');
  }

  async getShipmentWorkingDayMiddleend(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.shipments.getWorkingDayMiddleend(account.mlUserId);
  }

  async getShipmentLabelTemplate(userId: string, shipmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.getLabelTemplate(shipmentId);
  }

  async getShipmentLabel(userId: string, shipmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.shipments.downloadLabel(shipmentId);
  }

  // ============================================
  // QUESTIONS (13 methods)
  // ============================================

  async getQuestions(userId: string, accountId?: string, params: any = {}) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.questions.getBySeller(account.mlUserId, params);
  }

  async getQuestion(userId: string, questionId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.questions.get(questionId);
  }

  async searchQuestions(userId: string, params: any = {}, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.questions.search(params);
  }

  async getQuestionsByItem(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.questions.getByItem(itemId);
  }

  async getMyReceivedQuestions(userId: string, params: any = {}, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.questions.getMyReceived(params);
  }

  async createQuestion(userId: string, itemId: string, text: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.questions.create(itemId, text);
  }

  async answerQuestion(userId: string, questionId: number, answer: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.questions.answer(questionId, answer);
  }

  async updateQuestionAnswer(userId: string, questionId: number, answer: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.questions.updateAnswer(questionId, answer);
  }

  async deleteQuestionAnswer(userId: string, questionId: number, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.questions.deleteAnswer(questionId);
  }

  async deleteQuestion(userId: string, questionId: number, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.questions.delete(questionId);
  }

  async blockQuestion(userId: string, questionId: number, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.questions.block(questionId);
  }

  async unblockQuestion(userId: string, questionId: number, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.questions.unblock(questionId);
  }

  async getBlockedQuestions(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.questions.getBlocked();
  }

  // ============================================
  // MESSAGES (12 methods)
  // ============================================

  async getMessages(userId: string, options: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.messages.search(options);
  }

  async getMessage(userId: string, messageId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.messages.get(messageId);
  }

  async getMessagesByPack(userId: string, packId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.messages.getByPack(packId, account.mlUserId);
  }

  async getUnreadMessages(userId: string, tag: string = 'post_sale', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.messages.getUnread(tag);
  }

  async getUnreadMessagesByResource(userId: string, resource: string, tag: string = 'post_sale', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.messages.getUnreadByResource(resource, tag);
  }

  async sendMessage(userId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.messages.send(data);
  }

  async replyMessage(userId: string, messageId: string, text: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.messages.reply(messageId, text);
  }

  async uploadMessageAttachment(userId: string, file: { source: string; filename: string }, tag: string = 'post_sale', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.messages.uploadAttachment(file, tag);
  }

  async deleteMessageAttachment(userId: string, attachmentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.messages.deleteAttachment(attachmentId);
  }

  async getMessageActionGuide(userId: string, packId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.messages.getActionGuide(packId);
  }

  async getMessageCapsAvailable(userId: string, packId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.messages.getCapsAvailable(packId);
  }

  async createMessageThread(userId: string, packId: string, messages: any[], accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.messages.createThread(packId, messages);
  }

  // ============================================
  // CLAIMS (18 methods)
  // ============================================

  async getClaim(userId: string, claimId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.get(claimId);
  }

  async getClaimDetail(userId: string, claimId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.getDetail(claimId);
  }

  async getClaimMessages(userId: string, claimId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.getMessages(claimId);
  }

  async sendClaimMessage(userId: string, claimId: string, message: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.sendMessage(claimId, message);
  }

  async openDispute(userId: string, claimId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.openDispute(claimId, data);
  }

  async getExpectedResolutions(userId: string, claimId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.getExpectedResolutions(claimId);
  }

  async getPartialRefundOffers(userId: string, claimId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.getPartialRefundOffers(claimId);
  }

  async acceptPartialRefund(userId: string, claimId: string, offerId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.acceptPartialRefund(claimId, offerId);
  }

  async getClaimEvidences(userId: string, claimId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.getEvidences(claimId);
  }

  async addClaimEvidence(userId: string, claimId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.addEvidence(claimId, data);
  }

  async addClaimAttachmentEvidence(userId: string, claimId: string, file: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.addAttachmentEvidence(claimId, file);
  }

  async getClaimChanges(userId: string, claimId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.getChanges(claimId);
  }

  async getClaimReturns(userId: string, claimId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.getReturns(claimId);
  }

  async createClaimReturn(userId: string, claimId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.createReturn(claimId, data);
  }

  async getClaimReturnReviews(userId: string, claimId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.getReturnReviews(claimId);
  }

  async getClaimReturnReasons(userId: string, claimId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.getReturnReasons(claimId);
  }

  async cancelClaimReturn(userId: string, returnId: string, reason: string = 'seller_cancelled', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.cancelReturn(returnId, reason);
  }

  async confirmClaimReceipt(userId: string, returnId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.claims.confirmReceipt(returnId);
  }

  // ============================================
  // PROMOTIONS (12 methods)
  // ============================================

  async getUserPromotions(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    
    console.log(`[getUserPromotions] Fetching all promotions for user ${userId}, account ${account.mlNickname}`);
    
    // Buscar todas as promoções com paginação
    const allPromotions: any[] = [];
    let hasMore = true;
    let offset = 0;
    const limit = 50; // Máximo permitido pela API do ML
    let totalExpected = 0;
    
    let pageCount = 0;
    while (hasMore && offset < 10000) { // Limite de segurança
      try {
        pageCount++;
        console.log(`[getUserPromotions] Fetching page ${pageCount} with offset=${offset}, limit=${limit}`);
        
        const response: any = await sdk.promotions.getUserPromotions(account.mlUserId, { limit, offset }, 'v2');
        
        // Log da resposta completa na primeira página
        if (pageCount === 1) {
          console.log(`[getUserPromotions] First page full response:`, JSON.stringify(response, null, 2));
        }
        
        if (response.results && response.results.length > 0) {
          allPromotions.push(...response.results);
          console.log(`[getUserPromotions] Page ${pageCount}: Fetched ${response.results.length} promotions (total: ${allPromotions.length})`);
          
          if (response.paging) {
            totalExpected = response.paging.total;
            console.log(`[getUserPromotions] Page ${pageCount} paging: total=${response.paging.total}, offset=${response.paging.offset}, limit=${response.paging.limit}`);
            
            // Verifica se há mais páginas
            hasMore = allPromotions.length < response.paging.total;
            console.log(`[getUserPromotions] Has more pages: ${hasMore} (${allPromotions.length} < ${response.paging.total})`);
          } else {
            hasMore = response.results.length === limit;
            console.log(`[getUserPromotions] No paging info, hasMore based on result length: ${hasMore}`);
          }
          
          offset += limit;
        } else {
          console.log(`[getUserPromotions] No results in page ${pageCount}, stopping`);
          hasMore = false;
        }
      } catch (error) {
        console.error(`[getUserPromotions] Error fetching promotions:`, error);
        hasMore = false;
      }
    }
    
    console.log(`[getUserPromotions] Total promotions fetched: ${allPromotions.length} (expected: ${totalExpected})`);
    
    return {
      results: allPromotions,
      paging: {
        total: allPromotions.length,
        limit: allPromotions.length,
        offset: 0
      }
    };
  }

  async getItemSalePrice(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.items.getSalePrice(itemId);
  }

  async getItemPromotions(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.promotions.getItemPromotions(itemId);
  }

  async getPromotion(userId: string, promoId: string, promotionType: string = 'DEAL', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.promotions.getPromotion(promoId, promotionType);
  }

  async getPromotionItems(userId: string, promoId: string, promotionType: string = 'DEAL', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.promotions.getPromotionItems(promoId, promotionType);
  }

  async getPromotionOffer(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.promotions.getOffer(itemId);
  }

  async createPromotion(userId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.promotions.createPromotion(data);
  }

  async updatePromotion(userId: string, promoId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.promotions.updatePromotion(promoId, data);
  }

  async activatePromotion(userId: string, promoId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.promotions.activatePromotion(promoId);
  }

  async pausePromotion(userId: string, promoId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.promotions.pausePromotion(promoId);
  }

  async finishPromotion(userId: string, promoId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.promotions.finishPromotion(promoId);
  }

  async addItemToPromotion(userId: string, promoId: string, itemId: string, discount: any = {}, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.promotions.addItemToPromotion(promoId, itemId, discount);
  }

  async removeItemFromPromotion(userId: string, promoId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.promotions.removeItemFromPromotion(promoId, itemId);
  }

  // ============================================
  // ADVERTISING (17 methods)
  // ============================================

  async listAdvertisers(userId: string, productId?: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.listAdvertisers(productId || 'PADS');
  }

  async getCampaigns(
    userId: string, 
    advertiserId: string, 
    accountId?: string,
    dateFrom?: string,
    dateTo?: string
  ) {
    const sdk = await this.getSdk(userId, accountId);
    
    // Default to last 30 days if no dates provided
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const effectiveDateFrom = dateFrom || thirtyDaysAgo.toISOString().split('T')[0];
    const effectiveDateTo = dateTo || today.toISOString().split('T')[0];
    
    console.log(`[getCampaigns] Fetching campaigns with metrics from ${effectiveDateFrom} to ${effectiveDateTo}`);
    
    // Buscar todas as campanhas com paginação automática e métricas
    const allResults: any[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;
    
    // Metrics to request from ML API
    const metrics = ['clicks', 'prints', 'cost', 'cpc', 'ctr', 'acos', 'roas', 'conversion_rate', 'sales_quantity', 'sales_amount'];
    
    while (hasMore) {
      const response = await sdk.advertising.searchCampaigns('MLB', advertiserId, { 
        limit, 
        offset,
        dateFrom: effectiveDateFrom,
        dateTo: effectiveDateTo,
        metrics
      });
      
      console.log(`[getCampaigns] Page ${offset/limit + 1} response:`, JSON.stringify(response, null, 2));
      
      const results = response.results || response.campaigns || [];
      console.log(`[getCampaigns] Page ${offset/limit + 1} results count: ${results.length}`);
      if (results.length > 0) {
        console.log(`[getCampaigns] First campaign:`, JSON.stringify(results[0], null, 2));
      }
      
      allResults.push(...results);
      
      offset += limit;
      hasMore = results.length === limit;
    }
    
    console.log(`[getCampaigns] Fetched ${allResults.length} campaigns with metrics`);
    
    // Log sample of metrics from first campaign if available
    const campaignsWithMetrics = allResults.filter((c: any) => c.metrics);
    console.log(`[getCampaigns] Campaigns with metrics: ${campaignsWithMetrics.length}/${allResults.length}`);
    if (campaignsWithMetrics.length > 0) {
      console.log(`[getCampaigns] Sample metrics:`, JSON.stringify(campaignsWithMetrics[0].metrics, null, 2));
    }
    
    return { results: allResults, campaigns: allResults };
  }

  async getCampaignMetrics(userId: string, advertiserId: string, campaignId: string, dateFrom: string, dateTo: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.getCampaignMetrics('MLB', advertiserId, campaignId, dateFrom, dateTo);
  }

  async listDisplayCampaigns(userId: string, advertiserId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.listDisplayCampaigns('MLB', advertiserId);
  }

  async getCampaignCreatives(userId: string, advertiserId: string, campaignId: string, lineItemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.getCampaignCreatives('MLB', advertiserId, campaignId, lineItemId);
  }

  async getProductAd(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.getProductAd('MLB', itemId);
  }

  async searchProductAds(userId: string, advertiserId: string, options: any = {}, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.searchProductAds('MLB', advertiserId, options);
  }

  async searchProductAdsByFilter(userId: string, advertiserId: string, itemId: string, dateFrom?: string, dateTo?: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.searchProductAdsByFilter('MLB', advertiserId, itemId, dateFrom, dateTo);
  }

  async getProductAdCampaigns(userId: string, advertiserId: string, campaignId: string, dateFrom: string, dateTo: string, metrics?: string[], accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.getProductAdCampaigns('MLB', advertiserId, campaignId, dateFrom, dateTo, metrics);
  }

  async listAdGroups(userId: string, advertiserId: string, options: any = {}, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.listAdGroups('MLB', advertiserId, options);
  }

  async getAdsFromAdGroup(userId: string, advertiserId: string, adGroupId: string, dateFrom: string, dateTo: string, metrics?: string[], accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.getAdsFromAdGroup('MLB', advertiserId, adGroupId, dateFrom, dateTo, metrics);
  }

  async getAdGroupDetails(userId: string, advertiserId: string, adGroupId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.getAdGroupDetails('MLB', advertiserId, adGroupId);
  }

  async getAdvertisingBonifications(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.getBonifications('MLB');
  }

  async createProductAd(userId: string, itemId: string, campaignId: number, bid: number, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.createProductAd('MLB', itemId, campaignId, bid);
  }

  async updateProductAd(userId: string, itemId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.updateProductAd('MLB', itemId, data);
  }

  async pauseProductAd(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.pauseProductAd('MLB', itemId);
  }

  async activateProductAd(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.advertising.activateProductAd('MLB', itemId);
  }

  // ============================================
  // BILLING (22 methods)
  // ============================================

  async getBillingDocuments(userId: string, options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.getDocuments(options);
  }

  async getUserInvoices(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.billing.getUserInvoices(account.mlUserId, 'MLB');
  }

  async getAuthorizedXml(userId: string, documentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.billing.getAuthorizedXml(account.mlUserId, documentId);
  }

  async getOrderInvoice(userId: string, orderId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.billing.getOrderInvoice(account.mlUserId, orderId);
  }

  async getTaxRules(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.billing.getTaxRules(account.mlUserId);
  }

  async getTaxRuleMessages(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.billing.getTaxRuleMessages(account.mlUserId);
  }

  async getAdditionalMessages(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.billing.getAdditionalMessages(account.mlUserId);
  }

  async createAdditionalMessage(userId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.billing.createAdditionalMessage(account.mlUserId, data);
  }

  async updateAdditionalMessage(userId: string, messageId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.billing.updateAdditionalMessage(account.mlUserId, messageId, data);
  }

  async deleteAdditionalMessage(userId: string, messageId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.billing.deleteAdditionalMessage(account.mlUserId, messageId);
  }

  async getInvoiceErrors(userId: string, siteId: string, errorCode: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.getInvoiceErrors(siteId, errorCode);
  }

  async getBillingPeriods(userId: string, options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.getBillingPeriods(options);
  }

  async getPeriodDocuments(userId: string, periodId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.getPeriodDocuments(periodId);
  }

  async getSummaryDetails(userId: string, periodId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.getSummaryDetails(periodId);
  }

  async getMLDetails(userId: string, periodId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.getMLDetails(periodId);
  }

  async getMPDetails(userId: string, periodId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.getMPDetails(periodId);
  }

  async getPaymentDetails(userId: string, periodId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.getPaymentDetails(periodId);
  }

  async getPerceptions(userId: string, periodId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.getPerceptions(periodId);
  }

  async downloadLegalDocument(userId: string, documentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.downloadLegalDocument(documentId);
  }

  async downloadBillingReport(userId: string, reportId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.downloadReport(reportId);
  }

  async getPeriodReports(userId: string, periodId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.getPeriodReports(periodId);
  }

  async getPackInvoice(userId: string, packId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.billing.getPackInvoice(packId);
  }

  // ============================================
  // REPORTS (7 methods)
  // ============================================

  async listReports(userId: string, options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.reports.list(options);
  }

  async getReport(userId: string, reportId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.reports.get(reportId);
  }

  async createReport(userId: string, type: string, options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.reports.create(type, options);
  }

  async downloadReport(userId: string, reportId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.reports.download(reportId);
  }

  async deleteReport(userId: string, reportId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.reports.delete(reportId);
  }

  async getBillingOrderDetails(userId: string, orderId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.reports.getBillingOrderDetails(orderId);
  }

  async getOrderDetails(userId: string, options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.reports.getOrderDetails(options);
  }

  // ============================================
  // CATALOG (18 methods)
  // ============================================

  async searchCatalog(userId: string, options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.search(options);
  }

  async getCatalogProduct(userId: string, productId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.getProduct(productId);
  }

  async listUserProducts(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.catalog.listUserProducts(account.mlUserId);
  }

  async getUserProduct(userId: string, userProductId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.getUserProduct(userProductId);
  }

  async updateUserProductStock(userId: string, userProductId: string, stock: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.updateUserProductStock(userProductId, stock);
  }

  async getUserProductBundles(userId: string, userProductId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.getUserProductBundles(userProductId);
  }

  async getCatalogSuggestions(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.catalog.getSuggestions(account.mlUserId);
  }

  async getCatalogSuggestionQuota(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.catalog.getSuggestionQuota(account.mlUserId);
  }

  async getCatalogSuggestion(userId: string, suggestionId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.getSuggestion(suggestionId);
  }

  async getCatalogSuggestionDescription(userId: string, suggestionId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.getSuggestionDescription(suggestionId);
  }

  async getCatalogSuggestionValidations(userId: string, suggestionId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.getSuggestionValidations(suggestionId);
  }

  async acceptCatalogSuggestion(userId: string, suggestionId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.acceptSuggestion(suggestionId);
  }

  async rejectCatalogSuggestion(userId: string, suggestionId: string, reason: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.rejectSuggestion(suggestionId, reason);
  }

  async listAvailableDomains(userId: string, siteId: string = 'MLB', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.listAvailableDomains(siteId);
  }

  async getTechnicalSpecs(userId: string, domainId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.getTechnicalSpecs(domainId);
  }

  async getTechnicalSpecsInput(userId: string, domainId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.getTechnicalSpecsInput(domainId);
  }

  async getActiveDomains(userId: string, siteId: string = 'MLB', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.getActiveDomains(siteId);
  }

  async importDCe(userId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.catalog.importDCe(data);
  }

  // ============================================
  // PRICING (14 methods)
  // ============================================

  async getPriceSuggestions(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.pricing.getSuggestions(account.mlUserId);
  }

  async getPriceSuggestionDetails(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.pricing.getSuggestionDetails(itemId);
  }

  async applyPriceSuggestion(userId: string, itemId: string, suggestedPrice: number, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.pricing.applySuggestion(itemId, suggestedPrice);
  }

  async getPriceRules(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.pricing.getRules(account.mlUserId);
  }

  async createPriceRule(userId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.pricing.createRule(account.mlUserId, data);
  }

  async updatePriceRule(userId: string, ruleId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.pricing.updateRule(account.mlUserId, ruleId, data);
  }

  async deletePriceRule(userId: string, ruleId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.pricing.deleteRule(account.mlUserId, ruleId);
  }

  async getPriceAutomationStatus(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.pricing.getAutomationStatus(account.mlUserId);
  }

  async activatePriceAutomation(userId: string, itemId: string, config: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.pricing.activateAutomation(itemId, config);
  }

  async deactivatePriceAutomation(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.pricing.deactivateAutomation(itemId);
  }

  async getProductPriceRules(userId: string, productId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.pricing.getProductRules(productId);
  }

  async getStandardPrice(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.pricing.getStandardPrice(itemId);
  }

  async getPricingItemPrices(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.pricing.getItemPrices(itemId);
  }

  async getPriceToWin(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.pricing.getPriceToWin(itemId);
  }

  // ============================================
  // FEEDBACK (7 methods)
  // ============================================

  async getOrderFeedback(userId: string, orderId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.feedback.getFromOrder(orderId);
  }

  async getFeedback(userId: string, feedbackId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.feedback.get(feedbackId);
  }

  async getFeedbackReply(userId: string, feedbackId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.feedback.getReply(feedbackId);
  }

  async replyFeedback(userId: string, feedbackId: string, message: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.feedback.reply(feedbackId, message);
  }

  async updateFeedbackReply(userId: string, feedbackId: string, message: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.feedback.updateReply(feedbackId, message);
  }

  async deleteFeedbackReply(userId: string, feedbackId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.feedback.deleteReply(feedbackId);
  }

  async getItemReviews(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.feedback.getItemReviews(itemId);
  }

  // ============================================
  // REPUTATION (7 methods)
  // ============================================

  async getSellerReputation(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.reputation.getSellerReputation(account.mlUserId);
  }

  async getItemReputation(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.reputation.getItemReputation(itemId);
  }

  async getItemPerformance(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.reputation.getItemPerformance(itemId);
  }

  async getUserProductPerformance(userId: string, userProductId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.reputation.getUserProductPerformance(userProductId);
  }

  async getReputationItemReviews(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.reputation.getItemReviews(itemId);
  }

  async getReputationSellerRecoveryStatus(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.reputation.getSellerRecoveryStatus(account.mlUserId);
  }

  async getSellersMetrics(userId: string, sellerIds?: string[], accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    const ids = sellerIds || [account.mlUserId];
    return sdk.reputation.getSellersMetrics(ids);
  }

  // ============================================
  // VISITS (3 methods)
  // ============================================

  async getUserVisits(userId: string, dateFrom: string, dateTo: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.visits.getUserVisits(account.mlUserId, dateFrom, dateTo);
  }

  async getVisitsTimeWindow(userId: string, last: number = 7, unit: string = 'day', ending: string = 'today', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.visits.getVisitsTimeWindow(account.mlUserId, last, unit, ending);
  }

  async getItemVisits(userId: string, itemId: string, dateFrom: string, dateTo: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.visits.getItemVisits(itemId, dateFrom, dateTo);
  }

  // ============================================
  // TRENDS (4 methods)
  // ============================================

  async getTrendsBySite(userId: string, siteId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.trends.getBySite(siteId);
  }

  async getTrends(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.trends.getBrazilTrends();
  }

  async getTrendsByCategory(userId: string, categoryId: string, siteId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.trends.getByCategory(categoryId, siteId);
  }

  async getCategoryTrends(userId: string, categoryId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.trends.getBrazilCategoryTrends(categoryId);
  }

  // ============================================
  // CATEGORIES (8 methods) - PUBLIC ENDPOINTS
  // ============================================

  async getCategory(userId: string, categoryId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.categories.get(categoryId);
  }

  async getCategoryAttributes(userId: string, categoryId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.categories.getAttributes(categoryId);
  }

  async getCategoryPromotionPacks(userId: string, categoryId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.categories.getPromotionPacks(categoryId);
  }

  async getCategoryShippingPreferences(userId: string, categoryId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.categories.getShippingPreferences(categoryId);
  }

  async getCategoryByDomain(userId: string, domainId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.categories.getByDomain(domainId);
  }

  async getCategoryTechnicalSpecs(userId: string, categoryId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.categories.getTechnicalSpecs(categoryId);
  }

  async getDomainCompatibilities(userId: string, domainId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.categories.getDomainCompatibilities(domainId);
  }

  async getCatalogRequirements(userId: string, categoryId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.categories.getCatalogRequirements(categoryId);
  }

  // ============================================
  // FAVORITES (4 methods)
  // ============================================

  async getFavorites(userId: string, options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.favorites.list(options);
  }

  async addFavorite(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.favorites.add(itemId);
  }

  async removeFavorite(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.favorites.remove(itemId);
  }

  async isFavorite(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.favorites.isFavorite(itemId);
  }

  // ============================================
  // VARIATIONS (7 methods)
  // ============================================

  async getVariations(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.variations.list(itemId);
  }

  async getVariation(userId: string, itemId: string, variationId: number, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.variations.get(itemId, variationId);
  }

  async createVariation(userId: string, itemId: string, variation: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.variations.create(itemId, variation);
  }

  async updateVariation(userId: string, itemId: string, variationId: number, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.variations.update(itemId, variationId, data);
  }

  async deleteVariation(userId: string, itemId: string, variationId: number, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.variations.delete(itemId, variationId);
  }

  async updateVariationStock(userId: string, itemId: string, variationId: number, stock: number, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.variations.updateStock(itemId, variationId, stock);
  }

  async updateVariationPrice(userId: string, itemId: string, variationId: number, price: number, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.variations.updatePrice(itemId, variationId, price);
  }

  // ============================================
  // FULFILLMENT (10 methods)
  // ============================================

  async getFulfillmentInventory(userId: string, inventoryId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.fulfillment.getInventory(inventoryId);
  }

  async getFulfillmentInventoryWithAttributes(userId: string, inventoryId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.fulfillment.getInventoryWithAttributes(inventoryId);
  }

  async updateFulfillmentStock(userId: string, inventoryId: string, stock: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.fulfillment.updateStock(inventoryId, stock);
  }

  async searchFulfillmentOperations(userId: string, params: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.fulfillment.searchOperations(params);
  }

  async getFulfillmentCapacityMiddleend(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.fulfillment.getCapacityMiddleend(account.mlUserId);
  }

  async getFulfillmentNodeCapacity(userId: string, nodeId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.fulfillment.getNodeCapacity(nodeId);
  }

  async getFulfillmentMe1Metrics(userId: string, siteId: string, dateFrom: string, dateTo: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.fulfillment.getMe1Metrics(siteId, dateFrom, dateTo);
  }

  async simulateFulfillmentQuotation(userId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.fulfillment.simulateQuotation(data);
  }

  async updateFulfillmentTariff(userId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.fulfillment.updateTariff(data);
  }

  async getFulfillmentTariffTemplate(userId: string, siteId: string = 'MLB', accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.fulfillment.getTariffTemplate(siteId);
  }

  // ============================================
  // SEARCH (8 methods) - PUBLIC ENDPOINTS
  // ============================================

  async searchAll(userId: string, options: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.search.search(options);
  }

  async search(userId: string, query: string, options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.search.byQuery(query, options);
  }

  async searchByCategory(userId: string, categoryId: string, options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.search.byCategory(categoryId, options);
  }

  async searchBySeller(userId: string, sellerId: string, options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.search.bySeller(sellerId, options);
  }

  async searchByPriceRange(userId: string, minPrice: number, maxPrice: number, options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.search.byPriceRange(minPrice, maxPrice, options);
  }

  async searchByCondition(userId: string, condition: 'new' | 'used', options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.search.byCondition(condition, options);
  }

  async getSearchSuggestions(userId: string, query: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.search.getSuggestions(query);
  }

  async searchCatalogItems(userId: string, options: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.search.searchCatalog(options);
  }

  // ============================================
  // SITES (9 methods) - PUBLIC ENDPOINTS
  // ============================================

  async getSites(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.sites.list();
  }

  async getSite(userId: string, siteId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.sites.get(siteId);
  }

  async getSiteListingTypes(userId: string, siteId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.sites.getListingTypes(siteId);
  }

  async getSiteListingPrices(userId: string, siteId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.sites.getListingPrices(siteId);
  }

  async getSiteCategories(userId: string, siteId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.sites.getCategories(siteId);
  }

  async getSitePaymentMethods(userId: string, siteId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.sites.getPaymentMethods(siteId);
  }

  async getSiteShippingMethods(userId: string, siteId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.sites.getShippingMethods(siteId);
  }

  async searchSiteDomain(userId: string, siteId: string, query: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.sites.searchDomain(siteId, query);
  }

  async getSiteGoldSpecialListingTypes(userId: string, siteId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.sites.getGoldSpecialListingTypes(siteId);
  }

  // ============================================
  // CURRENCIES (4 methods) - PUBLIC ENDPOINTS
  // ============================================

  async getCurrencies(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.currencies.list();
  }

  async getCurrency(userId: string, currencyId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.currencies.get(currencyId);
  }

  async convertCurrency(userId: string, from: string, to: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.currencies.convert(from, to);
  }

  async getUSDRate(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.currencies.getUSDRate();
  }

  // ============================================
  // PAYMENTS (10 methods) - NEW
  // ============================================

  async getPayment(userId: string, paymentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.payments.get(paymentId);
  }

  async getPaymentMethod(userId: string, siteId: string, methodId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.payments.getMethod(siteId, methodId);
  }

  async listPaymentMethods(userId: string, siteId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.payments.listMethods(siteId);
  }

  async getMercadoPagoPayment(userId: string, paymentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.payments.getMercadoPago(paymentId);
  }

  async createPayment(userId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.payments.create(data);
  }

  async updatePayment(userId: string, paymentId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.payments.update(paymentId, data);
  }

  async cancelPayment(userId: string, paymentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.payments.cancel(paymentId);
  }

  async refundPayment(userId: string, paymentId: string, amount?: number, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.payments.refund(paymentId, amount);
  }

  async getPaymentRefunds(userId: string, paymentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.payments.getRefunds(paymentId);
  }

  async getPaymentTransactionDetails(userId: string, paymentId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.payments.getTransactionDetails(paymentId);
  }

  // ============================================
  // MODERATIONS (5 methods) - NEW
  // ============================================

  async getLastModeration(userId: string, moderationId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.moderations.getLast(moderationId);
  }

  async searchModerations(userId: string, options: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.moderations.search(options);
  }

  async getPausedModerations(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.moderations.getPaused(account.mlUserId);
  }

  async getImageDiagnosis(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.moderations.getImageDiagnosis(itemId);
  }

  async getCatalogQualityStatus(userId: string, includeItems?: boolean, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.moderations.getCatalogQualityStatus(account.mlUserId, includeItems);
  }

  // ============================================
  // PICTURES (5 methods) - NEW
  // ============================================

  async uploadPictureForItem(userId: string, itemId: string, source: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.pictures.uploadForItem(itemId, source);
  }

  async addPictureToItem(userId: string, itemId: string, source: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.pictures.addToItem(itemId, source);
  }

  async removePictureFromItem(userId: string, itemId: string, pictureId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.pictures.removeFromItem(itemId, pictureId);
  }

  async getPicturesFromItem(userId: string, itemId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.pictures.getFromItem(itemId);
  }

  async uploadPictureForCertifier(userId: string, options: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.pictures.uploadForCertifier({ ...options, sellerId: account.mlUserId });
  }

  // ============================================
  // NOTIFICATIONS (4 methods) - NEW
  // ============================================

  async listNotifications(userId: string, options?: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.notifications.list(options);
  }

  async getNotification(userId: string, notificationId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.notifications.get(notificationId);
  }

  async deleteNotification(userId: string, notificationId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.notifications.delete(notificationId);
  }

  async markNotificationAsRead(userId: string, notificationId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.notifications.markAsRead(notificationId);
  }

  // ============================================
  // FLEX (10 methods) - NEW
  // ============================================

  async getFlexSubscriptions(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.flex.getSubscriptions('MLB', account.mlUserId);
  }

  async createFlexSubscription(userId: string, serviceId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.flex.createSubscription('MLB', account.mlUserId, serviceId);
  }

  async updateFlexSubscription(userId: string, serviceId: string, data: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.flex.updateSubscription('MLB', account.mlUserId, serviceId, data);
  }

  async cancelFlexSubscription(userId: string, serviceId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.flex.cancelSubscription('MLB', account.mlUserId, serviceId);
  }

  async listFlexCoverageZones(userId: string, serviceId: string, showAvailable?: boolean, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.flex.listCoverageZones('MLB', account.mlUserId, serviceId, showAvailable);
  }

  async addFlexCoverageZone(userId: string, serviceId: string, zone: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.flex.addCoverageZone('MLB', account.mlUserId, serviceId, zone);
  }

  async removeFlexCoverageZone(userId: string, serviceId: string, zoneId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.flex.removeCoverageZone('MLB', account.mlUserId, serviceId, zoneId);
  }

  async listFlexHolidays(userId: string, serviceId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.flex.listHolidays('MLB', account.mlUserId, serviceId);
  }

  async addFlexHoliday(userId: string, serviceId: string, holiday: any, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.flex.addHoliday('MLB', account.mlUserId, serviceId, holiday);
  }

  async removeFlexHoliday(userId: string, serviceId: string, holidayId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    const account = await this.getAccountForSdk(userId, accountId);
    if (!account) throw new BadRequestException('Nenhuma conta do Mercado Livre conectada');
    return sdk.flex.removeHoliday('MLB', account.mlUserId, serviceId, holidayId);
  }

  // ============================================
  // LOCATIONS (10 methods) - PUBLIC ENDPOINTS
  // ============================================

  async listCountries(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.locations.listCountries();
  }

  async getCountry(userId: string, countryId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.locations.getCountry(countryId);
  }

  async listStates(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.locations.listStates();
  }

  async getStatesByCountry(userId: string, countryId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.locations.getStates(countryId);
  }

  async getState(userId: string, stateId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.locations.getState(stateId);
  }

  async listCities(userId: string, stateId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.locations.listCities(stateId);
  }

  async getCity(userId: string, cityId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.locations.getCity(cityId);
  }

  async searchZipCode(userId: string, countryId: string, zipCode: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.locations.searchZipCode(countryId, zipCode);
  }

  async searchZipCodeRange(userId: string, countryId: string, zipCodeFrom: string, zipCodeTo: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.locations.searchZipCodeRange(countryId, zipCodeFrom, zipCodeTo);
  }

  async getDCECountries(userId: string, accountId?: string) {
    const sdk = await this.getSdk(userId, accountId);
    return sdk.locations.getDCECountries();
  }

  // ============================================
  // AGGREGATE DATA FROM ALL ACCOUNTS
  // ============================================

  async getAllAccountsOrders(userId: string, params: any = {}) {
    console.log('[getAllAccountsOrders] params:', JSON.stringify(params));
    
    const accounts = await this.getUserAccounts(userId);
    console.log('[getAllAccountsOrders] accounts:', accounts.length);
    
    const allOrders: any[] = [];
    
    // Verificar se tem date_from E limit - se tiver ambos, buscar só o necessário com filtro de data
    const hasDateFrom = params.date_from !== undefined;
    const hasLimit = params.limit !== undefined;
    
    // Default sort to date_desc if not specified
    const sort = params.sort || 'date_desc';
    
    console.log('[getAllAccountsOrders] Received params:', JSON.stringify(params), 'Using sort:', sort);
    
    if (hasDateFrom && hasLimit) {
      // Busca rápida com filtro de data (para paginação)
      // A API do ML só aceita max 50 por requisição
      const requestedLimit = parseInt(params.limit) || 50;
      const requestedOffset = parseInt(params.offset) || 0;
      // ML API requer formato ISO 8601 completo com hora
      const dateFrom = params.date_from ? `${params.date_from}T00:00:00.000-00:00` : undefined;
      const dateTo = params.date_to ? `${params.date_to}T23:59:59.999-00:00` : undefined;
      
      console.log(`[getAllAccountsOrders] Paginated query: limit=${requestedLimit}, offset=${requestedOffset}, dateFrom=${dateFrom}, dateTo=${dateTo}, sort=${sort}`);
      
      let totalFromAllAccounts = 0;
      
      // PRIMEIRO: Buscar o total de cada conta para calcular a paginação correta
      for (const acc of accounts) {
        try {
          const sdk = await this.getSdk(userId, acc.id);
          
          // Busca só 1 item para pegar o total
          const countParams: any = { 
            limit: 1, 
            offset: 0 
          };
          countParams['order.date_created.from'] = dateFrom;
          countParams['order.date_created.to'] = dateTo;
          if (sort) {
            countParams.sort = sort;
          }
          
          if (params.status) {
            countParams['order.status'] = params.status;
          }
          
          const countResult = await sdk.orders.getBySeller(acc.mlUserId, countParams);
          if (countResult.paging) {
            totalFromAllAccounts += countResult.paging.total;
          }
        } catch (error) {
          console.error(`Error getting count for account ${acc.mlNickname}:`, error);
        }
      }
      
      console.log(`[getAllAccountsOrders] Total orders in date range: ${totalFromAllAccounts}`);
      
      // SEGUNDO: Buscar apenas os itens da página atual
      // A API do ML só aceita max 50, então calculamos quantas chamadas precisamos
      const ML_MAX_LIMIT = 50;
      let itemsToSkip = requestedOffset;
      let itemsToCollect = requestedLimit;
      let currentAccountIndex = 0;
      let collectedCount = 0;
      
      // Precisamos descobrir qual conta começa o offset solicitado
      // e quantos itens pegar de cada conta
      let ordersFromCurrentPage: any[] = [];
      
      for (const acc of accounts) {
        try {
          const sdk = await this.getSdk(userId, acc.id);
          
          // Pega o total desta conta
          const countParams: any = { limit: 1, offset: 0 };
          if (dateFrom) {
            countParams['order.date_created.from'] = dateFrom;
          }
          if (dateTo) {
            countParams['order.date_created.to'] = dateTo;
          }
          if (sort) {
            countParams.sort = sort;
          }
          if (params.status) {
            countParams['order.status'] = params.status;
          }
          
          const countResult = await sdk.orders.getBySeller(acc.mlUserId, countParams);
          const accountTotal = countResult.paging?.total || 0;
          
          if (accountTotal === 0) continue;
          
          // Verifica se esta conta tem itens que precisamos
          if (itemsToSkip >= accountTotal) {
            // Pula esta conta inteira
            itemsToSkip -= accountTotal;
            continue;
          }
          
          // Esta conta tem itens que precisamos
          const accountOffset = itemsToSkip;
          const accountLimit = Math.min(itemsToCollect, accountTotal - itemsToSkip);
          
          // Busca os itens desta conta
          let fetchedFromAccount = 0;
          let currentBatchOffset = accountOffset;
          
          while (fetchedFromAccount < accountLimit) {
            const batchSize = Math.min(ML_MAX_LIMIT, accountLimit - fetchedFromAccount);
            
            const queryParams: any = { 
              limit: batchSize, 
              offset: currentBatchOffset 
            };
            queryParams['order.date_created.from'] = dateFrom;
            queryParams['order.date_created.to'] = dateTo;
            if (sort) {
              queryParams.sort = sort;
            }
            
            if (params.status) {
              queryParams['order.status'] = params.status;
            }
            
            const orders = await sdk.orders.getBySeller(acc.mlUserId, queryParams);
            
            if (orders.results && orders.results.length > 0) {
              orders.results.forEach((order: any) => {
                order._accountId = acc.id;
                order._accountNickname = acc.mlNickname;
              });
              ordersFromCurrentPage.push(...orders.results);
              fetchedFromAccount += orders.results.length;
              currentBatchOffset += orders.results.length;
            } else {
              break;
            }
          }
          
          itemsToCollect -= fetchedFromAccount;
          itemsToSkip = 0; // Depois da primeira conta, não pulamos mais
          
          if (itemsToCollect <= 0) break; // Já temos tudo que precisamos
          
        } catch (error) {
          console.error(`Error fetching orders for account ${acc.mlNickname}:`, error);
        }
      }
      
      console.log(`[getAllAccountsOrders] Fetched ${ordersFromCurrentPage.length} orders for current page`);
      
      return { 
        results: ordersFromCurrentPage,
        paging: {
          total: totalFromAllAccounts,
          limit: requestedLimit,
          offset: requestedOffset
        }
      };
    }
    
    if (hasDateFrom) {
      // Buscar todos os dados com paginação completa usando chunks de data
      // ML API requer formato ISO 8601 completo com hora
      const dateFromParam = params.date_from || '2020-01-01';
      const dateToParam = params.date_to || new Date().toISOString().split('T')[0];
      const dateFrom = `${dateFromParam}T00:00:00.000-00:00`;
      const dateTo = `${dateToParam}T23:59:59.999-00:00`;
      const dateChunks = this.splitDateRange(dateFrom, dateTo);
      
      console.log(`[getAllAccountsOrders] hasDateFrom=true, dateFrom=${dateFrom}, dateTo=${dateTo}, chunks=${dateChunks.length}`);
      console.log(`[getAllAccountsOrders] Date chunks:`, JSON.stringify(dateChunks.slice(0, 3)));
      
      for (const acc of accounts) {
        try {
          const sdk = await this.getSdk(userId, acc.id);
          
          for (const chunk of dateChunks) {
            let offset = 0;
            const limit = 50;
            let hasMore = true;
            
            while (hasMore) {
              try {
                const chunkParams = {
                  'order.date_created.from': chunk.from,
                  'order.date_created.to': chunk.to,
                  limit,
                  offset,
                };
                
                console.log(`[getAllAccountsOrders] Calling getBySeller with params:`, JSON.stringify(chunkParams));
                
                const orders = await sdk.orders.getBySeller(acc.mlUserId, chunkParams);
                
                if (orders.results && orders.results.length > 0) {
                  orders.results.forEach((order: any) => {
                    order._accountId = acc.id;
                    order._accountNickname = acc.mlNickname;
                  });
                  allOrders.push(...orders.results);
                  
                  offset += limit;
                  hasMore = orders.results.length === limit;
                } else {
                  hasMore = false;
                }
              } catch (error) {
                console.error(`Error fetching orders chunk for account ${acc.mlNickname}:`, error);
                hasMore = false;
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching orders for account ${acc.mlNickname}:`, error);
        }
      }
      
      return { 
        results: allOrders,
        paging: { total: allOrders.length, limit: allOrders.length, offset: 0 }
      };
    }
    
    // Sem date_from - usar o comportamento original (com ou sem limit)
    if (hasLimit) {
      // Paginação rápida
      const limit = parseInt(params.limit) || 50;
      const offset = parseInt(params.offset) || 0;
      // ML API requer formato ISO 8601 completo com hora
      const queryDateFrom = params.date_from ? `${params.date_from}T00:00:00.000-00:00` : undefined;
      const queryDateTo = params.date_to ? `${params.date_to}T23:59:59.999-00:00` : undefined;
      
      const queryParams: any = { limit, offset };
      if (queryDateFrom) {
        queryParams['order.date_created.from'] = queryDateFrom;
        queryParams['order.date_created.to'] = queryDateTo;
      }
      if (sort) {
        queryParams.sort = sort;
      }
      
      console.log(`[getAllAccountsOrders] Paginated: limit=${limit}, offset=${offset}, dateFrom=${queryDateFrom}, dateTo=${queryDateTo}, sort=${sort}`);
      
      let lastPaging: any = { total: 0, limit, offset };
      
      for (const acc of accounts) {
        try {
          const sdk = await this.getSdk(userId, acc.id);
          const orders = await sdk.orders.getBySeller(acc.mlUserId, queryParams);
          
          if (orders.results) {
            orders.results.forEach((order: any) => {
              order._accountId = acc.id;
              order._accountNickname = acc.mlNickname;
            });
            allOrders.push(...orders.results);
          }
          if (orders.paging) {
            lastPaging = orders.paging;
          }
        } catch (error) {
          console.error(`Error fetching orders for account ${acc.mlNickname}:`, error);
        }
      }
      
      return { 
        results: allOrders,
        paging: lastPaging
      };
    }

    // Sem date_from e sem limit - busca completa de TODOS os pedidos
    const MAX_RESULTS = 100000; // Aumentado para 100k para permitir praticamente todos os dados
    const searchDateFrom = params.date_from;
    const searchDateTo = params.date_to || new Date().toISOString().split('T')[0];
    const from = searchDateFrom || '2020-01-01';
    const chunks = this.splitDateRange(from, searchDateTo);

    console.log(`[getAllAccountsOrders] Full fetch from ${from} to ${searchDateTo} in ${chunks.length} chunks`);

    for (const acc of accounts) {
      try {
        const sdk = await this.getSdk(userId, acc.id);
        
        for (const chunk of chunks) {
          if (allOrders.length >= MAX_RESULTS) {
            console.log(`[getAllAccountsOrders] Reached MAX_RESULTS limit (${MAX_RESULTS})`);
            break;
          }
          
          let offset = 0;
          const limit = 50;
          let hasMore = true;
          
          while (hasMore && allOrders.length < MAX_RESULTS) {
            try {
              const chunkParams = {
                ...params,
                'order.date_created.from': chunk.from,
                'order.date_created.to': chunk.to,
                limit,
                offset,
              };
              
              const orders = await sdk.orders.getBySeller(acc.mlUserId, chunkParams);
              
              if (orders.results && orders.results.length > 0) {
                orders.results.forEach((order: any) => {
                  order._accountId = acc.id;
                  order._accountNickname = acc.mlNickname;
                });
                allOrders.push(...orders.results);
                
                offset += limit;
                hasMore = orders.results.length === limit;
              } else {
                hasMore = false;
              }
            } catch (error) {
              console.error(`Error fetching orders chunk for account ${acc.mlNickname}:`, error);
              hasMore = false;
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching orders for account ${acc.mlNickname}:`, error);
      }
    }

    console.log(`[getAllAccountsOrders] Total orders fetched: ${allOrders.length}`);
    return { results: allOrders };
  }

  private splitDateRange(from: string, to: string): { from: string; to: string }[] {
    const chunks: { from: string; to: string }[] = [];
    const start = new Date(from);
    const end = new Date(to);
    
    let current = new Date(start);
    
    while (current < end) {
      const chunkEnd = new Date(current);
      chunkEnd.setMonth(chunkEnd.getMonth() + 1);
      
      if (chunkEnd > end) {
        chunks.push({
          from: current.toISOString().replace('.000', ''),
          to: end.toISOString().replace('.000', ''),
        });
      } else {
        chunks.push({
          from: current.toISOString().replace('.000', ''),
          to: chunkEnd.toISOString().replace('.000', ''),
        });
      }
      
      current = chunkEnd;
    }
    
    return chunks;
  }

  async getAllAccountsItems(userId: string, params: any = {}) {
    const accounts = await this.getUserAccounts(userId);
    const allItems: any[] = [];

    for (const acc of accounts) {
      try {
        const sdk = await this.getSdk(userId, acc.id);
        
        console.log(`\n========================================`);
        console.log(`Buscando itens para conta: ${acc.mlNickname}`);
        console.log(`ML User ID: ${acc.mlUserId}`);
        console.log(`Account ID interno: ${acc.id}`);
        console.log(`========================================\n`);
        
        // Buscar TODOS os itens com paginação automática
        let offset = 0;
        const limit = 50; // Máximo permitido pelo ML
        let hasMore = true;
        let totalItemsForAccount = 0;
        const itemIdsForAccount: string[] = [];
        
        while (hasMore) {
          try {
            console.log(`Buscando página offset=${offset}, limit=${limit}...`);
            
            const searchResponse = await sdk.users.searchItems(acc.mlUserId, {
              status: 'active',
              offset: offset,
              limit: limit,
            });
            
            const pageItemIds = searchResponse.results || [];
            const paging = searchResponse.paging;
            
            console.log(`✓ Página retornou ${pageItemIds.length} itens`);
            console.log(`  Total disponível: ${paging?.total || 0}`);
            
            itemIdsForAccount.push(...pageItemIds);
            totalItemsForAccount += pageItemIds.length;
            
            // Verificar se há mais páginas
            if (paging && paging.total > (offset + limit)) {
              offset += limit;
              hasMore = true;
            } else {
              hasMore = false;
            }
            
          } catch (pageError: any) {
            console.error(`✗ Erro ao buscar página offset=${offset}:`, pageError.message || pageError);
            hasMore = false; // Parar paginação em caso de erro
          }
        }
        
        console.log(`\n✓ Total de IDs coletados para ${acc.mlNickname}: ${totalItemsForAccount}`);
        
        if (itemIdsForAccount.length > 0) {
          console.log(`Buscando detalhes dos ${itemIdsForAccount.length} itens em lotes de 20...`);
          
          // Buscar detalhes em lotes de 20 (limite do multiget do ML)
          // Incluindo sale_price para detectar promoções
          for (let i = 0; i < itemIdsForAccount.length; i += 20) {
            const batch = itemIdsForAccount.slice(i, i + 20);
            
            try {
              const itemsDetails = await sdk.items.getByIds(batch, [
                'id', 'site_id', 'title', 'seller_id', 'category_id', 'price', 
                'base_price', 'original_price', 'currency_id', 'initial_quantity',
                'available_quantity', 'sold_quantity', 'listing_type_id', 'status',
                'date_created', 'last_updated', 'condition', 'permalink', 'thumbnail',
                'thumbnail_id', 'pictures', 'video_id', 'descriptions', 'accepts_mercadopago',
                'non_mercado_pago_payment_methods', 'shipping', 'international_delivery_mode',
                'seller_address', 'seller_contact', 'location', 'geolocation', 'coverage_areas',
                'attributes', 'variations', 'warnings', 'listing_date', 'domain_id',
                'parent_item_id', 'differential_pricing', 'deal_ids', 'automatic_relist',
                'date_last_updated_original', 'health', 'catalog_product_id', 'seller_custom_field',
                'parent_id', 'dimensional_weight', 'order_backend', 'sale_price',
                'attributes_inputted', 'variations_enabled', 'kit_description', 'product_trace_id',
                'product_id', 'sub_status', 'added_immediately', 'show_email', 'show_phone',
                'last_updated_original', 'mandatory_relist', 'price_config', 'minimum_price',
                'maximum_price', 'status_original', 'currency_original', 'tags'
              ]);
              
              if (Array.isArray(itemsDetails)) {
                itemsDetails.forEach((item: any) => {
                  if (item.body) {
                    const itemWithAccount = item.body as any;
                    itemWithAccount._accountId = acc.id;
                    itemWithAccount._accountNickname = acc.mlNickname;
                    allItems.push(itemWithAccount);
                  }
                });
              }
              
              console.log(`  ✓ Lote ${Math.floor(i / 20) + 1}/${Math.ceil(itemIdsForAccount.length / 20)}: ${itemsDetails.length} itens processados`);
            } catch (e: any) {
              console.error(`  ✗ Erro ao buscar detalhes do lote ${Math.floor(i / 20) + 1}:`, e.message || e);
            }
          }
        }
        
        console.log(`✓ Total de itens com detalhes para ${acc.mlNickname}: ${allItems.filter(item => item._accountId === acc.id).length}\n`);
        
      } catch (error: any) {
        console.error(`\n✗ ERRO FATAL ao buscar itens da conta ${acc.mlNickname}:`);
        console.error(`  Mensagem: ${error.message || error}`);
        console.error(`  Status: ${error.status || error.statusCode || 'unknown'}`);
        console.error(`  Detalhes:`, error.response?.data || error);
        console.error(`\n`);
      }
    }

    console.log(`\n========================================`);
    console.log(`✓ TOTAL GERAL: ${allItems.length} itens encontrados`);
    console.log(`========================================\n`);
    
    return { results: allItems };
  }

  async getAllAccountsQuestions(userId: string, params: any = {}) {
    const accounts = await this.getUserAccounts(userId);
    const allQuestions: any[] = [];

    for (const acc of accounts) {
      try {
        const sdk = await this.getSdk(userId, acc.id);
        
        // Fetch all questions with pagination
        let offset = 0;
        const limit = 200;
        let hasMore = true;
        
        while (hasMore) {
          const queryParams = { ...params, limit, offset };
          const questions = await sdk.questions.getBySeller(acc.mlUserId, queryParams);
          
          if (questions.questions && questions.questions.length > 0) {
            questions.questions.forEach((q: any) => {
              q._accountId = acc.id;
              q._accountNickname = acc.mlNickname;
            });
            allQuestions.push(...questions.questions);
            
            // Check if there are more questions
            if (questions.questions.length < limit) {
              hasMore = false;
            } else {
              offset += limit;
            }
          } else {
            hasMore = false;
          }
        }
      } catch (error) {
        console.error(`Error fetching questions for account ${acc.mlNickname}:`, error);
      }
    }

    return { questions: allQuestions };
  }

  async getAllAccountsMessages(userId: string, params: any = {}) {
    const accounts = await this.getUserAccounts(userId);
    const allMessages: any[] = [];

    for (const acc of accounts) {
      try {
        const sdk = await this.getSdk(userId, acc.id);
        const messages: any = await sdk.messages.search({ ...params, seller_id: acc.mlUserId });
        
        if (messages.results) {
          messages.results.forEach((m: any) => {
            m._accountId = acc.id;
            m._accountNickname = acc.mlNickname;
          });
          allMessages.push(...messages.results);
        }
      } catch (error) {
        console.error(`Error fetching messages for account ${acc.mlNickname}:`, error);
      }
    }

    return { results: allMessages };
  }

  async getAllAccountsShipments(userId: string, params: any = {}) {
    const accounts = await this.getUserAccounts(userId);
    const allShipments: any[] = [];

    for (const acc of accounts) {
      try {
        const sdk = await this.getSdk(userId, acc.id);
        
        // Buscar shipments usando a API de shipments
        let offset = params.offset || 0;
        const limit = Math.min(params.limit || 50, 50);
        let hasMore = true;
        
        while (hasMore) {
          try {
            const searchParams: any = {
              ...params,
              offset,
              limit,
            };
            
            // Adicionar order_id se especificado
            if (params.order_id) {
              searchParams.order_id = params.order_id;
            }
            
            const shipmentsResponse: any = await sdk.shipments.search(searchParams);
            
            if (shipmentsResponse.results && shipmentsResponse.results.length > 0) {
              shipmentsResponse.results.forEach((shipment: any) => {
                shipment._accountId = acc.id;
                shipment._accountNickname = acc.mlNickname;
              });
              allShipments.push(...shipmentsResponse.results);
              
              offset += limit;
              hasMore = shipmentsResponse.results.length === limit;
            } else {
              hasMore = false;
            }
          } catch (error) {
            console.error(`Error fetching shipments page for account ${acc.mlNickname}:`, error);
            hasMore = false;
          }
        }
      } catch (error) {
        console.error(`Error fetching shipments for account ${acc.mlNickname}:`, error);
      }
    }

    return { results: allShipments };
  }

  async getAllAccountsOrdersWithShipmentsFull(userId: string, params: any = {}) {
    const accounts = await this.getUserAccounts(userId);
    const allData: any[] = [];

    for (const acc of accounts) {
      try {
        const sdk = await this.getSdk(userId, acc.id);
        
        // Primeiro, buscar todos os pedidos
        let offset = 0;
        const limit = 50;
        let hasMore = true;
        
        while (hasMore) {
          const orders = await sdk.orders.getBySeller(acc.mlUserId, { ...params, limit, offset });
          
          if (orders.results && orders.results.length > 0) {
            // Para cada pedido, buscar os detalhes do shipment
            for (const order of orders.results as any[]) {
              (order as any)._accountId = acc.id;
              (order as any)._accountNickname = acc.mlNickname;
              
              // Se o pedido tem shipping, buscar detalhes
              if (order.shipping && order.shipping.id) {
                try {
                  const shipmentDetails = await sdk.shipments.get(order.shipping.id);
                  (order as any).shipmentDetails = shipmentDetails;
                } catch (shipmentError) {
                  console.error(`Error fetching shipment ${order.shipping.id}:`, shipmentError);
                }
              }
            }
            
            allData.push(...orders.results);
            
            offset += limit;
            hasMore = orders.results.length === limit;
          } else {
            hasMore = false;
          }
        }
      } catch (error) {
        console.error(`Error fetching orders with shipments for account ${acc.mlNickname}:`, error);
      }
    }

    return { results: allData };
  }
}
