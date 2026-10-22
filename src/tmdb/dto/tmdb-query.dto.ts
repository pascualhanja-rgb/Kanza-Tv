import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class TmdbQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  page: number = 1;

  @ApiPropertyOptional({ example: '/avatar', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  query?: string;
}

export class TmdbSearchDto {
  @ApiProperty({ example: 'avatar' })
  @IsString()
  @Length(1, 100)
  query!: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  page: number = 1;
}

export class TmdbIdDto {
  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;
}
