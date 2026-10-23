import { Injectable, Logger } from '@nestjs/common';
import { ExternalHttpService } from '../common/http-client.service';

@Injectable()
export class AnimeResolverService {
  private readonly logger = new Logger(AnimeResolverService.name);

  constructor(private readonly http: ExternalHttpService) {}

  async resolveStreamUrl(imdbId: string | null, episode: number): Promise<string | null> {
    if (!imdbId || !imdbId.startsWith('tt')) {
      return null; // Evita enviar IDs incorretos como o MAL ID
    }

    const warezUrl = await this.resolveWarezCDN(imdbId, episode);
    if (warezUrl) return warezUrl;

    const superflixUrl = await this.resolveSuperFlix(imdbId, episode);
    if (superflixUrl) return superflixUrl;

    return null;
  }

  private async resolveWarezCDN(imdbId: string, episode: number): Promise<string | null> {
    try {
      const pageUrl = `https://warezcdn.sbs/serie/${imdbId}/1/${episode}`;
      const html = await this.http.get<string>(pageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://warezcdn.sbs/',
        },
      });

      if (!html) return null;
      const match = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
      return match ? match[1] : null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao resolver WarezCDN para ${imdbId}: ${message}`);
      return null;
    }
  }

  private async resolveSuperFlix(imdbId: string, episode: number): Promise<string | null> {
    try {
      const pageUrl = `https://superflixapi.top/tv/${imdbId}/1/${episode}`;
      const html = await this.http.get<string>(pageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://superflixapi.top/',
        },
      });

      if (!html) return null;
      const match = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
      return match ? match[1] : null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao resolver SuperFlix para ${imdbId}: ${message}`);
      return null;
    }
  }
}