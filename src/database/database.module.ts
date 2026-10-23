import { Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Media } from '../entities/media.entity';
import { Episode } from '../entities/episode.entity';
import { LiveChannel } from '../entities/live-channel.entity';
import { WatchHistory } from '../entities/watch-history.entity';
import { VideoSource } from '../entities/video-source.entity';

/**
 * SQL idempotente que garante o schema.
 * Ordem corrigida: 'medias' é criada ANTES de 'video_sources' e 'episodes'.
 */
const BOOTSTRAP_SQL = `
DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('MOVIE', 'SERIES', 'ANIME', 'SOAP_OPERA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE source_language AS ENUM ('DUB', 'SUB', 'AUTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Criar primeiro a tabela pai 'medias'
CREATE TABLE IF NOT EXISTS medias (
    id INT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type media_type NOT NULL,
    poster_url TEXT,
    backdrop_url TEXT,
    overview TEXT,
    release_year INT,
    stream_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criar tabelas dependentes (video_sources, episodes, watch_histories)
CREATE TABLE IF NOT EXISTS video_sources (
    id SERIAL PRIMARY KEY,
    media_id INT NOT NULL REFERENCES medias(id) ON DELETE CASCADE,
    season_number INT,
    episode_number INT,
    server VARCHAR(100) NOT NULL,
    language source_language NOT NULL DEFAULT 'AUTO',
    quality VARCHAR(30) NOT NULL DEFAULT 'AUTO',
    url TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS episodes (
    id SERIAL PRIMARY KEY,
    media_id INT NOT NULL REFERENCES medias(id) ON DELETE CASCADE,
    season_number INT NOT NULL,
    episode_number INT NOT NULL,
    title VARCHAR(255),
    stream_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS live_channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    category VARCHAR(100),
    country VARCHAR(100),
    stream_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watch_histories (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_id INT NOT NULL REFERENCES medias(id) ON DELETE CASCADE,
    progress INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_media UNIQUE (user_id, media_id)
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_medias_type ON medias(type);
CREATE INDEX IF NOT EXISTS idx_medias_title ON medias(title);
CREATE INDEX IF NOT EXISTS idx_video_sources_media ON video_sources(media_id);
CREATE INDEX IF NOT EXISTS idx_video_sources_episode ON video_sources (media_id, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_live_channels_category ON live_channels(category);
CREATE UNIQUE INDEX IF NOT EXISTS uq_live_channels_stream_url ON live_channels (stream_url);
CREATE UNIQUE INDEX IF NOT EXISTS uq_episodes_media_season_episode
  ON episodes (media_id, season_number, episode_number);
`;

@Injectable()
export class DatabaseBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseBootstrapService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.dataSource.query(BOOTSTRAP_SQL);
    this.logger.log('Schema da base de dados verificado/aplicado com sucesso.');
  }
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get('database')!.url,
        ssl: { rejectUnauthorized: false },
        entities: [User, Media, Episode, LiveChannel, WatchHistory, VideoSource],
        synchronize: false,
        logging: ['error', 'warn'],
        extra: { max: 10 } as Record<string, unknown>,
      }),
    }),
  ],
  providers: [DatabaseBootstrapService],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}