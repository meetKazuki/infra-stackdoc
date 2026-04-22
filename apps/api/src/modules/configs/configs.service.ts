import { createHash } from 'crypto'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { HomelabDocument } from '@homelab-stackdoc/core'
import { Config } from './configs.entity'
import { ConfigTag } from './config-tag.entity'
import { CreateConfigDto } from './configs.dto'
import { Visibility } from '@/common/utils/enums'

@Injectable()
export class ConfigsService {
  constructor(
    @InjectRepository(Config) private readonly configRepo: Repository<Config>,
    @InjectRepository(ConfigTag) private readonly tagRepo: Repository<ConfigTag>,
  ) {}

  private async generateSlug(): Promise<string> {
    const { nanoid } = await import('nanoid')
    return nanoid(8)
  }

  private hashContent(yaml: string): string {
    return createHash('sha256').update(yaml.trim()).digest('hex')
  }

  async create(dto: CreateConfigDto & { _parsed?: HomelabDocument }): Promise<Config> {
    const contentHash = this.hashContent(dto.yaml)

    const existingHash = await this.configRepo.findOne({
      where: { contentHash },
      relations: ['tags'],
    })
    if (existingHash) {
      return existingHash
    }

    const slug = await this.generateSlug()
    const parsed = dto._parsed
    const title = parsed?.meta?.title || 'Untitled'
    const metaTags = parsed?.meta?.tags || []

    const config = this.configRepo.create({
      slug,
      title,
      yaml: dto.yaml,
      visibility: dto.visibility || Visibility.UNLISTED,
      contentHash,
    })

    const saved = await this.configRepo.save(config)

    if (metaTags.length > 0) {
      const tagEntities = metaTags.map((tag) => this.tagRepo.create({ configId: saved.id, tag }))
      await this.tagRepo.save(tagEntities)
    }

    return this.configRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['tags'],
    })
  }

  async fork(slug: string): Promise<Config> {
    const original = await this.findBySlug(slug)

    const newSlug = await this.generateSlug()
    const forked = this.configRepo.create({
      slug: newSlug,
      title: `${original.title} (fork)`,
      yaml: original.yaml,
      visibility: Visibility.UNLISTED,
      forkOf: original.slug,
      contentHash: null,
    })

    const saved = await this.configRepo.save(forked)

    if (original.tags?.length > 0) {
      const tagEntities = original.tags.map((t) =>
        this.tagRepo.create({ configId: saved.id, tag: t.tag }),
      )
      await this.tagRepo.save(tagEntities)
    }

    return this.configRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['tags'],
    })
  }

  async findBySlug(slug: string): Promise<Config> {
    const config = await this.configRepo.findOne({
      where: { slug },
      relations: ['tags'],
    })

    if (!config) {
      throw new NotFoundException(`Config with slug '${slug}' not found`)
    }

    this.configRepo.increment({ id: config.id }, 'viewCount', 1).catch(() => {})

    return config
  }

  async findPublic(page = 1, limit = 20): Promise<{ data: Config[]; total: number }> {
    const [data, total] = await this.configRepo.findAndCount({
      where: { visibility: Visibility.PUBLIC },
      relations: ['tags'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return { data, total }
  }

  async remove(slug: string): Promise<void> {
    const config = await this.findBySlug(slug)
    await this.configRepo.remove(config)
  }
}
