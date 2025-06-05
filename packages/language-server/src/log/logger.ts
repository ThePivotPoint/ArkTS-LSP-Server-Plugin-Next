import type { ConsolaInstance } from 'consola'
import { createConsola } from 'consola'
import { version } from '../../package.json'

export class Logger {
  private logger: ConsolaInstance

  constructor() {
    this.logger = createConsola()
    this.logger.info(`ETS Support language server version: ${version}`)
  }

  getConsola(): ConsolaInstance {
    return this.logger
  }
}
