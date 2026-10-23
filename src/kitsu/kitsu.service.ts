import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { ExternalHttpService } from '../common/http-client.service';
import { AnimeResolverService } from './anime-resolver.service';

const MAL_SITE = 'myanimelist/anime';

interface KitsuAnime {
  canonicalTitle?: string | null;
  titles?: Record<string, string | null> | null;
  synopsis?: string | null;
  description?: { en?: string | null } | null;
  posterImage?: Record<string, string | null> | null;
  startDate?: string | null;
  episodeCount?: number | null;
  averageRating?: string | null;
}

interface KitsuMapping {
  externalId?: number | string | null;
  externalSite?: string | null;
}

interface KitsuEpisode {
  canonicalTitle?: string | null;
  titles?: { canonical?: string | null } | null;
  number?: number | null;
  originalAiredAt?: string | null;
}

interface KitsuResource {
  id: string;
  type: string;
  attributes?: KitsuAnime & KitsuMapping & KitsuEpisode;
  relationships?: Record<
    string,
    { data?: { id: string; type: string } | { id: string; type: string }[] }
  >;
}

interface KitsuResponse {
  data: KitsuResource | KitsuResource[];
  included?: KitsuResource[];
  meta?: { count?: number };
}

export interface AnimeItemDto {
  kitsuId: string;
  malId: number | null;
  imdbId: string | null;
  title: string;
  posterUrl: string | null;
  overview: string | null;
  releaseYear: number | null;
  episodesCount: number | null;
  score: number | null;
  genres: string[] | null;
}

export interface AnimeStreamDto {
  status: 'success';
  data: {
    kitsuId: string;
    malId: number | null;
    imdbId: string | null;
    episode: number;
    embedUrl: string;
    isDirectHls: boolean;
  };
}

@Injectable()
export class KitsuService {
  constructor(
    private readonly http: ExternalHttpService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly resolver: AnimeResolverService,
  ) {}

  async topAnime(page = 1): Promise<{ page: number; totalPages: number | null; items: AnimeItemDto[] }> {
    const path = `/anime?sort=-userCount&filter[ageRating]=G,PG,R&${this.pageQuery(page)}`;
    const res = await this.fetch(path);
    if (!res) throw new NotFoundException('Animes indisponíveis na Kitsu.');
    return this.toPaged(res, page);
  }

  async seasonNow(page = 1) {
    const { season, year } = this.currentSeason();
    const path = `/anime?filter[season]=${season}&filter[seasonYear]=${year}&sort=-userCount&${this.pageQuery(page)}`;
    const res = await this.fetch(path);
    if (!res) throw new NotFoundException('Temporada atual indisponível na Kitsu.');
    return this.toPaged(res, page);
  }

  async search(q: string, page = 1) {
    const encoded = encodeURIComponent(q.trim());
    const path = `/anime?filter[text]=${encoded}&${this.pageQuery(page)}`;
    const res = await this.fetch(path);
    if (!res) throw new NotFoundException('Pesquisa de anime sem resultados.');
    return this.toPaged(res, page);
  }

  async detail(id: string): Promise<AnimeItemDto> {
    const res = await this.fetch(`/anime/${id}?include=mappings,genres`);
    if (!res) throw new NotFoundException('Anime não encontrado.');
    const [docs, included] = this.splitDocument(res);
    const item = docs[0] ? this.toItem(docs[0], included) : null;
    if (!item) throw new NotFoundException('Anime não encontrado.');
    return item;
  }

  async episodes(id: string, page = 1) {
    const res = await this.fetch(`/anime/${id}/episodes?${this.pageQuery(page)}`);
    if (!res) throw new NotFoundException('Episódios não encontrados.');
    const list = Array.isArray(res.data) ? res.data : [];
    return {
      page,
      items: list.map((e) => {
        const a = e.attributes ?? {};
        const num = a.number ?? 0;
        return {
          episodeNumber: num,
          title: a.canonicalTitle || a.titles?.canonical || (num ? `Episódio ${num}` : 'Episódio'),
          airDate: a.originalAiredAt ?? null,
        };
      }),
    };
  }

  async stream(kitsuIdRaw: string, episode: number): Promise<AnimeStreamDto> {
    const kitsuId = String(kitsuIdRaw);
    const kit = await this.fetch(`/anime/${kitsuId}?include=mappings`);
    if (!kit) throw new NotFoundException('Anime não encontrado no Kitsu.');

    const attrs = (kit.data as KitsuResource).attributes;
    if (attrs?.episodeCount && episode > attrs.episodeCount) {
      throw new NotFoundException('Episódio não disponível para exibição.');
    }

    const [docs, included] = this.splitDocument(kit);
    const malId = this.extractMalId(docs, included);
    const imdbId = this.extractImdbId(docs, included);

    const targetId = imdbId || (malId ? String(malId) : kitsuId);

    // Tenta obter o link de fluxo direto HLS (.m3u8)
    const directHlsUrl = await this.resolver.resolveStreamUrl(targetId, episode);

    const isDirectHls = Boolean(directHlsUrl);
    const embedUrl = directHlsUrl || `https://warezcdn.sbs/serie/${targetId}/1/${episode}`;

    return {
      status: 'success',
      data: {
        kitsuId,
        malId,
        imdbId,
        episode,
        embedUrl,
        isDirectHls,
      },
    };
  }

