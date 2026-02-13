import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      return true; // Deixa o JwtAuthGuard lidar com autenticação
    }

    // Buscar usuário no banco para verificar status
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        isActive: true,
        activeUntil: true,
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Verificar se usuário está inativo
    if (!dbUser.isActive) {
      throw new UnauthorizedException('Sua conta ainda não foi ativada. Aguarde o administrador ativar sua conta.');
    }

    // Verificar se o acesso expirou
    if (dbUser.activeUntil) {
      const now = new Date();
      if (dbUser.activeUntil < now) {
        // Desativar automaticamente usuário expirado
        await this.prisma.user.update({
          where: { id: user.sub },
          data: { isActive: false },
        });

        throw new UnauthorizedException('Seu acesso expirou. Entre em contato com o administrador para renovar.');
      }
    }

    return true;
  }
}
