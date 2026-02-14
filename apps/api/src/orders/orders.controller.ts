import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos' })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'date_from', required: false, description: 'Data inicial (ISO 8601)' })
  @ApiQuery({ name: 'date_to', required: false, description: 'Data final (ISO 8601)' })
  async findAll(
    @Request() req: any,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    const params: any = {};
    
    // Se tem filtro de data, usar paginação
    // Se não tem filtro de data (todos os dados), não enviar limit para buscar tudo
    if (dateFrom) {
      params.offset = offset || 0;
      params.limit = limit && limit <= 500 ? limit : 50;
      params.date_from = dateFrom;
      params.date_to = dateTo || new Date().toISOString();
    }
    // Quando não tem dateFrom (todos os dados), não enviamos limit
    // O service vai buscar todos os pedidos disponíveis
    
    if (status) {
      params['order.status'] = status;
    }
    
    if (dateFrom) {
      params['order.date_created.from'] = dateFrom;
    }
    
    if (dateTo) {
      params['order.date_created.to'] = dateTo;
    }
    
    return this.ordersService.findAll(req.user.sub, params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes do pedido' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.findOne(req.user.sub, id);
  }
}
