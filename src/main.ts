import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getAppConfig } from './common/app-config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const { port } = getAppConfig();
  await app.listen(port);
}

void bootstrap();
