import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { MercadoLivreModule } from '../mercadolivre/mercadolivre.module';

@Module({
  imports: [MercadoLivreModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
