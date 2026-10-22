import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from '../entities/media.entity';
import { WatchHistory } from '../entities/watch-history.entity';
import { UpsertWatchDto } from './dto/watch-history.dto';

export interface ContinueWatchingItem {
  mediaId: number;
  type: string;
  title: string;
  posterUrl: string | null;
  streamUrl: string | null;
  progress: number;
  updatedAt: string;
}

@Injectable()
export class WatchHistoryService {
  constructor(
    @InjectRepository(WatchHistory)
    private readonly historyRepository: Repository<WatchHistory>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  /** Guarda/atualiza o progresso; garante que a mídia existe na tabela medias. */
  async upsert(userId: number, dto: UpsertWatchDto) {
    // 1. upsert da mídia (id oficial do TMDB/Kitsu + tipo)
    await this.mediaRepository.query(
      `INSERT INTO medias (id, title, type, poster_url, stream_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
         SET title = EXCLUDED.title,
             type = EXCLUDED.type,
             poster_url = COALESCE(medias.poster_url, EXCLUDED.poster_url),
             stream_url = COALESCE(EXCLUDED.stream_url, medias.stream_url)`,
      [dto.mediaId, dto.title.trim(), dto.mediaType, dto.posterUrl ?? null, dto.streamUrl ?? null],
    );

    // 2. upsert do progresso
    await this.historyRepository.query(
      `INSERT INTO watch_histories (user_id, media_id, progress, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, media_id) DO UPDATE
         SET progress = EXCLUDED.progress, updated_at = NOW()`,
      [userId, dto.mediaId, dto.progress],
    );

    return { ok: true, mediaId: dto.mediaId, progress: dto.progress };
  }

  /** "Continuar a Assistir" — itens assistidos, mais recentes primeiro. */
  async listForUser(userId: number, limit = 20): Promise<{ items: ContinueWatchingItem[] }> {
    const rows = (await this.historyRepository.query(
      `SELECT h.media_id    AS "mediaId",
              m.type        AS "type",
              m.title       AS "title",
              m.poster_url  AS "posterUrl",
              m.stream_url  AS "streamUrl",
              h.progress    AS "progress",
              h.updated_at  AS "updatedAt"
         FROM watch_histories h
         JOIN medias m ON m.id = h.media_id
        WHERE h.user_id = $1
        ORDER BY h.updated_at DESC
        LIMIT $2`,
      [userId, Math.min(limit, 50)],
    )) as ContinueWatchingItem[];
    return { items: rows };
  }

  async remove(userId: number, mediaId: number) {
    const res = await this.historyRepository.delete({ userId, mediaId });
    return { removed: res.affected ?? 0 };
  }
}
