import { Module } from '@nestjs/common';
import { AnimesController } from './animes.controller';
import { TmdbModule } from '../tmdb/tmdb.module';

@Module({
  imports: [TmdbModule],
  controllers: [AnimesController],
})
export class AnimesModule {}