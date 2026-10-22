import { Module } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ValidationPipe } from '@nestjs/common';
import configuration, { AppConfig } from './config/configuration';
import { envSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TmdbModule } from './tmdb/tmdb.module';
import { KitsuModule } from './kitsu/kitsu.module';
import { IptvModule } from './iptv/iptv.module';
import { WatchHistoryModule } from './watch-history/watch-history.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    // Config validada com Joi: a app não arranca com envs faltando/fracas
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      validationSchema: envSchema,
      // allowUnknown: o process.env do SO (Windows/Unix) tem centenas de variáveis
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),

    // Rate limiting global: protege contra abuso/DoS de todas as rotas.
    // Limites mais agressivos por rota são feitos com @Throttle nos controllers.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
    ]),

    DatabaseModule,
    AuthModule,
    TmdbModule,
    KitsuModule,
    IptvModule,
    WatchHistoryModule,
  ],
  controllers: [HealthController],
  providers: [
    // Guard global: todas as rotas passam pelo throttler
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
