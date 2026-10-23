import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TmdbService } from '../tmdb/tmdb.service';

export const intPipe = (name: string): ParseIntPipe =>
  new ParseIntPipe({
    exceptionFactory: () => new BadRequestException(`O parâmetro ${name} deve ser um número inteiro válido.`),
  });

@ApiTags('Animes')
@Controller('animes')
export class AnimesController {
  constructor(private readonly tmdbService: TmdbService) {}

  @Get('popular')
  popular(@Query('page') page?: string) {
    return this.tmdbService.animePopular(Number(page) || 1);
  }

  @Get('top')
  top(@Query('page') page?: string) {
    return this.tmdbService.animePopular(Number(page) || 1);
  }

  @Get('season-now')
  seasonNow(@Query('page') page?: string) {
    return this.tmdbService.animePopular(Number(page) || 1);
  }

  @Get('search')
  search(@Query('q') q: string, @Query('page') page?: string) {
    return this.tmdbService.animeSearch(q || '', Number(page) || 1);
  }

  @Get(':id')
  detail(@Param('id', intPipe('id')) id: number) {
    return this.tmdbService.animeDetail(id);
  }

  @Get(':id/seasons')
  seasons(@Param('id', intPipe('id')) id: number) {
    return this.tmdbService.seriesSeasons(id);
  }

  @Get(':id/episodes/:season')
  episodes(
    @Param('id', intPipe('id')) id: number,
    @Param('season', intPipe('season')) season: number,
  ) {
    return this.tmdbService.animeEpisodes(id, season);
  }
}