import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar produtos' })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Request() req: any,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.productsService.findAll(req.user.sub, { offset, limit, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes do produto' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.productsService.findOne(req.user.sub, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.productsService.update(req.user.sub, id, data);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pausar produto' })
  async pause(@Request() req: any, @Param('id') id: string) {
    return this.productsService.pause(req.user.sub, id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Ativar produto' })
  async activate(@Request() req: any, @Param('id') id: string) {
    return this.productsService.activate(req.user.sub, id);
  }
}
