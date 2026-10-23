import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { ExternalHttpService } from '../common/http-client.service';
import type { MediaType } from '../entities/media.entity';

interface TmdbItem {
  id: number;
  title?: string | null;
  name?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  still_path?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  air_date?: string | null;
  runtime?: number | null;
  episode_number?: number | null;
  episode_run_time?: number[] | null;
  vote_average?: number | null;
  genres?: Array<{ id: number; name: string }>;
  seasons?: Array<{
    season_number?: number | null;
    name?: string | null;
    episode_count?: number | null;
    air_date?: string | null;
  }>;
}

interface Paged {
  page?: number;
  results?: TmdbItem[];
  total_pages?: number | null;
  total_results?: number | null;
}

export interface CatalogItemDto {
  tmdbId: number;
  title: string;
  type: MediaType;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string | null;
  releaseYear: number | null;
}

export interface CatalogDetailDto extends CatalogItemDto {
  runtime: number | null;
  genres: string[] | null;
  voteAverage: number | null;
}

export interface TmdbEpisode {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview: string | null;
  stillPath: string | null;
  airDate: string | null;
}

export interface SeasonDto {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
}

interface PagedResult {
  page: number;
  totalPages: number | null;
  items: CatalogItemDto[];
}

interface CacheEntry {
  value: Paged;
  expiresAt: number;
}

