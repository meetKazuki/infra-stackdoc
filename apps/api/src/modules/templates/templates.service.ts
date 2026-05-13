import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Config } from '@/modules/configs/configs.entity'
import { ConfigsService } from '@/modules/configs/configs.service'
import { TemplateCategory } from '@/common/utils/enums'

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(Config) private readonly configRepo: Repository<Config>,
    private readonly configsService: ConfigsService,
  ) {}

  async use(slug: string, userId?: string | null): Promise<Config> {
    const source = await this.findBySlug(slug)

    const forked = await this.configsService.fork(slug, userId)
    if (forked.title === `${source.title} (fork)`) {
      forked.title = source.title
      await this.configRepo.save(forked)
    }

    return forked
  }

  async findAll(
    page = 1,
    limit = 20,
    category?: TemplateCategory,
  ): Promise<{ data: Config[]; total: number }> {
    const [data, total] = await this.configRepo.findAndCount({
      where: { isTemplate: true, ...(category ? { templateCategory: category } : {}) },
      relations: ['tags', 'user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return { data, total }
  }

  async findBySlug(slug: string): Promise<Config> {
    const config = await this.configRepo.findOne({
      where: { slug, isTemplate: true },
      relations: ['tags', 'user'],
    })

    if (!config) {
      throw new NotFoundException(`Template with slug '${slug}' not found`)
    }

    this.configRepo.increment({ id: config.id }, 'viewCount', 1).catch(() => {})

    return config
  }
}
