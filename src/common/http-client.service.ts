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

  /**
   * Igual ao get(), mas também devolve o status HTTP do último erro
   * (ex: 401 de credencial inválida), sem interromper o fluxo com exceção.
   */
  async getWithStatus<T>(
    url: string,
    config: AxiosRequestConfig = {},
    retries = 2,
  ): Promise<{ data: T | null; status: number | null }> {
    let lastStatus: number | null = null;

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
        return { data: response.data, status: response.status };
      } catch (error) {
        lastStatus =
          (error as { response?: { status?: number } })?.response?.status ?? null;
        if (attempt < retries) {
          const delay = 500 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(`External GET falhou: ${url} (status ${lastStatus ?? 'n/a'})`);
    return { data: null, status: lastStatus };
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
