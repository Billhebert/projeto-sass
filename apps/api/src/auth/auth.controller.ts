import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registrar novo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email ja cadastrado' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer login' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais invalidas' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar token de acesso' })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso' })
  @ApiResponse({ status: 401, description: 'Token invalido' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter dados do usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuario' })
  @ApiResponse({ status: 401, description: 'Nao autenticado' })
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.sub);
  }

  @Get('mercadolivre')
  @Public()
  @ApiOperation({ summary: 'Iniciar OAuth com Mercado Livre' })
  async mercadoLivreAuth(@Res() res: Response) {
    const clientId = process.env.ML_CLIENT_ID;
    const redirectUri = process.env.ML_REDIRECT_URI;
    const authUrl = `https://auth.mercadolibre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
    return res.redirect(authUrl);
  }

  @Get('callback/mercadolivre')
  @Public()
  @ApiOperation({ summary: 'Callback OAuth do Mercado Livre' })
  async mercadoLivreCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.authService.handleMercadoLivreCallback(code, state);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?ml_connected=true`);
    } catch (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=ml_auth_failed`);
    }
  }
}
