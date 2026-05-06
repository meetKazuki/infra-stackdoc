import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  type Relation,
} from 'typeorm'
import { AuthProvider } from '@/common/utils/enums'
import { Config } from '@/modules/configs/configs.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'github_id', unique: true })
  githubId!: string

  @Column()
  username!: string

  @Column({ type: 'varchar', name: 'display_name', nullable: true })
  displayName?: string | null

  @Column({ type: 'varchar', name: 'avatar_url', nullable: true })
  avatarUrl?: string | null

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.GITHUB })
  provider!: AuthProvider

  @OneToMany(() => Config, (config) => config.user)
  configs!: Relation<Config[]>

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
