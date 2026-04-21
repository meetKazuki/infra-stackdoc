import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Relation } from 'typeorm'
import { Config } from './configs.entity'

@Entity('config_tags')
export class ConfigTag {
  @PrimaryColumn({ name: 'config_id' })
  configId!: string

  @PrimaryColumn()
  tag!: string

  @ManyToOne(() => Config, (config) => config.tags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'config_id' })
  config!: Relation<Config>
}
