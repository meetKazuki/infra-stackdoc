import { Module } from '@nestjs/common'
import { GithubStatsController } from './github-stats.controller'
import { GithubStatsService } from './github-stats.service'

@Module({
  controllers: [GithubStatsController],
  providers: [GithubStatsService],
})
class GithubStatsModule {}

export { GithubStatsModule }
