import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import type { JwtPayload } from './auth.types'
import { config } from '@/common/config'
import { UsersService } from '@/modules/users/user.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)

    if (!token) {
      throw new UnauthorizedException()
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: config().auth.jwt.secret,
      })

      const user = await this.usersService.findById(payload.sub)
      if (!user) {
        throw new UnauthorizedException()
      }

      request.user = user
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }

  private extractToken(request: Request): string | null {
    if (request.cookies?.token) {
      return request.cookies.token
    }

    const authHeader = request.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7)
    }

    return null
  }
}
