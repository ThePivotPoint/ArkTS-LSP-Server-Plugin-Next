import type { ConsolaInstance, ConsolaOptions } from 'consola'
import { createConsola } from 'consola'
import { version } from '../../package.json'

export class LanguageServerLogger {
  private logger: ConsolaInstance

  constructor(consolaOptions: Partial<ConsolaOptions> = {}) {
    this.logger = createConsola(consolaOptions)
    this.logger.info(`ETS Support language server version: ${version}`)
  }

  getConsola(): ConsolaInstance {
    return this.logger
  }
}
