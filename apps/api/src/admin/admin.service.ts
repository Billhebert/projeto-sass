import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [totalUsers, totalOrganizations, usersByPlan, activeUsers, inactiveUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count(),
      this.prisma.organization.groupBy({
        by: ['plan'],
        _count: true,
      }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
    ]);

    return {
      totalUsers,
      totalOrganizations,
      activeUsers,
      inactiveUsers,
      usersByPlan: usersByPlan.map((item) => ({
        plan: item.plan,
        count: item._count,
      })),
    };
  }

  async getUsers(params: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 10, search } = params;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          activeUntil: true,
          createdAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              plan: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrganizations(params: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 10, search } = params;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          name: { contains: search, mode: 'insensitive' as const },
        }
      : {};

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { members: true },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      organizations: organizations.map((org) => ({
        ...org,
        membersCount: org._count.members,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateOrganizationPlan(organizationId: string, plan: string) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: { plan },
    });
  }

  async updateUserRole(userId: string, role: string) {
    // Validar role
    const validRoles = ['user', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException('Role inválida. Use: user, admin ou super_admin');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async updateUserStatus(userId: string, isActive: boolean, activeUntil?: Date) {
    // Se estiver ativando com data de expiração, validar a data
    if (isActive && activeUntil) {
      const now = new Date();
      if (activeUntil <= now) {
        throw new BadRequestException('A data de expiração deve ser no futuro');
      }
    }

    // Se estiver desativando, limpar activeUntil
    const data: any = {
      isActive,
    };

    if (!isActive) {
      data.activeUntil = null;
    } else if (activeUntil) {
      data.activeUntil = activeUntil;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async activateUser(userId: string, durationDays?: number) {
    const data: any = {
      isActive: true,
    };

    // Se forneceu duração em dias, calcular activeUntil
    if (durationDays && durationDays > 0) {
      const activeUntil = new Date();
      activeUntil.setDate(activeUntil.getDate() + durationDays);
      data.activeUntil = activeUntil;
    } else {
      // Sem duração = permanente (activeUntil = null)
      data.activeUntil = null;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async deactivateUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        activeUntil: null,
      },
    });
  }

  async extendUserAccess(userId: string, additionalDays: number) {
    if (additionalDays <= 0) {
      throw new BadRequestException('A quantidade de dias deve ser positiva');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeUntil: true, isActive: true },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    // Calcular nova data
    const baseDate = user.activeUntil || new Date();
    const newActiveUntil = new Date(baseDate);
    newActiveUntil.setDate(newActiveUntil.getDate() + additionalDays);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        activeUntil: newActiveUntil,
      },
    });
  }
}
