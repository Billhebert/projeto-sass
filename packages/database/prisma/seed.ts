import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin organization
  const adminOrg = await prisma.organization.upsert({
    where: { slug: 'admin-org' },
    update: {},
    create: {
      name: 'Admin Organization',
      slug: 'admin-org',
      plan: 'enterprise',
    },
  });

  // Create super admin user
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123456', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@example.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: adminPassword,
      name: 'Super Admin',
      role: 'super_admin',
      organizationId: adminOrg.id,
    },
  });

  console.log('Admin user created:', adminUser.email);

  // Create demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      plan: 'pro',
    },
  });

  // Create demo user
  const demoPassword = await bcrypt.hash('demo123456', 10);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: demoPassword,
      name: 'Demo User',
      role: 'admin',
      organizationId: demoOrg.id,
    },
  });

  console.log('Demo user created:', demoUser.email);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
