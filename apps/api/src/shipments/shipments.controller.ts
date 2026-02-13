import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('shipments')
@Controller('shipments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes do envio' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.shipmentsService.findOne(req.user.sub, id);
  }
}
