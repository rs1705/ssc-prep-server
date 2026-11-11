import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind the host's proxy: use the visitor's IP for rate limiting.
  app.set('trust proxy', 1);
  // Standard security headers (it's a JSON API, so no page policies are needed).
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.use(compression());
  // Validate and coerce every DTO; unknown properties are stripped.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // CORS_ORIGINS: comma-separated sites allowed to call the API
  // (e.g. "https://your-app.vercel.app,http://localhost:3000"). Unset = any site.
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors(origins.length > 0 ? { origin: origins } : undefined);
  app.enableShutdownHooks();
  // Railway (and similar hosts) pass PORT; listen on every interface.
  await app.listen(process.env.PORT ?? 8080, '0.0.0.0');
}
bootstrap();
