import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { envSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TmdbModule } from './tmdb/tmdb.module';
import { AnimesModule } from './animes/animes.module'; // <-- Correto
import { IptvModule } from './iptv/iptv.module';
import { WatchHistoryModule } from './watch-history/watch-history.module';
import { HealthController } from './health/health.controller';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      validationSchema: envSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
    ]),
    DatabaseModule,
    AuthModule,
    TmdbModule,
    AnimesModule, // <-- Correto
    IptvModule,
    WatchHistoryModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}