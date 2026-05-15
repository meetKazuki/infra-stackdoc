import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Config } from './configs.entity'
import { ConfigsController } from './configs.controller'
import { ConfigsService } from './configs.service'
import { ConfigTag } from './config-tag.entity'
import { AuthModule } from '@/modules/auth/auth.module'

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Config, ConfigTag])],
  controllers: [ConfigsController],
  providers: [ConfigsService],
  exports: [ConfigsService],
})
export class ConfigsModule {}
