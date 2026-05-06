interface Author {
  username: string
  avatarUrl: string | null
}

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
  author: Author | null
}

interface CreateConfigResponse {
  slug: string
  title: string
  url: string
}

interface User {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

interface MyConfig {
  id: string
  slug: string
  title: string
  yaml: string
  visibility: string
  viewCount: number
  forkOf: string | null
  tags: { tag: string }[]
  createdAt: string
  updatedAt: string
}

export { SharedConfig, CreateConfigResponse, User, MyConfig }
