import type { ConsolaOptions, ConsolaReporter, LogObject } from 'consola'
import type * as vscode from 'vscode'
import kleur from 'kleur'

export class OutputChannelReporter implements ConsolaReporter {
  constructor(private outputChannel: vscode.OutputChannel) {}

  private safeStringify<T>(value: T): string {
    try {
      return JSON.stringify(value)
    }
    catch {
      return String(value)
    }
  }

  private toString(logObj: LogObject): string {
    if (logObj.message)
      return logObj.message
    if (logObj.args.length === 0)
      return this.safeStringify(logObj)
    return logObj.args.join(' ')
  }

  log(logObj: LogObject, _ctx: { options: ConsolaOptions }): void {
    switch (logObj.type) {
      case 'log':
        this.outputChannel.appendLine(kleur.gray(`[${logObj.type.toUpperCase()}] 📅:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
      case 'warn':
        this.outputChannel.appendLine(kleur.yellow(`[${logObj.type.toUpperCase()}] ⚠️:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
      case 'info':
        this.outputChannel.appendLine(kleur.blue(`[${logObj.type.toUpperCase()}] 🔥:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
      case 'success':
      case 'ready':
      case 'start':
        this.outputChannel.appendLine(kleur.green(`[${logObj.type.toUpperCase()}] ✅:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
      case 'fail':
      case 'fatal':
      case 'error':
        this.outputChannel.appendLine(kleur.red(`[${logObj.type.toUpperCase()}] ❌:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
      case 'debug':
      case 'verbose':
      case 'trace':
        this.outputChannel.appendLine(kleur.gray(`[${logObj.type.toUpperCase()}] 🐛:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
      case 'box':
        this.outputChannel.appendLine(kleur.gray(`[${logObj.type.toUpperCase()}] 📦:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
    }
  }
}
