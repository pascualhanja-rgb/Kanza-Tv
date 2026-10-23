import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ExternalHttpService } from '../common/http-client.service';
import { KitsuController } from './kitsu.controller';
import { KitsuService } from './kitsu.service';
import { AnimeResolverService } from './anime-resolver.service';

@Module({
  imports: [HttpModule],
  providers: [
    KitsuService, 
    ExternalHttpService, 
    AnimeResolverService, // <--- Fica dentro do array providers
  ],
  controllers: [KitsuController],
  exports: [KitsuService],
})
export class KitsuModule {}