import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MercadoLivreModule } from '../mercadolivre/mercadolivre.module';

@Module({
  imports: [MercadoLivreModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
