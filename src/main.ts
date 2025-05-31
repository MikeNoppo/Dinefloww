import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  app.useStaticAssets(path.resolve(process.cwd(), 'public'));

  app.enableCors({
    origin: process.env.CORS_ORIGIN,  
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, 
    exposedHeaders: ['Content-Type']
  });

  await app.listen(process.env.PORT);
}
bootstrap();
