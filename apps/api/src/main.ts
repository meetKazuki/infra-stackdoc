import cookieParser from 'cookie-parser'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { config } from '@/common/config'

const logger = new Logger('Server')

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api')
  app.enableCors({
    origin: config().client.url,
    credentials: true,
  })

  app.use(cookieParser())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  logger.log(`Server running on http://localhost:${config().server.port}`)

  await app.listen(config().server.port)
}
bootstrap().catch(console.error)
