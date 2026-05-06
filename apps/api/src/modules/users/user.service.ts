import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.entity'
import type { GitHubProfile } from './user.types'
import { AuthProvider } from '@/common/utils/enums'

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly userRepository: Repository<User>) {}

  async findOrCreateFromGitHub(profile: GitHubProfile): Promise<User> {
    const githubId = String(profile.id)

    let user = await this.userRepository.findOne({ where: { githubId } })

    if (user) {
      // Update profile data on each login
      user.username = profile.login
      user.displayName = profile.name
      user.avatarUrl = profile.avatar_url
      return this.userRepository.save(user)
    }

    user = this.userRepository.create({
      githubId,
      username: profile.login,
      displayName: profile.name,
      avatarUrl: profile.avatar_url,
      provider: AuthProvider.GITHUB,
    })

    return this.userRepository.save(user)
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } })
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } })
  }
}
