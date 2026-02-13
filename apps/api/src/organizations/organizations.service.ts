import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organizacao nao encontrada');
    }

    return organization;
  }

  async update(id: string, userId: string, data: { name?: string }) {
    // Check if user is admin of the organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== id) {
      throw new ForbiddenException('Sem permissao para editar esta organizacao');
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new ForbiddenException('Apenas administradores podem editar a organizacao');
    }

    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async getMembers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });
  }

  async inviteMember(organizationId: string, email: string, role: string = 'user') {
    // TODO: Implement invitation system
    throw new Error('Not implemented');
  }

  async removeMember(organizationId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== organizationId) {
      throw new NotFoundException('Membro nao encontrado');
    }

    // Cannot remove the last admin
    const admins = await this.prisma.user.count({
      where: {
        organizationId,
        role: { in: ['admin', 'super_admin'] },
      },
    });

    if (admins === 1 && (user.role === 'admin' || user.role === 'super_admin')) {
      throw new ForbiddenException('Nao e possivel remover o ultimo administrador');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { organizationId: null },
    });
  }

  async updateMemberRole(organizationId: string, userId: string, role: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== organizationId) {
      throw new NotFoundException('Membro nao encontrado');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }
}
