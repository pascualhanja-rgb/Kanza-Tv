import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveChannel } from '../entities/live-channel.entity';
import { ExternalHttpService } from '../common/http-client.service';
import { AdminKeyGuard } from './admin-key.guard';
import { IptvController } from './iptv.controller';
import { IptvService } from './iptv.service';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([LiveChannel])],
  providers: [IptvService, ExternalHttpService, AdminKeyGuard],
  controllers: [IptvController],
  exports: [IptvService],
})
export class IptvModule {}
