import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { config } from '@/common/config'

const logger = new Logger('Server')

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  logger.log(`Server running on http://localhost:${config().server.port}`)

  await app.listen(config().server.port)
}
bootstrap()
