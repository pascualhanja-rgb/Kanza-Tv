import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ExternalHttpService } from '../common/http-client.service';
import { TmdbController } from './tmdb.controller';
import { TmdbService } from './tmdb.service';

@Module({
  imports: [HttpModule],
  providers: [TmdbService, ExternalHttpService],
  controllers: [TmdbController],
  exports: [TmdbService, ExternalHttpService],
})
export class TmdbModule {}
