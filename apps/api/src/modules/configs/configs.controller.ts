import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ConfigsService } from './configs.service'
import { CreateConfigDto } from './configs.dto'
import { YamlValidationPipe } from '@/common/pipes/yaml-validation.pipe'

@Controller('configs')
export class ConfigsController {
  constructor(private readonly configsService: ConfigsService) {}

  @Post()
  @UsePipes(YamlValidationPipe)
  async create(@Body() dto: CreateConfigDto) {
    const config = await this.configsService.create(dto)
    return {
      slug: config.slug,
      title: config.title,
      url: `/s/${config.slug}`,
    }
  }

  @Post(':slug/fork')
  async fork(@Param('slug') slug: string) {
    const config = await this.configsService.fork(slug)
    return {
      slug: config.slug,
      title: config.title,
      url: `/s/${config.slug}`,
    }
  }

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const p = Math.max(1, parseInt(page || '1', 10))
    const l = Math.min(50, Math.max(1, parseInt(limit || '20', 10)))
    return this.configsService.findPublic(p, l)
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const config = await this.configsService.findBySlug(slug)
    return {
      slug: config.slug,
      title: config.title,
      yaml: config.yaml,
      visibility: config.visibility,
      viewCount: config.viewCount,
      forkOf: config.forkOf,
      tags: config.tags.map((t) => t.tag),
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('slug') slug: string) {
    await this.configsService.remove(slug)
  }
}
