import { Injectable, Logger } from '@nestjs/common';
import { ExternalHttpService } from '../common/http-client.service';

@Injectable()
export class AnimeResolverService {
  private readonly logger = new Logger(AnimeResolverService.name);

  constructor(private readonly http: ExternalHttpService) {}

  /**
   * Tenta extrair a URL direta (.m3u8 ou .mp4) a partir dos fornecedores ativos.
   */
  async resolveStreamUrl(targetId: string, episode: number): Promise<string | null> {
    // 1. Tentar resolver via WarezCDN (.sbs)
    const warezUrl = await this.resolveWarezCDN(targetId, episode);
    if (warezUrl) return warezUrl;

    // 2. Tentar resolver via SuperFlix API
    const superflixUrl = await this.resolveSuperFlix(targetId, episode);
    if (superflixUrl) return superflixUrl;

    return null;
  }

  private async resolveWarezCDN(targetId: string, episode: number): Promise<string | null> {
    try {
      const pageUrl = `https://warezcdn.sbs/serie/${targetId}/1/${episode}`;
      const html = await this.http.get<string>(pageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://warezcdn.sbs/',
        },
      });

      if (!html) return null;

      // Procura padrões de playlist HLS (.m3u8) no HTML/JS da página
      const match = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
      if (match && match[1]) {
        return match[1];
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao resolver WarezCDN para ID ${targetId}: ${message}`);
    }
    return null;
  }

  private async resolveSuperFlix(targetId: string, episode: number): Promise<string | null> {
    try {
      const pageUrl = `https://superflixapi.top/tv/${targetId}/1/${episode}`;
      const html = await this.http.get<string>(pageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://superflixapi.top/',
        },
      });

      if (!html) return null;

      const match = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
      if (match && match[1]) {
        return match[1];
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao resolver SuperFlix para ID ${targetId}: ${message}`);
    }
    return null;
  }
}