  private baseUrl(): string {
    return this.config.get('kitsu')?.baseUrl ?? 'https://kitsu.io/api/edge';
  }

  private pageQuery(page: number, limit = 20): string {
    const offset = (Math.max(page, 1) - 1) * limit;
    return `page[limit]=${limit}&page[offset]=${offset}`;
  }

  private currentSeason(): { season: string; year: number } {
    const seasons = ['winter', 'spring', 'summer', 'fall'];
    const now = new Date();
    return { season: seasons[Math.floor(now.getMonth() / 3)], year: now.getFullYear() };
  }

  private async fetch(path: string): Promise<KitsuResponse | null> {
    return this.http.get<KitsuResponse>(`${this.baseUrl()}${path}`, {
      headers: { Accept: 'application/vnd.api+json' },
    });
  }

  private splitDocument(res: KitsuResponse): [KitsuResource[], KitsuResource[]] {
    const data = Array.isArray(res.data) ? res.data : [res.data];
    return [data, res.included ?? []];
  }

  private extractMalId(docs: KitsuResource[], included: KitsuResource[]): number | null {
    const wanted = new Set<string>();
    for (const doc of docs) {
      const rel = doc.relationships?.mappings?.data;
      for (const ref of Array.isArray(rel) ? rel : [rel]) {
        if (ref?.type === 'mappings') wanted.add(ref.id);
      }
    }
    const candidates = included.filter((i) => i.type === 'mappings' && wanted.has(i.id));
    const hit = candidates.find((i) => i.attributes?.externalSite === MAL_SITE);
    const fallback = candidates.find((i) => i.attributes?.externalSite?.startsWith('myanimelist/'));
    const id = hit?.attributes?.externalId ?? fallback?.attributes?.externalId ?? null;
    return id != null ? Number(id) : null;
  }

  private extractImdbId(docs: KitsuResource[], included: KitsuResource[]): string | null {
    const wanted = new Set<string>();
    for (const doc of docs) {
      const rel = doc.relationships?.mappings?.data;
      for (const ref of Array.isArray(rel) ? rel : [rel]) {
        if (ref?.type === 'mappings') wanted.add(ref.id);
      }
    }
    const candidates = included.filter((i) => i.type === 'mappings' && wanted.has(i.id));
    const hit = candidates.find((i) => i.attributes?.externalSite?.startsWith('imdb'));
    const rawId = hit?.attributes?.externalId ? String(hit.attributes.externalId) : null;
    if (!rawId) return null;
    return rawId.startsWith('tt') ? rawId : `tt${rawId}`;
  }

  private toPaged(res: KitsuResponse, page: number) {
    const [docs, included] = this.splitDocument(res);
    const count = res.meta?.count;
    return {
      page,
      totalPages: count ? Math.ceil(count / 20) : null,
      items: docs
        .map((doc) => this.toItem(doc, included))
        .filter((i): i is AnimeItemDto => i !== null),
    };
  }

  private toItem(doc: KitsuResource, included: KitsuResource[] = []): AnimeItemDto | null {
    const a = doc.attributes;
    if (!a) return null;
    const hasGenres = included.some((i) => i.type === 'genres');
    const genres = hasGenres
      ? included.filter((i) => i.type === 'genres').map((g) => (g.attributes as { name?: string }).name ?? '')
      : null;
    const year = a.startDate ? Number(String(a.startDate).slice(0, 4)) : null;
    const rating = a.averageRating ? Number(a.averageRating) / 10 : null;
    return {
      kitsuId: doc.id,
      malId: this.extractMalId([doc], included),
      imdbId: this.extractImdbId([doc], included),
      title: (a.titles?.en || a.titles?.en_us || a.canonicalTitle || a.titles?.en_jp || 'Sem título').trim(),
      posterUrl: a.posterImage?.large || a.posterImage?.medium || a.posterImage?.small || null,
      overview: a.synopsis ?? a.description?.en ?? null,
      releaseYear: Number.isNaN(year) ? null : year,
      episodesCount: a.episodeCount ?? null,
      score: rating && !Number.isNaN(rating) ? Number(rating.toFixed(2)) : null,
      genres: genres && genres.length ? genres.filter(Boolean) : null,
    };
  }
}