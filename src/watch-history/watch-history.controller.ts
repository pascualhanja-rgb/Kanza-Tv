import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { UpsertWatchDto } from './dto/watch-history.dto';
import { WatchHistoryService } from './watch-history.service';

@ApiTags('Watch History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('watch-history')
export class WatchHistoryController {
  constructor(private readonly service: WatchHistoryService) {}

  @Post()
  upsert(@CurrentUser() user: JwtPayload, @Body() dto: UpsertWatchDto) {
    return this.service.upsert(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('limit') limit?: string) {
    return this.service.listForUser(user.sub, Number(limit) || 20);
  }

  @Delete(':mediaId')
  remove(@CurrentUser() user: JwtPayload, @Param('mediaId', ParseIntPipe) mediaId: number) {
    return this.service.remove(user.sub, mediaId);
  }
}
