import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ExternalHttpService } from '../common/http-client.service';
import { KitsuController } from './kitsu.controller';
import { KitsuService } from './kitsu.service';

@Module({
  imports: [HttpModule],
  providers: [KitsuService, ExternalHttpService],
  controllers: [KitsuController],
  exports: [KitsuService],
})
export class KitsuModule {}
