import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class ChannelQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 50, default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;

  @ApiPropertyOptional({ example: 'Notícias' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  category?: string;

  @ApiPropertyOptional({ example: 'PT' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ example: 'RTP' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;
}

export interface ChannelDto {
  id: number;
  name: string;
  logoUrl: string | null;
  category: string | null;
  country: string | null;
  streamUrl: string;
}

export class SyncResultDto {
  total!: number;
  inserted!: number;
  skipped!: number;
  durationMs!: number;
}
