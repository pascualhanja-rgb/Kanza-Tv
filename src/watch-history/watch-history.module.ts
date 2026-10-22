import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Media } from '../entities/media.entity';
import { WatchHistory } from '../entities/watch-history.entity';
import { WatchHistoryController } from './watch-history.controller';
import { WatchHistoryService } from './watch-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([WatchHistory, Media]), AuthModule],
  providers: [WatchHistoryService],
  controllers: [WatchHistoryController],
})
export class WatchHistoryModule {}
