import type { ConsolaInstance, ConsolaOptions } from 'consola'
import { createConsola } from 'consola/basic'
import { version } from '../../package.json'
import { LspReporter } from './lsp-reporter'

export class LanguageServerLogger {
  private logger: ConsolaInstance

  constructor(consolaOptions: Partial<ConsolaOptions> = {}) {
    this.logger = createConsola({
      ...consolaOptions,
      reporters: [
        new LspReporter(),
        ...(consolaOptions.reporters || []),
      ]
    })
    this.logger.info(`ETS Support language server version: ${version}`)
  }

  getConsola(): ConsolaInstance {
    return this.logger
  }
}
