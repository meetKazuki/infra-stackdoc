import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { GitHubTokenResponse, GitHubUserResponse, JwtPayload } from './auth.types'
import { config } from '@/common/config'
import { UsersService } from '@/modules/users/user.service'
import type { User } from '@/modules/users/user.entity'

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  getGitHubAuthUrl(state: string): string {
    const { clientId, callbackUrl } = config().auth.github
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'read:user',
      state,
    })

    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  async exchangeCodeForUser(code: string): Promise<User> {
    const { clientId, clientSecret } = config().auth.github

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new UnauthorizedException('Failed to exchange code for token')
    }

    const tokenData = (await tokenResponse.json()) as GitHubTokenResponse

    if (!tokenData.access_token) {
      throw new UnauthorizedException('No access token received from GitHub')
    }

    // Fetch user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    })

    if (!userRes.ok) {
      throw new UnauthorizedException('Failed to fetch GitHub user profile')
    }

    const profile = (await userRes.json()) as GitHubUserResponse

    // Find or create user in our database
    return this.usersService.findOrCreateFromGitHub(profile)
  }

  generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
    }
    return this.jwtService.sign(payload)
  }

  async validateToken(payload: JwtPayload): Promise<User | null> {
    return this.usersService.findById(payload.sub)
  }
}
