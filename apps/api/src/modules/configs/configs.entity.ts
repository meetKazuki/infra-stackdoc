import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm'
import { ConfigTag } from './config-tag.entity'
import { TemplateCategory, Visibility } from '@/common/utils/enums'
import { User } from '@/modules/users/user.entity'

@Entity('configs')
export class Config {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', nullable: true })
  userId?: string | null

  @Column({ unique: true })
  slug!: string

  @Column()
  title!: string

  @Column('text')
  yaml!: string

  @Column({ type: 'enum', enum: Visibility, default: Visibility.UNLISTED })
  visibility!: Visibility

  @Column({ type: 'varchar', name: 'fork_of', nullable: true })
  forkOf?: string | null

  @Column({ name: 'view_count', default: 0 })
  viewCount!: number

  @Column({ name: 'fork_count', default: 0 })
  forkCount!: number

  @Column({ type: 'varchar', name: 'content_hash', nullable: true })
  contentHash?: string | null

  @Column({ name: 'is_template', default: false })
  isTemplate!: boolean

  @Column({ type: 'enum', enum: TemplateCategory, name: 'template_category', nullable: true })
  templateCategory?: TemplateCategory | null

  @OneToMany(() => ConfigTag, (tag) => tag.config, { cascade: true, eager: true })
  tags!: Relation<ConfigTag[]>

  @ManyToOne(() => User, (user) => user.configs, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User> | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
