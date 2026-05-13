import { ConfigModule } from '@nestjs/config'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './modules/auth/auth.module'
import { ConfigsModule } from './modules/configs/configs.module'
import { TemplateGalleryModule } from './modules/templates/templates.module'
import { UsersModule } from './modules/users/user.module'
import { config } from '@/common/config'
import { dbOptions } from '@/database/datasource'

@Module({
  imports: [
    ConfigModule.forRoot({ load: [() => config()] }),
    TypeOrmModule.forRoot({ ...dbOptions, autoLoadEntities: true }),

    AuthModule,
    ConfigsModule,
    TemplateGalleryModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
