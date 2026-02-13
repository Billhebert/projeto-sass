import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('questions')
@Controller('questions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar perguntas' })
  @ApiQuery({ name: 'status', required: false })
  async findAll(@Request() req: any, @Query('status') status?: string) {
    return this.questionsService.findAll(req.user.sub, { status });
  }

  @Post(':id/answer')
  @ApiOperation({ summary: 'Responder pergunta' })
  async answer(
    @Request() req: any,
    @Param('id') id: number,
    @Body('answer') answer: string,
  ) {
    return this.questionsService.answer(req.user.sub, id, answer);
  }
}
