import { type Config } from '.'
import { Environment } from '@/common/utils/enums'
import { getEnvironmentValue } from '@/common/utils/env'

const config = (): Config => ({
  environment: getEnvironmentValue('NODE_ENV', Environment.LOCAL) as Environment,

  server: {
    port: Number(getEnvironmentValue('PORT', '8085')),
  },

  database: {
    url: getEnvironmentValue(
      'DATABASE_URL',
      'postgresql://postgres:postgres@localhost:5432/stackdoc-db',
    ),
  },
})

export default config
