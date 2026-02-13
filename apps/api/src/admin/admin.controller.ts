import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatisticas do admin' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers({ page, limit, search });
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Listar organizacoes' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getOrganizations(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getOrganizations({ page, limit, search });
  }

  @Put('organizations/:id/plan')
  @ApiOperation({ summary: 'Atualizar plano da organizacao' })
  async updateOrganizationPlan(
    @Param('id') id: string,
    @Body('plan') plan: string,
  ) {
    return this.adminService.updateOrganizationPlan(id, plan);
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Atualizar role do usuario' })
  async updateUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.updateUserRole(id, role);
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Atualizar status do usuario (ativar/desativar)' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @Body('activeUntil') activeUntil?: string,
  ) {
    const activeUntilDate = activeUntil ? new Date(activeUntil) : undefined;
    return this.adminService.updateUserStatus(id, isActive, activeUntilDate);
  }

  @Post('users/:id/activate')
  @ApiOperation({ summary: 'Ativar usuario com duracao opcional (em dias)' })
  async activateUser(
    @Param('id') id: string,
    @Body('durationDays') durationDays?: number,
  ) {
    return this.adminService.activateUser(id, durationDays);
  }

  @Post('users/:id/deactivate')
  @ApiOperation({ summary: 'Desativar usuario' })
  async deactivateUser(@Param('id') id: string) {
    return this.adminService.deactivateUser(id);
  }

  @Post('users/:id/extend')
  @ApiOperation({ summary: 'Estender acesso do usuario por X dias adicionais' })
  async extendUserAccess(
    @Param('id') id: string,
    @Body('additionalDays') additionalDays: number,
  ) {
    return this.adminService.extendUserAccess(id, additionalDays);
  }
}
