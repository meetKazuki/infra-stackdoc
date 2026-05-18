import * as fs from 'node:fs'
import * as path from 'node:path'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Config } from '@/modules/configs/configs.entity'
import { ConfigTag } from '@/modules/configs/config-tag.entity'
import { TemplateCategory } from '@/common/utils/enums'

/**
 * Sidecar JSON shape for a seeded template. The `description` field is kept
 * in the source JSON for documentation and future-proofing, but is NOT
 * persisted — the `Config` entity has no description column. Templates UI
 * currently uses `title` only.
 */
interface TemplateMeta {
  slug: string
  title: string
  description: string
  category: TemplateCategory
  tags: string[]
}

@Injectable()
export class TemplatesSeederService implements OnModuleInit {
  private readonly logger = new Logger(TemplatesSeederService.name)

  constructor(
    @InjectRepository(Config) private readonly configRepo: Repository<Config>,
    @InjectRepository(ConfigTag) private readonly tagRepo: Repository<ConfigTag>,
  ) {}

  async onModuleInit(): Promise<void> {
    const force = process.env.FORCE_TEMPLATE_RESEED === 'true'
    let seedersDir = path.join(__dirname, 'templates')

    if (!fs.existsSync(seedersDir)) {
      const srcDir = path.join(__dirname, '../../../src/database/seeders/templates')
      if (fs.existsSync(srcDir)) {
        seedersDir = srcDir
        this.logger.log(
          'Templates seeder: Development mode detected, reading templates directly from src.',
        )
      } else {
        this.logger.warn(
          `Templates seeder: directory not found at ${seedersDir} or ${srcDir}; skipping.`,
        )
        return
      }
    }

    const entries = fs.readdirSync(seedersDir)
    const jsonFiles = entries.filter((f) => f.endsWith('.json')).sort()

    let created = 0
    let updated = 0
    let skipped = 0
    let failed = 0

    for (const jsonFile of jsonFiles) {
      try {
        const result = await this.seedOne(seedersDir, jsonFile, force)
        if (result === 'created') created++
        else if (result === 'updated') updated++
        else if (result === 'skipped') skipped++
      } catch (err) {
        failed++
        this.logger.error(
          `Templates seeder: failed to process ${jsonFile}: ${(err as Error).message}`,
        )
      }
    }

    this.logger.log(
      `Templates seeder: created=${created}, updated=${updated}, skipped=${skipped}, failed=${failed} (force=${force})`,
    )
  }

  private async seedOne(
    seedersDir: string,
    jsonFile: string,
    force: boolean,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const basename = jsonFile.replace(/\.json$/, '')
    const yamlPath = path.join(seedersDir, `${basename}.yaml`)

    if (!fs.existsSync(yamlPath)) {
      this.logger.warn(`Template metadata ${jsonFile} has no matching YAML; skipping.`)
      return 'skipped'
    }

    const meta: TemplateMeta = JSON.parse(fs.readFileSync(path.join(seedersDir, jsonFile), 'utf8'))
    const yaml = fs.readFileSync(yamlPath, 'utf8')

    const existing = await this.configRepo.findOne({
      where: { slug: meta.slug },
      relations: ['tags'],
    })

    if (existing) {
      if (!force) return 'skipped'

      existing.title = meta.title
      existing.yaml = yaml
      existing.templateCategory = meta.category
      existing.isTemplate = true
      await this.configRepo.save(existing)

      await this.tagRepo.delete({ configId: existing.id })
      if (meta.tags.length > 0) {
        const tagEntities = meta.tags.map((tag) =>
          this.tagRepo.create({ configId: existing.id, tag }),
        )
        await this.tagRepo.save(tagEntities)
      }

      return 'updated'
    }

    const fresh = this.configRepo.create({
      slug: meta.slug,
      title: meta.title,
      yaml,
      isTemplate: true,
      templateCategory: meta.category,
      userId: null,
    })
    const saved = await this.configRepo.save(fresh)

    if (meta.tags.length > 0) {
      const tagEntities = meta.tags.map((tag) => this.tagRepo.create({ configId: saved.id, tag }))
      await this.tagRepo.save(tagEntities)
    }

    return 'created'
  }
}
