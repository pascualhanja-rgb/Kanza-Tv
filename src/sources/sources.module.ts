import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoSource } from '../entities/video-source.entity';
import { TmdbModule } from '../tmdb/tmdb.module';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';

@Module({
  imports: [TypeOrmModule.forFeature([VideoSource]), TmdbModule],
  controllers: [SourcesController],
  providers: [SourcesService],
})
export class SourcesModule {}
