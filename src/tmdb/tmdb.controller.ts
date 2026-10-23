import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TmdbService } from './tmdb.service';

@ApiTags('TMDB')
@Controller()
export class TmdbController {
  constructor(private readonly tmdb: TmdbService) {}

  // ---------- Filmes ----------

  @Get('movies/trending')
  trending(@Query('page') page?: number) {
    return this.tmdb.movieTrending(Number(page) || 1);
  }

  @Get('movies/popular')
  popular(
    @Query('genre') genre?: string,
    @Query('year') year?: string,
    @Query('page') page?: string,
  ) {
    return this.tmdb.moviePopular(
      genre ? Number(genre) : undefined,
      year ? Number(year) : undefined,
      Number(page) || 1,
    );
  }

  @Get('movies/search')
  search(@Query('q') q: string, @Query('page') page?: string) {
    return this.tmdb.movieSearch(q || '', Number(page) || 1);
  }

  @Get('movies/:id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.tmdb.movieDetail(id);
  }

  // ---------- Séries ----------

  @Get('series/trending')
  seriesTrending(@Query('page') page?: string) {
    return this.tmdb.seriesTrending(Number(page) || 1);
  }

  @Get('series/popular')
  seriesPopular(
    @Query('genre') genre?: string,
    @Query('year') year?: string,
    @Query('page') page?: string,
  ) {
    return this.tmdb.seriesPopular(
      genre ? Number(genre) : undefined,
      year ? Number(year) : undefined,
      Number(page) || 1,
    );
  }

  @Get('series/search')
  seriesSearch(@Query('q') q: string, @Query('page') page?: string) {
    return this.tmdb.seriesSearch(q || '', Number(page) || 1);
  }

  @Get('series/:id')
  seriesDetail(@Param('id', ParseIntPipe) id: number) {
    return this.tmdb.seriesDetail(id);
  }

  @Get('series/:id/seasons')
  seriesSeasons(@Param('id', ParseIntPipe) id: number) {
    return this.tmdb.seriesSeasons(id);
  }

  @Get('series/:id/episodes/:season')
  episodes(
    @Param('id', ParseIntPipe) id: number,
    @Param('season', ParseIntPipe) season: number,
  ) {
    return this.tmdb.seriesEpisodes(id, season);
  }

  // ---------- Novelas ----------

  @Get('soap-operas/popular')
  soapOperas(@Query('page') page?: string) {
    return this.tmdb.soapOperaPopular(Number(page) || 1);
  }

  @Get('soap-operas/search')
  soapOperasSearch(@Query('q') q: string, @Query('page') page?: string) {
    return this.tmdb.soapOperaSearch(q || '', Number(page) || 1);
  }

  @Get('soap-operas/:id')
  soapOperaDetail(@Param('id', ParseIntPipe) id: number) {
    return this.tmdb.soapOperaDetail(id);
  }
}
