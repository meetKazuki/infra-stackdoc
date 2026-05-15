interface GitHubTokenResponse {
  access_token: string
  token_type: string
  scope: string
}

interface GitHubUserResponse {
  id: number
  login: string
  name: string | null
  avatar_url: string
}

interface JwtPayload {
  sub: string
  username: string
}

export type { GitHubTokenResponse, GitHubUserResponse, JwtPayload }
