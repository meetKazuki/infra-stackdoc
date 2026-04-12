import { mergeDeepRight } from 'ramda'
import { type DeepPartial } from 'ts-essentials'
import defaultConfig from './default'
import devConfig from './development'
import { getEnvironmentValue } from '@/common/utils/env'
import { Environment } from '@/common/utils/enums'
import localConfig from './local'
import prodConfig from './production'

interface Config {
  environment: Environment

  server: {
    port: number
  }

  database: {
    url: string
  }
}

const environment = getEnvironmentValue('NODE_ENV', Environment.LOCAL) as Environment
const getEnvironmentConfig = (): DeepPartial<Config> => {
  switch (environment) {
    case Environment.DEVELOPMENT:
      return devConfig()
    case Environment.PRODUCTION:
      return prodConfig()
    case Environment.LOCAL:
    default:
      return localConfig()
  }
}
const config = (): Config => {
  const environmentConfig = getEnvironmentConfig()
  return mergeDeepRight(defaultConfig(), environmentConfig) as Config
}

export { config, type Config }
