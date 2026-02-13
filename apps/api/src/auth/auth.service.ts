import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenPayload, TokenResponse } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email ja cadastrado');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    return {
      message: 'Usuario criado com sucesso',
      userId: user.id,
    };
  }

  async login(loginDto: LoginDto): Promise<TokenResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar ?? undefined,
        createdAt: user.createdAt,
      },
      organization: user.organization ?? undefined,
      ...tokens,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email, {
      includePassword: true,
      includeOrganization: true,
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const isPasswordValid = await bcrypt.compare(password, (user as any).password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    // Verificar se o usuário está ativo
    if (!user.isActive) {
      throw new UnauthorizedException('Sua conta ainda não foi ativada. Aguarde o administrador ativar sua conta.');
    }

    // Verificar se o acesso expirou
    if (user.activeUntil) {
      const now = new Date();
      if (user.activeUntil < now) {
        throw new UnauthorizedException('Seu acesso expirou. Entre em contato com o administrador para renovar.');
      }
    }

    return user;
  }

  async generateTokens(user: any) {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      const user = await this.usersService.findById(payload.sub, {
        includeOrganization: true,
      });

      if (!user) {
        throw new UnauthorizedException('Usuario nao encontrado');
      }

      // Verificar se o usuário está ativo
      if (!user.isActive) {
        throw new UnauthorizedException('Sua conta ainda não foi ativada. Aguarde o administrador ativar sua conta.');
      }

      // Verificar se o acesso expirou
      if (user.activeUntil) {
        const now = new Date();
        if (user.activeUntil < now) {
          throw new UnauthorizedException('Seu acesso expirou. Entre em contato com o administrador para renovar.');
        }
      }

      const tokens = await this.generateTokens(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar ?? undefined,
          createdAt: user.createdAt,
        },
        organization: user.organization ?? undefined,
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Token de refresh invalido');
    }
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId, {
      includeOrganization: true,
    });

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      organization: user.organization,
    };
  }

  // Mercado Livre OAuth
  async handleMercadoLivreCallback(code: string, state?: string) {
    // This will be implemented in the MercadoLivre module
    throw new BadRequestException('Not implemented');
  }
}
