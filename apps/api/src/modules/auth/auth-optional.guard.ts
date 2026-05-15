import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import type { JwtPayload } from './auth.types'
import { config } from '@/common/config'
import { UsersService } from '@/modules/users/user.service'

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)

    if (!token) {
      request.user = null
      return true
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: config().auth.jwt.secret,
      })
      const user = await this.usersService.findById(payload.sub)
      request.user = user || null
    } catch {
      request.user = null
    }

    return true
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
