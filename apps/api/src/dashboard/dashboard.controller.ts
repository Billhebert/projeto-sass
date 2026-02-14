import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatisticas do dashboard' })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  async getStats(@Request() req: any, @Query('date_from') dateFrom?: string, @Query('date_to') dateTo?: string) {
    return this.dashboardService.getStats(req.user.sub, dateFrom, dateTo);
  }

  @Get('sales-chart')
  @ApiOperation({ summary: 'Obter dados do grafico de vendas' })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  async getSalesChart(@Request() req: any, @Query('date_from') dateFrom?: string, @Query('date_to') dateTo?: string) {
    return this.dashboardService.getSalesChart(req.user.sub, dateFrom, dateTo);
  }

  @Get('recent-orders')
  @ApiOperation({ summary: 'Obter pedidos recentes' })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  async getRecentOrders(@Request() req: any, @Query('date_from') dateFrom?: string, @Query('date_to') dateTo?: string) {
    return this.dashboardService.getRecentOrders(req.user.sub, dateFrom, dateTo);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Obter produtos mais vendidos' })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  async getTopProducts(@Request() req: any, @Query('date_from') dateFrom?: string, @Query('date_to') dateTo?: string) {
    return this.dashboardService.getTopProducts(req.user.sub, dateFrom, dateTo);
  }

  @Get('promoted-products')
  @ApiOperation({ summary: 'Obter produtos em promoção' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPromotedProducts(@Request() req: any, @Query('limit') limit?: string) {
    return this.dashboardService.getPromotedProducts(req.user.sub, limit ? parseInt(limit) : 10);
  }
}
