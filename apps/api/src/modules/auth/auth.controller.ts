import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Post,
} from '@nestjs/common'
import { randomBytes } from 'crypto'
import type { Request, Response } from 'express'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'
import { config } from '@/common/config'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res() response: Response) {
    response.clearCookie('token')

    response.json({ message: 'Logged out' })
  }

  @Get('github')
  redirectToGitHub(@Res() response: Response) {
    const state = randomBytes(16).toString('hex')

    response.cookie('oauth_state', state, {
      httpOnly: true,
      secure: config().environment !== 'local',
      maxAge: 10 * 60 * 1000,
      sameSite: 'lax',
    })
    const url = this.authService.getGitHubAuthUrl(state)

    response.redirect(url)
  }

  @Get('github/callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const storedState = request.cookies?.oauth_state
    if (!state || state !== storedState) {
      throw new UnauthorizedException('Invalid OAuth state')
    }

    response.clearCookie('oauth_state')

    if (!code) {
      throw new UnauthorizedException('No authorization code provided')
    }

    const user = await this.authService.exchangeCodeForUser(code)
    const token = this.authService.generateToken(user)

    response.cookie('token', token, {
      httpOnly: true,
      secure: config().environment !== 'local',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    response.redirect(config().client.url)
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: Request) {
    const user = request.user
    if (!user) {
      throw new UnauthorizedException()
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    }
  }
}
