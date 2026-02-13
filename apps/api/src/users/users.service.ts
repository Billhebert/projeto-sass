import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from '../auth/dto/register.dto';

interface FindUserOptions {
  includePassword?: boolean;
  includeOrganization?: boolean;
  includeMlAccounts?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: RegisterDto & { password: string }) {
    // Create user with a default organization
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        organization: {
          create: {
            name: `${data.name}'s Organization`,
            slug: this.generateSlug(data.name),
            plan: 'free',
          },
        },
      },
      include: {
        organization: true,
      },
    });

    return user;
  }

  async findByEmail(email: string, options: FindUserOptions = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: options.includeOrganization,
        mlAccounts: options.includeMlAccounts ? {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        } : false,
      },
    });

    if (!user) return null;

    if (!options.includePassword) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }

    return user;
  }

  async findById(id: string, options: FindUserOptions = {}) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organization: options.includeOrganization,
        mlAccounts: options.includeMlAccounts ? {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        } : false,
      },
    });

    if (!user) return null;

    if (!options.includePassword) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }

    return user;
  }

  async update(id: string, data: Partial<{ name: string; avatar: string }>) {
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Date.now();
  }
}
