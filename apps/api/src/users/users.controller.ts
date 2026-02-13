import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obter perfil do usuario' })
  async getProfile(@Request() req: any) {
    return this.usersService.findById(req.user.sub, {
      includeOrganization: true,
    });
  }

  @Put('me')
  @ApiOperation({ summary: 'Atualizar perfil do usuario' })
  async updateProfile(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.sub, updateUserDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter usuario por ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
