import type { ConsolaInstance, ConsolaOptions } from 'consola'
import { createConsola } from 'consola/basic'
import { version } from '../../../language-server/package.json'
import { LspReporter } from './lsp-reporter'

export class LanguageServerLogger {
  private logger: ConsolaInstance
  private debug: boolean = false
  private static versionIsLogged = false

  constructor(consolaOptions?: Partial<ConsolaOptions>);
  constructor(prefix: string);
  constructor(consolaOptions: Partial<ConsolaOptions> | string = {}) {
    this.logger = createConsola({
      ...(typeof consolaOptions === 'string' ? {} : consolaOptions),
      reporters: [
        new LspReporter(this.debug, typeof consolaOptions === 'string' ? consolaOptions : ''),
        ...(typeof consolaOptions === 'string' ? [] : consolaOptions.reporters || []),
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
