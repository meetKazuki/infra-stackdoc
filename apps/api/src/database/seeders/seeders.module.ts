import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Config } from '@/modules/configs/configs.entity'
import { ConfigTag } from '@/modules/configs/config-tag.entity'
import { TemplatesSeederService } from './templates-seeder.service'

@Module({
  imports: [TypeOrmModule.forFeature([Config, ConfigTag])],
  providers: [TemplatesSeederService],
})
export class SeedersModule {}
