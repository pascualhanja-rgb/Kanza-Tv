import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export class UpsertWatchDto {
  @ApiProperty({ example: 550 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mediaId!: number;

  @ApiProperty({ example: 'MOVIE', enum: ['MOVIE', 'SERIES', 'ANIME', 'SOAP_OPERA'] })
  @IsString()
  @IsIn(['MOVIE', 'SERIES', 'ANIME', 'SOAP_OPERA'])
  mediaType!: 'MOVIE' | 'SERIES' | 'ANIME' | 'SOAP_OPERA';

  @ApiProperty({ example: 'Avatar' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/x.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  posterUrl?: string;

  @ApiProperty({ example: 2400, description: 'Progresso em segundos' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  progress!: number;

  @ApiPropertyOptional({ example: 'https://stream.example.com/ep1.m3u8' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.mediaType === 'MOVIE' && !o.streamUrl)
  streamUrl?: string;
}
