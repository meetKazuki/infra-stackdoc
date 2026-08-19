import { ConfigModule } from '@nestjs/config'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './modules/auth/auth.module'
import { ConfigsModule } from './modules/configs/configs.module'
import { GitHubStatsModule } from './modules/github-stats/github-stats.module'
import { TemplateModule } from './modules/templates/templates.module'
import { UsersModule } from './modules/users/user.module'
import { config } from '@/common/config'
import { dbOptions } from '@/database/datasource'
import { SeedersModule } from '@/database/seeders/seeders.module'

@Module({
  imports: [
    ConfigModule.forRoot({ load: [() => config()] }),
    SeedersModule,
    TypeOrmModule.forRoot({ ...dbOptions, autoLoadEntities: true }),

    AuthModule,
    ConfigsModule,
    GitHubStatsModule,
    TemplateModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
