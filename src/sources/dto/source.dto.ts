import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertSourceInput {
  @ApiProperty({ example: 1050992 })
  @IsInt()
  mediaId!: number;

  @ApiProperty({ example: 'MOVIE', enum: ['MOVIE', 'SERIES', 'ANIME', 'SOAP_OPERA'] })
  @IsIn(['MOVIE', 'SERIES', 'ANIME', 'SOAP_OPERA'])
  mediaType!: 'MOVIE' | 'SERIES' | 'ANIME' | 'SOAP_OPERA';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  seasonNumber?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  episodeNumber?: number;

  @ApiProperty({ example: 'Servidor 1' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  server!: string;

  @ApiProperty({ example: 'DUB', enum: ['DUB', 'SUB', 'AUTO'], default: 'AUTO' })
  @IsIn(['DUB', 'SUB', 'AUTO'])
  language!: 'DUB' | 'SUB' | 'AUTO';

  @ApiPropertyOptional({ example: '1080p' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  quality?: string;

  @ApiProperty({ example: 'https://vidsrc.icu/embed?tmdb=1050992' })
  @IsUrl({ require_tld: false })
  url!: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}

export class UpsertSourcesDto {
  @ApiProperty({ type: [UpsertSourceInput] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertSourceInput)
  sources!: UpsertSourceInput[];
}

export interface SourceDto {
  id: number | null;
  server: string;
  language: 'DUB' | 'SUB' | 'AUTO';
  /** Etiqueta legível: "Dublado (PT)", "Legendado" ou "Automático". */
  languageLabel: string;
  quality: string;
  url: string;
  priority: number;
}

export interface SourcesResponseDto {
  mediaId: number;
  season?: number;
  episode?: number;
  source: 'custom' | 'vidsrc';
  sources: SourceDto[];
}
