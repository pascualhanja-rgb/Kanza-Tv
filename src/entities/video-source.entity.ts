import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Media } from './media.entity';

export type SourceLanguage = 'DUB' | 'SUB' | 'AUTO';

/**
 * Fonte de reprodução (embed) para um título ou episódio.
 * - season/episode NULL  → fonte do título inteiro (Filmes, Anime filme, etc.)
 * - season/episode definidos → fonte de um episódio específico
 * Permite registar vários servidores (VidSrc, Servidor 1, Servidor 2, ...)
 * separando Dublado (DUB) de Legendado (SUB).
 */
@Entity('video_sources')
@Index('idx_video_sources_media', ['mediaId'])
@Index('idx_video_sources_episode', ['mediaId', 'seasonNumber', 'episodeNumber'])
export class VideoSource {
  @PrimaryGeneratedColumn()
  id: number;

  /** ID oficial (TMDB/Kitsu) — FK para medias.id. */
  @Column({ name: 'media_id', type: 'int' })
  mediaId: number;

  @ManyToOne(() => Media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media: Media;

  @Column({ name: 'season_number', type: 'int', nullable: true })
  seasonNumber: number | null;

  @Column({ name: 'episode_number', type: 'int', nullable: true })
  episodeNumber: number | null;

  /** Nome do servidor (ex: "VidSrc", "Servidor 1", "Superflix"). */
  @Column({ type: 'varchar', length: 100 })
  server: string;

  /** Idioma da faixa: DUB = Dublado (PT), SUB = Legendado, AUTO = o player decide. */
  @Column({ type: 'enum', enumName: 'source_language', enum: ['DUB', 'SUB', 'AUTO'], default: 'AUTO' })
  language: SourceLanguage;

  /** Qualidade declarada (ex: "1080p", "720p", "HD", "SD"). */
  @Column({ type: 'varchar', length: 30, default: 'AUTO' })
  quality: string;

  /** URL do embed/iframe para o player. */
  @Column({ type: 'text' })
  url: string;

  /** Ordem de apresentação — menor aparece primeiro (Servidor 1, 2...). */
  @Column({ type: 'int', default: 0 })
  priority: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
