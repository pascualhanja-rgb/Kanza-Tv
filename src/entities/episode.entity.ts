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

@Entity('episodes')
@Index('idx_episodes_media_season', ['mediaId', 'seasonNumber', 'episodeNumber'], { unique: true })
export class Episode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'media_id', type: 'int' })
  mediaId: number;

  @ManyToOne(() => Media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media: Media;

  @Column({ name: 'season_number', type: 'int' })
  seasonNumber: number;

  @Column({ name: 'episode_number', type: 'int' })
  episodeNumber: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  /** Link de vídeo específico para este episódio. */
  @Column({ name: 'stream_url', type: 'text' })
  streamUrl: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
