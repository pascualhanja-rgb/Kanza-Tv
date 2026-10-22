import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { KitsuService } from './kitsu.service';

/** ParseIntPipe com mensagem de erro em pt-BR para o app exibir alerta legível. */
export const intPipe = (name: string): ParseIntPipe =>
  new ParseIntPipe({
    exceptionFactory: () => new BadRequestException(`O parâmetro ${name} deve ser um número inteiro válido.`),
  });

@ApiTags('Animes')
@Controller('animes')
export class KitsuController {
  constructor(private readonly kitsu: KitsuService) {}

  @Get('top')
  top(@Query('page') page?: string) {
    return this.kitsu.topAnime(Number(page) || 1);
  }

  @Get('season-now')
  seasonNow(@Query('page') page?: string) {
    return this.kitsu.seasonNow(Number(page) || 1);
  }

  @Get('search')
  search(@Query('q') q: string, @Query('page') page?: string) {
    return this.kitsu.search(q || '', Number(page) || 1);
  }

  /**
   * GET /api/animes/stream/kitsu/:kitsuId?ep=:episode
   * Mapeia kitsuId -> mal_id internamente e devolve a embedUrl do VidSrc
   * para o Flutter abrir direto na WebView.
   */
  @Get('stream/kitsu/:kitsuId')
  stream(
    @Param('kitsuId', intPipe('kitsuId')) kitsuId: number,
    @Query('ep', intPipe('ep')) ep: number,
  ) {
    if (ep < 1) throw new BadRequestException('ep deve ser maior ou igual a 1.');
    return this.kitsu.stream(String(kitsuId), ep);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.kitsu.detail(String(id));
  }

  @Get(':id/episodes')
  episodes(@Param('id', ParseIntPipe) id: number, @Query('page') page?: string) {
    return this.kitsu.episodes(String(id), Number(page) || 1);
  }
}
