import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { MercadoLivreModule } from '../mercadolivre/mercadolivre.module';

@Module({
  imports: [MercadoLivreModule],
  controllers: [ShipmentsController],
  providers: [ShipmentsService],
})
export class ShipmentsModule {}
