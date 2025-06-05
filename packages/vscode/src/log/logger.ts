import type { ConsolaInstance } from 'consola'
import { createConsola } from 'consola'
import * as vscode from 'vscode'
import { version } from '../../package.json'
import { OutputChannelReporter } from './reporter'

export abstract class Logger {
  private outputChannel: vscode.OutputChannel
  private logger: ConsolaInstance

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel(`ETS Support Powered by Naily`)
    this.logger = createConsola({
      reporters: [new OutputChannelReporter(this.outputChannel)],
    })
    this.logger.info(`ETS Support Plugin version: ${version}`)
  }

  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel
  }

  getConsola(): ConsolaInstance {
    return this.logger
  }
}
