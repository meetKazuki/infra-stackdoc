import { DataSource, DataSourceOptions } from 'typeorm'
import { config } from '@/common/config'

const dbOptions: DataSourceOptions = {
  type: 'postgres',
  url: config().database.url,
  synchronize: !['staging', 'production'].includes(config().environment),
  logging: ['staging', 'production'].includes(config().environment) ? ['error'] : true,
  dropSchema: ['test'].includes(config().environment),
}
const dataSource = new DataSource(dbOptions)

export { dbOptions, dataSource as default }
