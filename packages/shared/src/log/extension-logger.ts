import * as vscode from 'vscode'
import { version } from '../../../vscode/package.json'
import { LanguageServerLogger } from './lsp-logger'
import { OutputChannelReporter } from './reporter'

export abstract class ExtensionLogger extends LanguageServerLogger {
  private outputChannel: vscode.OutputChannel

  constructor() {
    const outputChannel = vscode.window.createOutputChannel(`ETS Support Powered by Naily`)
    super({
      reporters: [new OutputChannelReporter(outputChannel)],
    })
    this.outputChannel = outputChannel
    this.getConsola().info(`ETS Support Plugin version: ${version}`)
  }

  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel
  }
}
