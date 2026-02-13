import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { MercadoLivreModule } from '../mercadolivre/mercadolivre.module';

@Module({
  imports: [MercadoLivreModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
