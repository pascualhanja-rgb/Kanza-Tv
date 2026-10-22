import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('live_channels')
@Index('idx_live_channels_category', ['category'])
@Index('idx_live_channels_country', ['country'])
@Index('idx_live_channels_stream_url', ['streamUrl'], { unique: true })
export class LiveChannel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  /** Link de streaming HLS/M3U8 (.m3u8). */
  @Column({ name: 'stream_url', type: 'text' })
  streamUrl: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
