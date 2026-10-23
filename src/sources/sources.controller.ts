import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AdminKeyGuard } from '../iptv/admin-key.guard';
import { SourcesService } from './sources.service';
import { UpsertSourcesDto } from './dto/source.dto';

const intPipe = (name: string): ParseIntPipe =>
  new ParseIntPipe({
    exceptionFactory: () => new BadRequestException(`O parâmetro ${name} deve ser um número inteiro válido.`),
  });

@ApiTags('Fontes de Vídeo')
@Controller()
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  // ---------- Leitura (pública) ----------

  @Get('movies/:id/sources')
  movieSources(@Param('id', intPipe('id')) id: number) {
    return this.sources.forTitle(id);
  }

  @Get('series/:id/episodes/:season/:episode/sources')
  seriesEpisodeSources(
    @Param('id', intPipe('id')) id: number,
    @Param('season', intPipe('season')) season: number,
    @Param('episode', intPipe('episode')) episode: number,
  ) {
    return this.sources.forEpisode(id, season, episode);
  }

  @Get('animes/:id/sources')
  animeSources(@Param('id', intPipe('id')) id: number) {
    return this.sources.forTitle(id);
  }

  @Get('animes/:id/episodes/:season/:episode/sources')
  animeEpisodeSources(
    @Param('id', intPipe('id')) id: number,
    @Param('season', intPipe('season')) season: number,
    @Param('episode', intPipe('episode')) episode: number,
  ) {
    return this.sources.forEpisode(id, season, episode);
  }

  // ---------- Gestão (admin — header x-sync-key) ----------

  @Post('sources')
  @HttpCode(200)
  @UseGuards(AdminKeyGuard)
  @ApiSecurity('x-sync-key')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  upsert(@Body() dto: UpsertSourcesDto) {
    return this.sources.upsertBatch(dto.sources);
  }

  @Delete('sources/:id')
  @UseGuards(AdminKeyGuard)
  @ApiSecurity('x-sync-key')
  remove(@Param('id', intPipe('id')) id: number) {
    return this.sources.remove(id);
  }
}
