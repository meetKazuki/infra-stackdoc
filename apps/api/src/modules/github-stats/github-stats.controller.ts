import { Controller, Get } from '@nestjs/common'
import { GithubStatsService } from './github-stats.service'

@Controller('github')
class GithubStatsController {
  constructor(private readonly githubStatsService: GithubStatsService) {}

  @Get('stats')
  async getStats() {
    return this.githubStatsService.getStats()
  }
}

export { GithubStatsController }
