import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  async getStats(@Request() req: any) {
    return this.dashboardService.getStats(req.user.sub);
  }

  @Get('sales-chart')
  @ApiOperation({ summary: 'Obter dados do grafico de vendas' })
  async getSalesChart(@Request() req: any) {
    return this.dashboardService.getSalesChart(req.user.sub);
  }

  @Get('recent-orders')
  @ApiOperation({ summary: 'Obter pedidos recentes' })
  async getRecentOrders(@Request() req: any) {
    return this.dashboardService.getRecentOrders(req.user.sub);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Obter produtos mais vendidos' })
  async getTopProducts(@Request() req: any) {
    return this.dashboardService.getTopProducts(req.user.sub);
  }
}
