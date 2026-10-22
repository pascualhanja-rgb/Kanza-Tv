import { Get, HttpCode, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AdminKeyGuard } from './admin-key.guard';
import { ChannelQueryDto } from './dto/channel-query.dto';
import { IptvService } from './iptv.service';

@ApiTags('Canais de TV (IPTV)')
@Controller('iptv')
export class IptvController {
  constructor(private readonly iptv: IptvService) {}

  /** Sincronização da lista M3U com a base de dados — rota protegida por ADMIN_SYNC_KEY. */
  @Post('sync')
  @HttpCode(200)
  @UseGuards(AdminKeyGuard)
  @ApiSecurity('x-sync-key')
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  sync() {
    return this.iptv.sync();
  }

  /** Canais paginados/filtrados — é isto que o Flutter chama. */
  @Get('channels')
  channels(@Query() query: ChannelQueryDto) {
    return this.iptv.listChannels(query);
  }

  @Get('categories')
  categories() {
    return this.iptv.categories();
  }

  @Get('countries')
  countries() {
    return this.iptv.countries();
  }
}
