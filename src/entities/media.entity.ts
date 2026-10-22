import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type MediaType = 'MOVIE' | 'SERIES' | 'ANIME' | 'SOAP_OPERA';

@Entity('medias')
@Index('idx_medias_type', ['type'])
@Index('idx_medias_title', ['title'])
export class Media {
  /** Usa diretamente o ID oficial do TMDB ou Kitsu. */
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'enum', enumName: 'media_type', enum: ['MOVIE', 'SERIES', 'ANIME', 'SOAP_OPERA'] })
  type: MediaType;

  @Column({ name: 'poster_url', type: 'text', nullable: true })
  posterUrl: string | null;

  @Column({ name: 'backdrop_url', type: 'text', nullable: true })
  backdropUrl: string | null;

  @Column({ type: 'text', nullable: true })
  overview: string | null;

  @Column({ name: 'release_year', type: 'int', nullable: true })
  releaseYear: number | null;

  /** Usado principalmente para Filmes (link direto ou embed para a WebView). */
  @Column({ name: 'stream_url', type: 'text', nullable: true })
  streamUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
