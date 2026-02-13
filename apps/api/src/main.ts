import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  const corsOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];
  
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('ML SaaS API')
    .setDescription('API para gerenciamento de vendas no Mercado Livre')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticacao e autorizacao')
    .addTag('users', 'Gerenciamento de usuarios')
    .addTag('organizations', 'Gerenciamento de organizacoes')
    .addTag('products', 'Gerenciamento de produtos')
    .addTag('orders', 'Gerenciamento de pedidos')
    .addTag('dashboard', 'Metricas e dashboard')
    .addTag('mercadolivre', 'Integracao com Mercado Livre')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.API_PORT || 4000;
  await app.listen(port);

  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
