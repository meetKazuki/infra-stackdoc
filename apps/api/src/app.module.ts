import { ConfigModule } from '@nestjs/config'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { config } from '@/common/config'
import { ConfigsModule } from './modules/configs/configs.module'
import { dbOptions } from '@/database/datasource'

@Module({
  imports: [
    ConfigModule.forRoot({ load: [() => config()] }),
    TypeOrmModule.forRoot({ ...dbOptions, autoLoadEntities: true }),

    ConfigsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
