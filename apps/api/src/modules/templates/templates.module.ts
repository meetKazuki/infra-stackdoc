import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TemplateController } from './templates.controller'
import { TemplateService } from './templates.service'
import { AuthModule } from '@/modules/auth/auth.module'
import { Config } from '@/modules/configs/configs.entity'
import { ConfigsModule } from '@/modules/configs/configs.module'

@Module({
  imports: [AuthModule, ConfigsModule, TypeOrmModule.forFeature([Config])],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateGalleryModule {}
