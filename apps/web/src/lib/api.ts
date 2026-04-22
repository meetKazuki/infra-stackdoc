interface SharedConfig {
  slug: string
  title: string
  yaml: string
  visibility: string
  viewCount: number
  forkOf: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface CreateConfigResponse {
  slug: string
  title: string
  url: string
}

const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function createConfig(
  yaml: string,
  visibility: 'public' | 'unlisted' = 'unlisted',
): Promise<CreateConfigResponse> {
  const response = await fetch(`${API_BASE}/configs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yaml, visibility }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Failed to create config (${response.status})`)
  }

  return response.json()
}

async function forkConfig(slug: string): Promise<CreateConfigResponse> {
  const response = await fetch(`${API_BASE}/configs/${slug}/fork`, { method: 'POST' })

  if (!response.ok) {
    throw new Error(`Failed to fork config (${response.status})`)
  }

  return response.json()
}

async function fetchConfig(slug: string): Promise<SharedConfig> {
  const response = await fetch(`${API_BASE}/configs/${slug}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Config not found')
    }
    throw new Error(`Failed to fetch config (${response.status})`)
  }

  return response.json()
}

export { createConfig, forkConfig, fetchConfig, CreateConfigResponse, SharedConfig }
