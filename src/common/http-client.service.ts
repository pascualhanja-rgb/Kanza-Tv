import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class ExternalHttpService {
  private readonly logger = new Logger(ExternalHttpService.name);

  constructor(private readonly http: HttpService) {}

  /**
   * GET com timeout, retries exponenciais eUser-Agent explícito.
   * Nunca falha a request inteira sem log — devolve null em erro recuperável.
   */
  async get<T>(url: string, config: AxiosRequestConfig = {}, retries = 2): Promise<T | null> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response: AxiosResponse<T> = await firstValueFrom(
          this.http.get<T>(url, {
            timeout: 15_000,
            headers: {
              'User-Agent': 'StreamHubBackend/1.0 (+https://streamhub.app)',
              Accept: 'application/json',
              ...config.headers,
            },
            ...config,
          }).pipe(timeout(20_000)),
        );
        return response.data;
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          const delay = 500 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(`External GET falhou: ${url}: ${String(lastError)}`);
    return null;
  }

  /** GET para texto bruto (ex: ficheiro M3U). */
  async getText(url: string, retries = 2): Promise<string | null> {
    const data = await this.get<string>(
      url,
      { responseType: 'text', headers: { Accept: '*/*' } },
      retries,
    );
    return typeof data === 'string' ? data : null;
  }
}
