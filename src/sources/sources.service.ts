import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { TmdbService } from '../tmdb/tmdb.service';
import { VideoSource } from '../entities/video-source.entity';
import { Media } from '../entities/media.entity';
import {
  SourceDto,
  SourcesResponseDto,
  UpsertSourceInput,
} from './dto/source.dto';
import type { AppConfig } from '../config/configuration';

interface SourceRow {
  id: number;
  server: string;
  language: 'DUB' | 'SUB' | 'AUTO';
  quality: string;
  url: string;
  priority: number;
}

@Injectable()
export class SourcesService {
  constructor(
    @InjectRepository(VideoSource)
    private readonly sourcesRepository: Repository<VideoSource>,
    @Inject(TmdbService) private readonly tmdb: TmdbService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly dataSource: DataSource,
  ) {}

  // ---------- Leitura (público) ----------

  async forTitle(mediaId: number): Promise<SourcesResponseDto> {
    return this.build(mediaId);
  }

  async forEpisode(
    mediaId: number,
    season: number,
    episode: number,
  ): Promise<SourcesResponseDto> {
    return this.build(mediaId, season, episode);
  }

  // ---------- Escrita (admin) ----------

  async upsertBatch(inputs: UpsertSourceInput[]): Promise<{ upserted: number }> {
    let upserted = 0;
    for (const input of inputs) {
      await this.ensureMediaExists(input);
      upserted += await this.upsertOne(input);
    }
    return { upserted };
  }

  async remove(id: number): Promise<{ removed: number }> {
    const res = await this.sourcesRepository.delete({ id });
    if (!res.affected) throw new NotFoundException('Fonte de vídeo não encontrada.');
    return { removed: res.affected };
  }

  // ---------- Internos ----------

  private async build(
    mediaId: number,
    season?: number,
    episode?: number,
  ): Promise<SourcesResponseDto> {
    const qb = this.sourcesRepository
      .createQueryBuilder('s')
      .select([
        's.id AS id',
        's.server AS server',
        's.language AS language',
        's.quality AS quality',
        's.url AS url',
        's.priority AS priority',
      ])
      .where('s.media_id = :mediaId', { mediaId });

    if (season !== undefined && episode !== undefined) {
      qb.andWhere('s.season_number = :season AND s.episode_number = :episode', { season, episode });
    } else {
      qb.andWhere('s.season_number IS NULL AND s.episode_number IS NULL');
    }

    qb.orderBy('s.priority', 'ASC').addOrderBy('s.id', 'ASC');
    const rows = await qb.getRawMany<SourceRow>();

    if (rows.length > 0) {
      return {
        mediaId,
        season,
        episode,
        source: 'custom',
        sources: rows.map((r) => this.toDto(r)),
      };
    }

    // Fallback: estrutura padronizada do vidsrc.to
    // Filme: https://vidsrc.to/embed/movie/{id}
    // Série: https://vidsrc.to/embed/tv/{id}/{season}/{episode}
    const base = this.config.get('vidsrc')?.baseUrl ?? 'https://vidsrc.to';
    const url =
      season !== undefined && episode !== undefined
        ? `${base}/embed/tv/${mediaId}/${season}/${episode}`
        : `${base}/embed/movie/${mediaId}`;

    return {
      mediaId,
      season,
      episode,
      source: 'vidsrc',
      sources: [
        {
          id: null,
          server: 'VidSrc',
          language: 'AUTO',
          languageLabel: 'Automático',
          quality: 'HD',
          url,
          priority: 0,
        },
      ],
    };
  }

  private toDto(r: SourceRow): SourceDto {
    return {
      id: r.id,
      server: r.server,
      language: r.language,
      languageLabel:
        r.language === 'DUB' ? 'Dublado (PT)' : r.language === 'SUB' ? 'Legendado' : 'Automático',
      quality: r.quality,
      url: r.url,
      priority: r.priority,
    };
  }

  /** Garante a linha em `medias` — necessário pela FK video_sources.media_id → medias.id. */
  private async ensureMediaExists(input: UpsertSourceInput): Promise<void> {
    const detail = await this.lookupDetail(input);
    const title = detail?.title ?? `#${input.mediaId}`;
    const poster = detail?.posterUrl ?? null;

    await this.dataSource.query(
      `INSERT INTO medias (id, title, type, poster_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
              type = EXCLUDED.type,
              poster_url = COALESCE(medias.poster_url, EXCLUDED.poster_url)`,
      [input.mediaId, title, input.mediaType, poster],
    );
  }

  private async lookupDetail(
    input: UpsertSourceInput,
  ): Promise<{ title: string; posterUrl: string | null } | null> {
    if (input.mediaType === 'MOVIE') {
      const d = await this.safe(() => this.tmdb.movieDetail(input.mediaId));
      return d;
    }
    return this.safe(() => this.tmdb.animeDetail(input.mediaId));
  }

  private async safe<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch {
      return null;
    }
  }

  private async upsertOne(input: UpsertSourceInput): Promise<number> {
    const season = input.seasonNumber ?? null;
    const episode = input.episodeNumber ?? null;
    const quality = input.quality?.trim() || 'AUTO';
    const priority = input.priority ?? 0;

    return this.dataSource.transaction(async (tx) => {
      await tx.query(
        `DELETE FROM video_sources
          WHERE media_id = $1
            AND season_number IS NOT DISTINCT FROM $2
            AND episode_number IS NOT DISTINCT FROM $3
            AND server = $4
            AND language = $5`,
        [input.mediaId, season, episode, input.server, input.language],
      );

      const res = await tx.query(
        `INSERT INTO video_sources
                (media_id, season_number, episode_number, server, language, quality, url, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [input.mediaId, season, episode, input.server, input.language, quality, input.url, priority],
      );
      return Array.isArray(res) ? res.length : 0;
    });
  }
}