import type { ConsolaInstance, ConsolaOptions } from 'consola'
import { createConsola } from 'consola/basic'
import { version } from '../../../language-server/package.json'
import { LspReporter } from './lsp-reporter'

export class LanguageServerLogger {
  private logger: ConsolaInstance
  private debug: boolean = false
  private static versionIsLogged = false

  constructor(consolaOptions: Partial<ConsolaOptions> = {}) {
    this.logger = createConsola({
      ...consolaOptions,
      reporters: [
        new LspReporter(this.debug),
        ...(consolaOptions.reporters || []),
      ],
    })
    if (!LanguageServerLogger.versionIsLogged) {
      this.logger.info(`ETS Support language server version: ${version}`)
      LanguageServerLogger.versionIsLogged = true
    }
  }

  getConsola(): ConsolaInstance {
    return this.logger
  }

  setDebug(debug: boolean): this {
    this.debug = debug
    return this
  }

  getDebug(): boolean {
    return this.debug
  }
}
