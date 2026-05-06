import { ConfigModule } from '@nestjs/config'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './modules/auth/auth.module'
import { config } from '@/common/config'
import { ConfigsModule } from './modules/configs/configs.module'
import { dbOptions } from '@/database/datasource'
import { UsersModule } from './modules/users/user.module'

@Module({
  imports: [
    ConfigModule.forRoot({ load: [() => config()] }),
    TypeOrmModule.forRoot({ ...dbOptions, autoLoadEntities: true }),

    AuthModule,
    ConfigsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
