import * as vscode from 'vscode'
import { version } from '../../../vscode/package.json'
import { LanguageServerLogger } from './lsp-logger'
import { OutputChannelReporter } from './reporter'

export abstract class ExtensionLogger extends LanguageServerLogger {
  private static outputChannel: vscode.OutputChannel

  constructor() {
    const outputChannel = ExtensionLogger.outputChannel
      ? ExtensionLogger.outputChannel
      : vscode.window.createOutputChannel(`ETS Support Powered by Naily`)
    super({
      reporters: [
        new OutputChannelReporter(outputChannel),
      ],
    })
    ExtensionLogger.outputChannel = outputChannel
    this.getConsola().info(`ETS Support Plugin version: ${version}`)
  }

  getOutputChannel(): vscode.OutputChannel {
    return ExtensionLogger.outputChannel
  }
}
