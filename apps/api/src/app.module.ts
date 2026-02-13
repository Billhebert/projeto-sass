import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { QuestionsModule } from './questions/questions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MercadoLivreModule } from './mercadolivre/mercadolivre.module';
import { AdminModule } from './admin/admin.module';
import { PrismaModule } from './prisma/prisma.module';
import { ActiveUserGuard } from './auth/guards/active-user.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProductsModule,
    OrdersModule,
    ShipmentsModule,
    QuestionsModule,
    DashboardModule,
    MercadoLivreModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ActiveUserGuard,
    },
  ],
})
export class AppModule {}
