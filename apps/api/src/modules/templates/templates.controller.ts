import { Controller, Get, Post, Param, Query, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { ListTemplateQueryDto } from './templates.dto'
import { TemplateService } from './templates.service'
import { OptionalAuthGuard } from '@/modules/auth/auth-optional.guard'

@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post(':slug/use')
  @UseGuards(OptionalAuthGuard)
  async use(@Param('slug') slug: string, @Req() request: Request) {
    const user = request.user
    const config = await this.templateService.use(slug, user?.id)
    return {
      slug: config.slug,
      title: config.title,
      url: `/s/${config.slug}`,
    }
  }

  @Get()
  async findAll(@Query() query: ListTemplateQueryDto) {
    const p = Math.max(1, parseInt(query.page || '1', 10))
    const l = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)))
    const { data, total } = await this.templateService.findAll(p, l, query.category)

    return {
      data: data.map((config) => ({
        slug: config.slug,
        title: config.title,
        category: config.templateCategory,
        viewCount: config.viewCount,
        tags: config.tags.map((t) => t.tag),
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      })),
      total,
    }
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const config = await this.templateService.findBySlug(slug)
    return {
      slug: config.slug,
      title: config.title,
      yaml: config.yaml,
      category: config.templateCategory,
      viewCount: config.viewCount,
      tags: config.tags.map((t) => t.tag),
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  }
}
