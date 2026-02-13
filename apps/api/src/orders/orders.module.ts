import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { MercadoLivreModule } from '../mercadolivre/mercadolivre.module';

@Module({
  imports: [MercadoLivreModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
