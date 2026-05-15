import 'express'

declare module 'express' {
  export interface Request {
    user?: {
      id: string
      username: string
      displayName?: string | null
      avatarUrl?: string | null
    } | null
  }
}