@Injectable()
export class TmdbService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly http: ExternalHttpService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  // ---------- Filmes ----------

  async movieTrending(page = 1): Promise<PagedResult> {
    return this.listItems('MOVIE', `/trending/movie/week?page=${page}`, page);
  }

  async moviePopular(genreId?: number, year?: number, page = 1): Promise<PagedResult> {
    const params = new URLSearchParams({
      page: String(page),
      sort_by: 'popularity.desc',
      include_adult: 'false',
    });
    if (genreId) params.set('with_genres', String(genreId));
    if (year) params.set('primary_release_year', String(year));
    return this.listItems('MOVIE', `/discover/movie?${params.toString()}`, page);
  }

  async movieSearch(query: string, page = 1): Promise<PagedResult> {
    return this.search('MOVIE', query, page);
  }

  async movieDetail(id: number): Promise<CatalogDetailDto> {
    const data = await this.fetchRaw<TmdbItem>(`/movie/${id}`, true);
    if (!data) throw new NotFoundException('Filme não encontrado.');
    return this.toDetail(data, 'MOVIE');
  }

  // ---------- Séries ----------

  async seriesTrending(page = 1): Promise<PagedResult> {
    return this.listItems('SERIES', `/trending/tv/week?page=${page}`, page);
  }

  async seriesPopular(genreId?: number, year?: number, page = 1): Promise<PagedResult> {
    const params = new URLSearchParams({
      page: String(page),
      sort_by: 'popularity.desc',
      include_adult: 'false',
    });
    if (genreId) params.set('with_genres', String(genreId));
    if (year) params.set('first_air_date_year', String(year));
    return this.listItems('SERIES', `/discover/tv?${params.toString()}`, page);
  }

  async seriesSearch(query: string, page = 1): Promise<PagedResult> {
    return this.search('SERIES', query, page);
  }

  async seriesDetail(id: number): Promise<CatalogDetailDto> {
    const data = await this.fetchRaw<TmdbItem>(`/tv/${id}`, true);
    if (!data) throw new NotFoundException('Série não encontrada.');
    return this.toDetail(data, 'SERIES');
  }

  /**
   * Lista de temporadas REAIS de uma série, extraída do array `seasons` do
   * GET /tv/{id} da TMDB. Evita adivinhar temporadas com requests em loop
   * (que gerava dezenas de 404 e congestionava o processamento).
   */
  async seriesSeasons(id: number): Promise<{ tmdbId: number; seasons: SeasonDto[] }> {
    const data = await this.fetchRaw<TmdbItem>(`/tv/${id}`, true);
    if (!data) throw new NotFoundException('Série não encontrada.');
    return {
      tmdbId: id,
      seasons: (data.seasons ?? [])
        .filter((s) => (s.season_number ?? 0) >= 0)
        .map((s) => ({
          seasonNumber: s.season_number ?? 0,
          name: (s.name ?? '').trim(),
          episodeCount: s.episode_count ?? 0,
          airDate: s.air_date ?? null,
        })),
    };
  }

  /**
   * Lista de temporadas REAIS de uma série, extraída do array `seasons` do
   * GET /tv/{id} da TMDB. Evita adivinhar temporadas com requests em loop
   * (que gerava dezenas de 404 e congestionava o processamento).
   */
  // ---------- Animes (TMDB - Animação do Japão) ----------

  async animePopular(page = 1): Promise<PagedResult> {
    const params = new URLSearchParams({
      page: String(page),
      sort_by: 'popularity.desc',
      include_adult: 'false',
      with_genres: '16',
      with_origin_country: 'JP',
    });
    return this.listItems('ANIME', `/discover/tv?${params.toString()}`, page);
  }

  async animeSearch(query: string, page = 1): Promise<PagedResult> {
    return this.search('ANIME', query, page);
  }

  async animeDetail(id: number): Promise<CatalogDetailDto> {
    const data = await this.fetchRaw<TmdbItem>(`/tv/${id}`, true);
    if (!data) throw new NotFoundException('Anime não encontrado na TMDB.');
    return this.toDetail(data, 'ANIME');
  }

  async animeEpisodes(animeId: number, season = 1): Promise<TmdbEpisode[]> {
    return this.seriesEpisodes(animeId, season);
  }

  // ---------- Novelas (gênero "Soap" da TMDB, idioma original PT) ----------

  async soapOperaPopular(page = 1): Promise<PagedResult> {
    const genreId = this.config.get('tmdb')?.soapGenreId ?? 10766;
    const params = new URLSearchParams({
      page: String(page),
      sort_by: 'popularity.desc',
      include_adult: 'false',
      with_original_language: 'pt',
      with_genres: String(genreId),
    });
    return this.listItems('SOAP_OPERA', `/discover/tv?${params.toString()}`, page);
  }

  async soapOperaSearch(query: string, page = 1): Promise<PagedResult> {
    return this.search('SOAP_OPERA', query, page);
  }

  async soapOperaDetail(id: number): Promise<CatalogDetailDto> {
    const data = await this.fetchRaw<TmdbItem>(`/tv/${id}`, true);
    if (!data) throw new NotFoundException('Novela não encontrada.');
    return this.toDetail(data, 'SOAP_OPERA');
  }

  async seriesEpisodes(seriesId: number, season: number): Promise<TmdbEpisode[]> {
    const data = await this.fetchRaw<{ episodes?: TmdbItem[] }>(
      `/tv/${seriesId}/season/${season}`,
      true,
    );
    const episodes = data?.episodes ?? [];
    return episodes.map((e) => ({
      seasonNumber: season,
      episodeNumber: e.episode_number ?? 0,
      name: (e.name ?? '').trim() || `Episódio ${e.episode_number ?? ''}`,
      overview: e.overview ?? null,
      stillPath: e.still_path ? `${this.imageBase()}/w300${e.still_path}` : null,
      airDate: e.air_date ?? null,
    }));
  }

  // ---------- Internos ----------

  private imageBase(): string {
    // imageBaseUrl vem tipo "https://image.tmdb.org/t/p/w500"
    const url = this.config.get('tmdb')?.imageBaseUrl ?? 'https://image.tmdb.org/t/p';
    return url.replace(/\/w\d+$/, '');
  }

  private async listItems(type: MediaType, path: string, page: number): Promise<PagedResult> {
    const data = await this.fetchPaged(path);
    if (!data) throw new NotFoundException('Conteúdo indisponível na TMDB.');
    const title = (i: TmdbItem) => (i.title ?? i.name ?? '').trim();
    const items = (data.results ?? [])
      .filter((r) => title(r).length > 0)
      .map((r) => this.toCatalogItem(r, type));
    return { page, totalPages: data.total_pages ?? null, items };
  }

  private async search(type: MediaType, query: string, page: number): Promise<PagedResult> {
    const encoded = encodeURIComponent(query.trim());
    return this.listItems(type, `/search/${tmdbPath(type)}?query=${encoded}&include_adult=false`, page);
  }

  private async fetchPaged(path: string): Promise<Paged | null> {
    const cached = this.cache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const data = await this.fetchRaw<Paged>(path, true);
    if (!data) return null;

    const ttlMs = (this.config.get('tmdb')?.cacheTtl ?? 300) * 1000;
    this.cache.set(path, { value: data, expiresAt: Date.now() + ttlMs });
    return data;
  }

  private async fetchRaw<T>(path: string, useToken: boolean): Promise<T | null> {
    const baseUrl = this.config.get('tmdb')!.baseUrl;
    const headers: Record<string, string> = { accept: 'application/json' };
    if (useToken) {
      const token = String(this.config.get('tmdb')!.authToken)
        .replace(/^'|'$/g, '')
        .trim();
      headers['Authorization'] = `Bearer ${token}`;
    }
    return this.http.get<T>(`${baseUrl}${path}`, { headers });
  }

  private toCatalogItem(item: TmdbItem, type: MediaType): CatalogItemDto {
    const date = item.release_date || item.first_air_date || null;
    const year = date ? Number(String(date).slice(0, 4)) : null;
    return {
      tmdbId: item.id,
      title: (item.title || item.name || 'Sem título').trim(),
      type,
      posterUrl: item.poster_path ? `${this.imageBase()}/w500${item.poster_path}` : null,
      backdropUrl: item.backdrop_path ? `${this.imageBase()}/w780${item.backdrop_path}` : null,
      overview: item.overview || null,
      releaseYear: Number.isFinite(year) ? (year as number) : null,
    };
  }

  private toDetail(item: TmdbItem, type: MediaType): CatalogDetailDto {
    return {
      ...this.toCatalogItem(item, type),
      runtime:
        (item.runtime && item.runtime > 0 ? item.runtime : null) ??
        (item.episode_run_time?.length ? item.episode_run_time[0] : null),
      genres: Array.isArray(item.genres) ? item.genres.map((g) => g.name) : null,
      voteAverage:
        typeof item.vote_average === 'number' ? Math.round(item.vote_average * 10) / 10 : null,
    };
  }
}

function tmdbPath(type: MediaType): 'movie' | 'tv' {
  return type === 'MOVIE' ? 'movie' : 'tv';
}
