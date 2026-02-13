import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Obter organizacao atual' })
  async getCurrent(@Request() req: any) {
    return this.organizationsService.findById(req.user.organizationId);
  }

  @Put('current')
  @ApiOperation({ summary: 'Atualizar organizacao atual' })
  async updateCurrent(@Request() req: any, @Body() data: { name?: string }) {
    return this.organizationsService.update(
      req.user.organizationId,
      req.user.sub,
      data,
    );
  }

  @Get('current/members')
  @ApiOperation({ summary: 'Listar membros da organizacao' })
  async getMembers(@Request() req: any) {
    return this.organizationsService.getMembers(req.user.organizationId);
  }

  @Delete('current/members/:userId')
  @ApiOperation({ summary: 'Remover membro da organizacao' })
  async removeMember(@Request() req: any, @Param('userId') userId: string) {
    return this.organizationsService.removeMember(
      req.user.organizationId,
      userId,
    );
  }
}
