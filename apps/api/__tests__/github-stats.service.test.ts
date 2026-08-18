import { describe, expect, it, vi } from 'vitest'
import {
  GithubStatsService,
  RETRY_BACKOFF_MS,
  TTL_MS,
} from '@/modules/github-stats/github-stats.service'

function okResponse(stars: number, forks: number) {
  return {
    ok: true,
    json: async () => ({ stargazers_count: stars, forks_count: forks }),
  } as Response
}

function failResponse(status: number) {
  return { ok: false, status } as Response
}

function withFetcher(fetcher: ReturnType<typeof vi.fn>) {
  const service = new GithubStatsService()
  // Private field, no constructor injection — see comment in github-stats.service.ts.
  ;(service as unknown as { fetcher: typeof fetcher }).fetcher = fetcher
  return service
}

describe('GithubStatsService', () => {
  it('fetches on a cold cache and returns the parsed stats', async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse(10, 2))
    const service = withFetcher(fetcher)

    const stats = await service.getStats(0)

    expect(stats).toEqual({ stars: 10, forks: 2 })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('serves the cache without refetching while within TTL', async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse(10, 2))
    const service = withFetcher(fetcher)

    await service.getStats(0)
    const stats = await service.getStats(TTL_MS - 1)

    expect(stats).toEqual({ stars: 10, forks: 2 })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('refetches once the TTL has expired', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(okResponse(10, 2))
      .mockResolvedValueOnce(okResponse(15, 3))
    const service = withFetcher(fetcher)

    await service.getStats(0)
    const stats = await service.getStats(TTL_MS + 1)

    expect(stats).toEqual({ stars: 15, forks: 3 })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('falls back to null stats when GitHub fails and there is no prior cache', async () => {
    const fetcher = vi.fn().mockResolvedValue(failResponse(500))
    const service = withFetcher(fetcher)

    const stats = await service.getStats(0)

    expect(stats).toEqual({ stars: null, forks: null })
  })

  it('serves last-known-good when GitHub fails after a prior success', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(okResponse(10, 2))
      .mockResolvedValueOnce(failResponse(503))
    const service = withFetcher(fetcher)

    await service.getStats(0)
    const stats = await service.getStats(TTL_MS + 1)

    expect(stats).toEqual({ stars: 10, forks: 2 })
  })

  it('never throws when the fetcher itself rejects (host unreachable)', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('ENOTFOUND'))
    const service = withFetcher(fetcher)

    await expect(service.getStats(0)).resolves.toEqual({ stars: null, forks: null })
  })

  it('does not hammer GitHub during an outage — backs off between failed attempts', async () => {
    const fetcher = vi.fn().mockResolvedValue(failResponse(500))
    const service = withFetcher(fetcher)

    await service.getStats(0)
    await service.getStats(1)
    await service.getStats(RETRY_BACKOFF_MS - 1)

    expect(fetcher).toHaveBeenCalledTimes(1)

    await service.getStats(RETRY_BACKOFF_MS + 1)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
