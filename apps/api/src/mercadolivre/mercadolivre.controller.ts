import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MercadoLivreService } from './mercadolivre.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@ApiTags('mercadolivre')
@Controller('mercadolivre')
export class MercadoLivreController {
  constructor(
    private readonly mlService: MercadoLivreService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================
  // ACCOUNT MANAGEMENT
  // ============================================

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar contas ML conectadas' })
  async getAccounts(@Request() req: any) {
    return this.mlService.getUserAccounts(req.user.sub);
  }

  @Post('accounts/:accountId/primary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Definir conta como principal' })
  async setPrimaryAccount(
    @Request() req: any,
    @Param('accountId') accountId: string,
  ) {
    return this.mlService.setPrimaryAccount(req.user.sub, accountId);
  }

  @Delete('accounts/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desconectar conta ML' })
  async disconnectAccount(
    @Request() req: any,
    @Param('accountId') accountId: string,
  ) {
    return this.mlService.disconnectAccount(req.user.sub, accountId);
  }

  // ============================================
  // OAUTH
  // ============================================

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter URL de autorizacao do ML' })
  async getAuthUrl(@Request() req: any) {
    const clientId = this.configService.get<string>('ML_CLIENT_ID');
    const redirectUri = this.configService.get<string>('ML_REDIRECT_URI') || '';
    // Generate a secure random state
    const state = require('crypto').randomBytes(32).toString('hex');
    
    const authUrl = `https://auth.mercadolibre.com/authorization?client_id=${clientId}&response_type=code&platform_id=MLB&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    return { authUrl, state };
  }

  @Post('callback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Processar callback do OAuth ML' })
  async handleCallback(
    @Request() req: any,
    @Body() body: { code: string; state?: string },
  ) {
    return this.mlService.handleOAuthCallback(req.user.sub, body.code);
  }

  // ============================================
  // ML USER
  // ============================================

  @Get('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter dados do usuario no ML' })
  @ApiQuery({ name: 'accountId', required: false })
  async getUser(
    @Request() req: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getUser(req.user.sub, accountId);
  }

  // ============================================
  // ITEMS
  // ============================================

  @Get('items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar itens do vendedor' })
  @ApiQuery({ name: 'accountId', required: false, description: 'ID da conta ML (se nao informado, usa todas as contas)' })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getItems(
    @Request() req: any,
    @Query('accountId') accountId?: string,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    if (accountId) {
      return this.mlService.getItems(req.user.sub, accountId, { offset, limit });
    }
    // Return items from all accounts
    return this.mlService.getAllAccountsItems(req.user.sub, { offset, limit });
  }

  @Get('items/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de um item' })
  @ApiQuery({ name: 'accountId', required: false })
  async getItem(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getItem(req.user.sub, itemId, accountId);
  }

  @Put('items/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar um item' })
  @ApiQuery({ name: 'accountId', required: false })
  async updateItem(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Body() data: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.updateItem(req.user.sub, itemId, data, accountId);
  }

  // ============================================
  // ORDERS
  // ============================================

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar pedidos' })
  @ApiQuery({ name: 'accountId', required: false, description: 'ID da conta ML (se nao informado, usa todas as contas)' })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  @ApiQuery({ name: 'sort', required: false, description: 'Ordenação: date_desc, date_asc, amount_desc, amount_asc' })
  async getOrders(
    @Request() req: any,
    @Query('accountId') accountId?: string,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('sort') sort?: string,
  ) {
    const params: any = { offset, limit };
    if (status) {
      params['order.status'] = status;
    }
    if (dateFrom) {
      params.date_from = dateFrom;
    }
    if (dateTo) {
      params.date_to = dateTo;
    }
    if (sort) {
      params.sort = sort;
    }

    console.log('[Orders Controller] Received sort:', sort, 'Full params:', params);

    if (accountId) {
      return this.mlService.getOrders(req.user.sub, accountId, params);
    }
    // Return orders from all accounts
    return this.mlService.getAllAccountsOrders(req.user.sub, params);
  }

  @Get('orders/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de um pedido' })
  @ApiQuery({ name: 'accountId', required: false })
  async getOrder(
    @Request() req: any,
    @Param('orderId') orderId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getOrder(req.user.sub, orderId, accountId);
  }

  // ============================================
  // SHIPMENTS
  // ============================================

  @Get('shipments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar shipments com status completo' })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, description: 'Status do shipment' })
  async getShipments(
    @Request() req: any,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.mlService.getAllAccountsShipments(req.user.sub, { offset, limit, status });
  }

  // ============================================
  // QUESTIONS
  // ============================================

  @Get('questions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar perguntas' })
  @ApiQuery({ name: 'accountId', required: false, description: 'ID da conta ML (se nao informado, usa todas as contas)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'sort', required: false, description: 'Ordenação: date_desc, date_asc' })
  async getQuestions(
    @Request() req: any,
    @Query('accountId') accountId?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
  ) {
    const params: any = { status };
    if (sort) {
      params.sort = sort;
    }
    
    if (accountId) {
      return this.mlService.getQuestions(req.user.sub, accountId, params);
    }
    // Return questions from all accounts
    return this.mlService.getAllAccountsQuestions(req.user.sub, params);
  }

  @Post('questions/:questionId/answer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Responder pergunta' })
  @ApiQuery({ name: 'accountId', required: false })
  async answerQuestion(
    @Request() req: any,
    @Param('questionId') questionId: number,
    @Body('answer') answer: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.answerQuestion(req.user.sub, questionId, answer, accountId);
  }

  // ============================================
  // REPUTATION
  // ============================================

  @Get('reputation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter reputacao do vendedor' })
  @ApiQuery({ name: 'accountId', required: false })
  async getReputation(
    @Request() req: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getSellerReputation(req.user.sub, accountId);
  }

  @Get('reputation/item/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter reputacao de um item' })
  @ApiQuery({ name: 'accountId', required: false })
  async getItemReputation(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getItemReputation(req.user.sub, itemId, accountId);
  }

  // ============================================
  // SHIPMENTS
  // ============================================

  @Get('shipments/:shipmentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de um envio' })
  @ApiQuery({ name: 'accountId', required: false })
  async getShipment(
    @Request() req: any,
    @Param('shipmentId') shipmentId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getShipment(req.user.sub, shipmentId, accountId);
  }

  @Get('shipments/:shipmentId/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter historico de um envio' })
  @ApiQuery({ name: 'accountId', required: false })
  async getShipmentHistory(
    @Request() req: any,
    @Param('shipmentId') shipmentId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getShipmentHistory(req.user.sub, shipmentId, accountId);
  }

  @Get('shipments/:shipmentId/label')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Baixar etiqueta de envio' })
  @ApiQuery({ name: 'accountId', required: false })
  async getShipmentLabel(
    @Request() req: any,
    @Param('shipmentId') shipmentId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getShipmentLabel(req.user.sub, shipmentId, accountId);
  }

  @Post('shipments/:shipmentId/ready-to-ship')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar envio como pronto para enviar' })
  @ApiQuery({ name: 'accountId', required: false })
  async markShipmentReadyToShip(
    @Request() req: any,
    @Param('shipmentId') shipmentId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.markShipmentReadyToShip(req.user.sub, shipmentId, accountId);
  }

  // ============================================
  // MESSAGES
  // ============================================

  @Get('messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar mensagens' })
  @ApiQuery({ name: 'accountId', required: false })
  async getMessages(
    @Request() req: any,
    @Query() query: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getMessages(req.user.sub, query, accountId);
  }

  @Get('messages/:messageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de uma mensagem' })
  @ApiQuery({ name: 'accountId', required: false })
  async getMessage(
    @Request() req: any,
    @Param('messageId') messageId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getMessage(req.user.sub, messageId, accountId);
  }

  @Get('messages/pack/:packId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar mensagens de um pacote' })
  @ApiQuery({ name: 'accountId', required: false })
  async getMessagesByPack(
    @Request() req: any,
    @Param('packId') packId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getMessagesByPack(req.user.sub, packId, accountId);
  }

  @Post('messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enviar mensagem' })
  @ApiQuery({ name: 'accountId', required: false })
  async sendMessage(
    @Request() req: any,
    @Body() data: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.sendMessage(req.user.sub, data, accountId);
  }

  @Post('messages/:messageId/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Responder mensagem' })
  @ApiQuery({ name: 'accountId', required: false })
  async replyMessage(
    @Request() req: any,
    @Param('messageId') messageId: string,
    @Body('text') text: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.replyMessage(req.user.sub, messageId, text, accountId);
  }

  // ============================================
  // CLAIMS
  // ============================================

  @Get('claims/:claimId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de uma reclamacao' })
  @ApiQuery({ name: 'accountId', required: false })
  async getClaim(
    @Request() req: any,
    @Param('claimId') claimId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getClaim(req.user.sub, claimId, accountId);
  }

  @Get('claims/:claimId/detail')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes completos de uma reclamacao' })
  @ApiQuery({ name: 'accountId', required: false })
  async getClaimDetail(
    @Request() req: any,
    @Param('claimId') claimId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getClaimDetail(req.user.sub, claimId, accountId);
  }

  @Get('claims/:claimId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar mensagens de uma reclamacao' })
  @ApiQuery({ name: 'accountId', required: false })
  async getClaimMessages(
    @Request() req: any,
    @Param('claimId') claimId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getClaimMessages(req.user.sub, claimId, accountId);
  }

  @Post('claims/:claimId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enviar mensagem em uma reclamacao' })
  @ApiQuery({ name: 'accountId', required: false })
  async sendClaimMessage(
    @Request() req: any,
    @Param('claimId') claimId: string,
    @Body('message') message: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.sendClaimMessage(req.user.sub, claimId, message, accountId);
  }

  // ============================================
  // PROMOTIONS
  // ============================================

  @Get('promotions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar promocoes do usuario' })
  @ApiQuery({ name: 'accountId', required: false })
  async getUserPromotions(
    @Request() req: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getUserPromotions(req.user.sub, accountId);
  }

  @Get('promotions/item/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar promocoes de um item' })
  @ApiQuery({ name: 'accountId', required: false })
  async getItemPromotions(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getItemPromotions(req.user.sub, itemId, accountId);
  }

  @Post('promotions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar promocao' })
  @ApiQuery({ name: 'accountId', required: false })
  async createPromotion(
    @Request() req: any,
    @Body() data: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.createPromotion(req.user.sub, data, accountId);
  }

  @Post('promotions/:promoId/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ativar promocao' })
  @ApiQuery({ name: 'accountId', required: false })
  async activatePromotion(
    @Request() req: any,
    @Param('promoId') promoId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.activatePromotion(req.user.sub, promoId, accountId);
  }

  @Post('promotions/:promoId/pause')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pausar promocao' })
  @ApiQuery({ name: 'accountId', required: false })
  async pausePromotion(
    @Request() req: any,
    @Param('promoId') promoId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.pausePromotion(req.user.sub, promoId, accountId);
  }

  // ============================================
  // ADVERTISING
  // ============================================

  @Get('advertising/advertisers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar anunciantes' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  async listAdvertisers(
    @Request() req: any,
    @Query('productId') productId?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.listAdvertisers(req.user.sub, productId, accountId);
  }

  @Get('advertising/:advertiserId/campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar campanhas de um anunciante' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Data final (YYYY-MM-DD)' })
  async getCampaigns(
    @Request() req: any,
    @Param('advertiserId') advertiserId: string,
    @Query('accountId') accountId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    console.log(`[Controller] getCampaigns - advertiserId: ${advertiserId}, dateFrom: ${dateFrom}, dateTo: ${dateTo}`);
    return this.mlService.getCampaigns(req.user.sub, advertiserId, accountId, dateFrom, dateTo);
  }

  @Get('advertising/:advertiserId/campaigns/:campaignId/metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter metricas de uma campanha' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  async getCampaignMetrics(
    @Request() req: any,
    @Param('advertiserId') advertiserId: string,
    @Param('campaignId') campaignId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getCampaignMetrics(req.user.sub, advertiserId, campaignId, dateFrom, dateTo, accountId);
  }

  @Get('advertising/product/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter anuncio de produto' })
  @ApiQuery({ name: 'accountId', required: false })
  async getProductAd(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getProductAd(req.user.sub, itemId, accountId);
  }

  @Post('advertising/product/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar anuncio de produto' })
  @ApiQuery({ name: 'accountId', required: false })
  async createProductAd(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Body() body: { campaignId: number; bid: number },
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.createProductAd(req.user.sub, itemId, body.campaignId, body.bid, accountId);
  }

  @Post('advertising/product/:itemId/pause')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pausar anuncio de produto' })
  @ApiQuery({ name: 'accountId', required: false })
  async pauseProductAd(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.pauseProductAd(req.user.sub, itemId, accountId);
  }

  @Post('advertising/product/:itemId/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ativar anuncio de produto' })
  @ApiQuery({ name: 'accountId', required: false })
  async activateProductAd(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.activateProductAd(req.user.sub, itemId, accountId);
  }

  // ============================================
  // BILLING
  // ============================================

  @Get('billing/documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar documentos de cobranca' })
  @ApiQuery({ name: 'accountId', required: false })
  async getBillingDocuments(
    @Request() req: any,
    @Query() query: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getBillingDocuments(req.user.sub, query, accountId);
  }

  @Get('billing/invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar notas fiscais' })
  @ApiQuery({ name: 'accountId', required: false })
  async getUserInvoices(
    @Request() req: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getUserInvoices(req.user.sub, accountId);
  }

  @Get('billing/periods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar periodos de cobranca' })
  @ApiQuery({ name: 'accountId', required: false })
  async getBillingPeriods(
    @Request() req: any,
    @Query() query: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getBillingPeriods(req.user.sub, query, accountId);
  }

  // ============================================
  // REPORTS
  // ============================================

  @Get('reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar relatorios' })
  @ApiQuery({ name: 'accountId', required: false })
  async listReports(
    @Request() req: any,
    @Query() query: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.listReports(req.user.sub, query, accountId);
  }

  @Get('reports/:reportId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de um relatorio' })
  @ApiQuery({ name: 'accountId', required: false })
  async getReport(
    @Request() req: any,
    @Param('reportId') reportId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getReport(req.user.sub, reportId, accountId);
  }

  @Post('reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar relatorio' })
  @ApiQuery({ name: 'accountId', required: false })
  async createReport(
    @Request() req: any,
    @Body() body: { type: string; options?: any },
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.createReport(req.user.sub, body.type, body.options, accountId);
  }

  @Get('reports/:reportId/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Baixar relatorio' })
  @ApiQuery({ name: 'accountId', required: false })
  async downloadReport(
    @Request() req: any,
    @Param('reportId') reportId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.downloadReport(req.user.sub, reportId, accountId);
  }

  // ============================================
  // CATALOG
  // ============================================

  @Get('catalog/search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar produtos no catalogo' })
  @ApiQuery({ name: 'accountId', required: false })
  async searchCatalog(
    @Request() req: any,
    @Query() query: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.searchCatalog(req.user.sub, query, accountId);
  }

  @Get('catalog/product/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter produto do catalogo' })
  @ApiQuery({ name: 'accountId', required: false })
  async getCatalogProduct(
    @Request() req: any,
    @Param('productId') productId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getCatalogProduct(req.user.sub, productId, accountId);
  }

  @Get('catalog/suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter sugestoes de catalogo' })
  @ApiQuery({ name: 'accountId', required: false })
  async getCatalogSuggestions(
    @Request() req: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getCatalogSuggestions(req.user.sub, accountId);
  }

  // ============================================
  // PRICING
  // ============================================

  @Get('pricing/suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter sugestoes de preco' })
  @ApiQuery({ name: 'accountId', required: false })
  async getPriceSuggestions(
    @Request() req: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getPriceSuggestions(req.user.sub, accountId);
  }

  @Get('pricing/suggestions/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de sugestao de preco' })
  @ApiQuery({ name: 'accountId', required: false })
  async getPriceSuggestionDetails(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getPriceSuggestionDetails(req.user.sub, itemId, accountId);
  }

  @Post('pricing/suggestions/:itemId/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aplicar sugestao de preco' })
  @ApiQuery({ name: 'accountId', required: false })
  async applyPriceSuggestion(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Body('suggestedPrice') suggestedPrice: number,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.applyPriceSuggestion(req.user.sub, itemId, suggestedPrice, accountId);
  }

  @Get('pricing/price-to-win/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter preco para ganhar' })
  @ApiQuery({ name: 'accountId', required: false })
  async getPriceToWin(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getPriceToWin(req.user.sub, itemId, accountId);
  }

  // ============================================
  // FEEDBACK
  // ============================================

  @Get('feedback/order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter feedback de um pedido' })
  @ApiQuery({ name: 'accountId', required: false })
  async getOrderFeedback(
    @Request() req: any,
    @Param('orderId') orderId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getOrderFeedback(req.user.sub, orderId, accountId);
  }

  @Post('feedback/:feedbackId/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Responder feedback' })
  @ApiQuery({ name: 'accountId', required: false })
  async replyFeedback(
    @Request() req: any,
    @Param('feedbackId') feedbackId: string,
    @Body('message') message: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.replyFeedback(req.user.sub, feedbackId, message, accountId);
  }

  @Get('feedback/item/:itemId/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter avaliacoes de um item' })
  @ApiQuery({ name: 'accountId', required: false })
  async getItemReviews(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getItemReviews(req.user.sub, itemId, accountId);
  }

  // ============================================
  // VISITS
  // ============================================

  @Get('visits/user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter visitas do usuario' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  async getUserVisits(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getUserVisits(req.user.sub, dateFrom, dateTo, accountId);
  }

  @Get('visits/item/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter visitas de um item' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  async getItemVisits(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getItemVisits(req.user.sub, itemId, dateFrom, dateTo, accountId);
  }

  // ============================================
  // TRENDS
  // ============================================

  @Get('trends')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter tendencias do Brasil' })
  @ApiQuery({ name: 'accountId', required: false })
  async getTrends(
    @Request() req: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getTrends(req.user.sub, accountId);
  }

  @Get('trends/category/:categoryId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter tendências de uma categoria específica' })
  @ApiQuery({ name: 'accountId', required: false })
  async getCategoryTrends(
    @Request() req: any,
    @Param('categoryId') categoryId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getCategoryTrends(req.user.sub, categoryId, accountId);
  }

  // ============================================
  // CATEGORIES - PUBLIC ENDPOINTS
  // ============================================

  @Get('categories/:categoryId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de uma categoria (endpoint publico)' })
  @ApiQuery({ name: 'accountId', required: false })
  async getCategory(
    @Request() req: any,
    @Param('categoryId') categoryId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getCategory(req.user.sub, categoryId, accountId);
  }

  @Get('categories/:categoryId/attributes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter atributos de uma categoria (endpoint publico)' })
  @ApiQuery({ name: 'accountId', required: false })
  async getCategoryAttributes(
    @Request() req: any,
    @Param('categoryId') categoryId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getCategoryAttributes(req.user.sub, categoryId, accountId);
  }

  // ============================================
  // FAVORITES
  // ============================================

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar favoritos' })
  @ApiQuery({ name: 'accountId', required: false })
  async getFavorites(
    @Request() req: any,
    @Query() query: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getFavorites(req.user.sub, query, accountId);
  }

  @Post('favorites/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adicionar favorito' })
  @ApiQuery({ name: 'accountId', required: false })
  async addFavorite(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.addFavorite(req.user.sub, itemId, accountId);
  }

  @Delete('favorites/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover favorito' })
  @ApiQuery({ name: 'accountId', required: false })
  async removeFavorite(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.removeFavorite(req.user.sub, itemId, accountId);
  }

  // ============================================
  // VARIATIONS
  // ============================================

  @Get('items/:itemId/variations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar variacoes de um item' })
  @ApiQuery({ name: 'accountId', required: false })
  async getVariations(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getVariations(req.user.sub, itemId, accountId);
  }

  @Get('items/:itemId/variations/:variationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter uma variacao' })
  @ApiQuery({ name: 'accountId', required: false })
  async getVariation(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Param('variationId') variationId: number,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getVariation(req.user.sub, itemId, variationId, accountId);
  }

  @Post('items/:itemId/variations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar variacao' })
  @ApiQuery({ name: 'accountId', required: false })
  async createVariation(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Body() variation: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.createVariation(req.user.sub, itemId, variation, accountId);
  }

  @Put('items/:itemId/variations/:variationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar variacao' })
  @ApiQuery({ name: 'accountId', required: false })
  async updateVariation(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Param('variationId') variationId: number,
    @Body() data: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.updateVariation(req.user.sub, itemId, variationId, data, accountId);
  }

  @Delete('items/:itemId/variations/:variationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Excluir variacao' })
  @ApiQuery({ name: 'accountId', required: false })
  async deleteVariation(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Param('variationId') variationId: number,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.deleteVariation(req.user.sub, itemId, variationId, accountId);
  }

  // ============================================
  // FULFILLMENT
  // ============================================

  @Get('fulfillment/inventory/:inventoryId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter inventario de fulfillment' })
  @ApiQuery({ name: 'accountId', required: false })
  async getFulfillmentInventory(
    @Request() req: any,
    @Param('inventoryId') inventoryId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getFulfillmentInventory(req.user.sub, inventoryId, accountId);
  }

  @Put('fulfillment/inventory/:inventoryId/stock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar estoque de fulfillment' })
  @ApiQuery({ name: 'accountId', required: false })
  async updateFulfillmentStock(
    @Request() req: any,
    @Param('inventoryId') inventoryId: string,
    @Body() stock: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.updateFulfillmentStock(req.user.sub, inventoryId, stock, accountId);
  }

  // ============================================
  // SEARCH - PUBLIC ENDPOINTS
  // ============================================

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar no Mercado Livre (endpoint publico)' })
  @ApiQuery({ name: 'q', required: true, description: 'Termo de busca' })
  @ApiQuery({ name: 'accountId', required: false })
  async search(
    @Request() req: any,
    @Query('q') query: string,
    @Query() options: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.search(req.user.sub, query, options, accountId);
  }

  @Get('search/category/:categoryId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar por categoria (endpoint publico)' })
  @ApiQuery({ name: 'accountId', required: false })
  async searchByCategory(
    @Request() req: any,
    @Param('categoryId') categoryId: string,
    @Query() options: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.searchByCategory(req.user.sub, categoryId, options, accountId);
  }

  // ============================================
  // SITES - PUBLIC ENDPOINTS
  // ============================================

  @Get('sites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar sites do ML (endpoint publico)' })
  @ApiQuery({ name: 'accountId', required: false })
  async getSites(
    @Request() req: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getSites(req.user.sub, accountId);
  }

  @Get('sites/:siteId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de um site (endpoint publico)' })
  @ApiQuery({ name: 'accountId', required: false })
  async getSite(
    @Request() req: any,
    @Param('siteId') siteId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getSite(req.user.sub, siteId, accountId);
  }

  @Get('sites/:siteId/categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar categorias de um site (endpoint publico)' })
  @ApiQuery({ name: 'accountId', required: false })
  async getSiteCategories(
    @Request() req: any,
    @Param('siteId') siteId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getSiteCategories(req.user.sub, siteId, accountId);
  }

  // ============================================
  // CURRENCIES - PUBLIC ENDPOINTS
  // ============================================

  @Get('currencies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar moedas (endpoint publico)' })
  @ApiQuery({ name: 'accountId', required: false })
  async getCurrencies(
    @Request() req: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getCurrencies(req.user.sub, accountId);
  }

  @Get('currencies/:currencyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de uma moeda (endpoint publico)' })
  @ApiQuery({ name: 'accountId', required: false })
  async getCurrency(
    @Request() req: any,
    @Param('currencyId') currencyId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getCurrency(req.user.sub, currencyId, accountId);
  }

  // ============================================
  // ITEM ACTIONS
  // ============================================

  @Post('items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar novo item' })
  @ApiQuery({ name: 'accountId', required: false })
  async createItem(
    @Request() req: any,
    @Body() item: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.createItem(req.user.sub, item, accountId);
  }

  @Post('items/:itemId/pause')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pausar item' })
  @ApiQuery({ name: 'accountId', required: false })
  async pauseItem(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.pauseItem(req.user.sub, itemId, accountId);
  }

  @Post('items/:itemId/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ativar item' })
  @ApiQuery({ name: 'accountId', required: false })
  async activateItem(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.activateItem(req.user.sub, itemId, accountId);
  }

  @Post('items/:itemId/close')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Encerrar item' })
  @ApiQuery({ name: 'accountId', required: false })
  async closeItem(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.closeItem(req.user.sub, itemId, accountId);
  }

  @Delete('items/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Excluir item' })
  @ApiQuery({ name: 'accountId', required: false })
  async deleteItem(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.deleteItem(req.user.sub, itemId, accountId);
  }

  @Get('items/:itemId/description')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter descricao de um item' })
  @ApiQuery({ name: 'accountId', required: false })
  async getItemDescription(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getItemDescription(req.user.sub, itemId, accountId);
  }

  @Put('items/:itemId/description')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar descricao de um item' })
  @ApiQuery({ name: 'accountId', required: false })
  async setItemDescription(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Body('text') text: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.setItemDescription(req.user.sub, itemId, text, accountId);
  }

  @Post('items/:itemId/relist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Republicar item' })
  @ApiQuery({ name: 'accountId', required: false })
  async relistItem(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Body() options: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.relistItem(req.user.sub, itemId, options, accountId);
  }

  // ============================================
  // ORDER NOTES
  // ============================================

  @Get('orders/:orderId/notes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar notas de um pedido' })
  @ApiQuery({ name: 'accountId', required: false })
  async getOrderNotes(
    @Request() req: any,
    @Param('orderId') orderId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.getOrderNotes(req.user.sub, orderId, accountId);
  }

  @Post('orders/:orderId/notes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar nota em um pedido' })
  @ApiQuery({ name: 'accountId', required: false })
  async createOrderNote(
    @Request() req: any,
    @Param('orderId') orderId: string,
    @Body('note') note: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.mlService.createOrderNote(req.user.sub, orderId, note, accountId);
  }
}
