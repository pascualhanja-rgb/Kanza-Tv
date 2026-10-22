import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import configuration from './config/configuration';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });

  const config = app.get(ConfigService<{ nodeEnv: string; corsOrigins: string[]; port: number } & object>);

  // ------------------ SEGURANÇA ------------------
  // Headers de segurança HTTP (CSP, HSTS, noSniff, frameguard, referrer-policy...)
  app.use(
    helmet({
      contentSecurityPolicy: false, // API JSON; CSP fica a cargo do frontend
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // posters/logos acessíveis
    }),
  );

  // CORS restrito às origens configuradas (nunca JWT em wildcard com credentials)
  const origins = config.get('corsOrigins') ?? ['*'];
  app.enableCors({
    origin: origins.includes('*') ? true : origins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-sync-key'],
    maxAge: 86400,
  });

  // Proxy reverso (trust first proxy) para IPs reais no throttler
  app.set('trust proxy', 1);

  // Validação global: DTOs class-validator, white-list (rejeita campos extras),
  // transformação tipos primitivos e erros legíveis
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove propriedades não declaradas no DTO (anti-injection)
      forbidNonWhitelisted: true, // e devolve 400 se aparecer campo estranho
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.setGlobalPrefix('api', { exclude: ['health'] });

  // Desliga o injeção de payload default do Express (dica de tam. corpo)
  app.useBodyParser('json', { limit: '256kb' });

  // ------------------ DOCUMENTAÇÃO ------------------
  if (config.get('nodeEnv') !== 'production') {
    const docConfig = new DocumentBuilder()
      .setTitle('StreamHub API')
      .setDescription('Backend centralizado: TMDB (filmes/séries/novelas), Kitsu (animes + streaming/WebView), IPTV (canais) e histórico.')
      .setVersion('1.0')
      .addBearerAuth()
      .addSecurityRequirements('bearer')
      .addApiKey({ type: 'apiKey', name: 'x-sync-key', in: 'header' }, 'x-sync-key')
      .build();
    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup('docs', app, document);
  }

  // Graceful shutdown (pool de BD Fecha corretamente)
  app.enableShutdownHooks();

  const port = Number(config.get('port') ?? 3000);
  await app.listen(port, '0.0.0.0');

  Logger.log(`🚀 StreamHub API a correr em http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`📚 Swagger em http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap().catch((err) => {
  // falha de arranque quer dizer envs inválidos/BD down — falhar rápido
  // eslint-disable-next-line no-console
  console.error('Falha fatal no bootstrap:', err);
  process.exit(1);
});

export { configuration };
