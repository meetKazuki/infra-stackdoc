import { Injectable, Logger } from '@nestjs/common'
import { type GithubStats } from './github-stats.types'
import { config } from '@/common/config'

const REPO = 'thatkazuk1/infra-stackdoc'
const TTL_MS = 30 * 60 * 1000
// Floor between fetch attempts while GitHub is unreachable/rate-limited, so an outage doesn't
// turn every incoming request into an outbound GitHub call.
const RETRY_BACKOFF_MS = 60 * 1000

type Fetcher = (url: string, init: RequestInit) => Promise<Response>

@Injectable()
class GithubStatsService {
  private readonly logger = new Logger(GithubStatsService.name)
  private cachedStats: GithubStats | null = null
  private cachedAt: number | null = null
  private lastAttemptAt: number | null = null

  // Plain property, not constructor-injected: a function-typed constructor param has no
  // resolvable Nest DI token. Tests override it directly on the instance instead.
  private fetcher: Fetcher = fetch

  async getStats(now = Date.now()): Promise<GithubStats> {
    if (this.cachedAt !== null && now - this.cachedAt < TTL_MS) {
      return this.cachedStats as GithubStats
    }

    if (this.lastAttemptAt !== null && now - this.lastAttemptAt < RETRY_BACKOFF_MS) {
      return this.cachedStats ?? { stars: null, forks: null }
    }

    this.lastAttemptAt = now

    try {
      const stats = await this.fetchFromGithub()
      this.cachedStats = stats
      this.cachedAt = now
      return stats
    } catch (err) {
      this.logger.warn(`Failed to refresh GitHub stats, serving last-known-good: ${err}`)
      return this.cachedStats ?? { stars: null, forks: null }
    }
  }

  private async fetchFromGithub(): Promise<GithubStats> {
    const token = config().githubStats.token

    if (!token) {
      this.logger.warn('GITHUB_STATS_TOKEN not set — calling GitHub unauthenticated (60/hr limit)')
    }

    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await this.fetcher(`https://api.github.com/repos/${REPO}`, { headers })

    if (!response.ok) {
      throw new Error(`GitHub API responded ${response.status}`)
    }

    const body = await response.json()
    return { stars: body.stargazers_count, forks: body.forks_count }
  }
}

export { GithubStatsService, TTL_MS, RETRY_BACKOFF_MS }
