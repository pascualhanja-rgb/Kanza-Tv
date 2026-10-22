import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LiveChannel } from '../entities/live-channel.entity';
import { ExternalHttpService } from '../common/http-client.service';
import { parseM3U, M3uEntry } from './m3u-parser';
import { ChannelQueryDto, ChannelDto, SyncResultDto } from './dto/channel-query.dto';

@Injectable()
export class IptvService {
  private readonly logger = new Logger(IptvService.name);

  constructor(
    @InjectRepository(LiveChannel)
    private readonly channelsRepository: Repository<LiveChannel>,
    private readonly http: ExternalHttpService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Faz download da lista M3U gigante, faz parsing, filtra por país
   * (env IPTV_ALLOWED_COUNTRIES) e grava na PostgreSQL em chunks.
   * Upsert por stream_url evita duplicados a cada sync.
   */
  async sync(): Promise<SyncResultDto> {
    const start = Date.now();
    this.logger.log('A iniciar sincronização da lista IPTV...');
    const content = await this.http.getText(process.env.IPTV_M3U_URL || '');
    if (!content) throw new Error('Não foi possível descarregar a lista M3U.');

    let entries: M3uEntry[] = parseM3U(content);
    this.logger.log(`Parsing concluído: ${entries.length} entradas encontradas.`);

    // filtro de país configurado (IPTV_ALLOWED_COUNTRIES='PT,BR,')
    const allowed = (process.env.IPTV_ALLOWED_COUNTRIES || '')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (allowed.length > 0) {
      entries = entries.filter((e) => isAllowedCountry(e, allowed));
      this.logger.log(`Filtro por país aplicado (${allowed.join(',')}): ${entries.length} entradas restantes.`);
    }

    const batchLimit = parseInt(process.env.IPTV_SYNC_BATCH_LIMIT || '0', 10);
    if (batchLimit > 0 && entries.length > batchLimit) {
      entries = entries.slice(0, batchLimit);
      this.logger.log(`Batch limit aplicado: ${entries.length} entradas.`);
    }

    const inserted = await this.bulkUpsert(entries);
    const durationMs = Date.now() - start;
    this.logger.log(`Sync concluído em ${durationMs}ms: ${inserted} novos canais inseridos.`);

    return {
      total: entries.length,
      inserted,
      skipped: entries.length - inserted,
      durationMs,
    };
  }

  /** Upsert em blocos de 500 (evitando queries gigantes no Neon). */
  private async bulkUpsert(entries: M3uEntry[]): Promise<number> {
    const CHUNK = 500;
    let inserted = 0;
    for (let i = 0; i < entries.length; i += CHUNK) {
      const chunk = entries.slice(i, i + CHUNK);
      const values: unknown[] = [];
      const placeholders: string[] = [];
      chunk.forEach((c, idx) => {
        const base = idx * 5;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`,
        );
        values.push(c.name, c.logoUrl, c.category, c.country, c.streamUrl);
      });
      const sql = `
        INSERT INTO live_channels (name, logo_url, category, country, stream_url)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (stream_url) DO UPDATE
          SET name = EXCLUDED.name,
              logo_url = EXCLUDED.logo_url,
              category = EXCLUDED.category,
              country = EXCLUDED.country
        RETURNING id
      `;
      const res = await this.dataSource.query(sql, values);
      inserted += Array.isArray(res) ? res.length : 0;
    }
    return inserted;
  }

  // ------------------ Listagem para o Flutter ------------------

  async listChannels(query: ChannelQueryDto) {
    const qb = this.channelsRepository
      .createQueryBuilder('ch')
      .select([
        'ch.id AS "id"',
        'ch.name AS "name"',
        'ch.logo_url AS "logoUrl"',
        'ch.category AS "category"',
        'ch.country AS "country"',
        'ch.stream_url AS "streamUrl"',
      ]);

    if (query.country) {
      qb.andWhere('LOWER(ch.country) = LOWER(:country)', { country: query.country });
    }
    if (query.category) {
      qb.andWhere('LOWER(ch.category) = LOWER(:category)', { category: query.category });
    }
    if (query.name) {
      qb.andWhere('ch.name ILIKE :name', { name: `%${query.name}%` });
    }

    const offset = (query.page - 1) * query.limit;
    qb.take(query.limit).skip(offset).orderBy('ch.name', 'ASC');

    const [rows, total] = await Promise.all([qb.getRawMany<ChannelDto>(), qb.getCount()]);
    return {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      items: rows,
    };
  }

  async categories(): Promise<Array<{ category: string; count: number }>> {
    return this.channelsRepository
      .createQueryBuilder('ch')
      .select('ch.category AS category, COUNT(*)::int AS count')
      .where('ch.category IS NOT NULL')
      .groupBy('ch.category')
      .orderBy('count', 'DESC')
      .getRawMany();
  }

  async countries(): Promise<Array<{ country: string; count: number }>> {
    return this.channelsRepository
      .createQueryBuilder('ch')
      .select('ch.country AS country, COUNT(*)::int AS count')
      .where('ch.country IS NOT NULL')
      .groupBy('ch.country')
      .orderBy('count', 'DESC')
      .getRawMany();
  }
}

function isAllowedCountry(entry: M3uEntry, allowed: string[]): boolean {
  const c = (entry.country || '').toUpperCase();
  return allowed.includes(c);
}
