import { ConsolaOptions, ConsolaReporter, LogObject } from "consola";
import kleur from 'kleur'

export class LspReporter implements ConsolaReporter {
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
        console.log(kleur.gray(`[${logObj.type.toUpperCase()}] 📅:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
      case 'warn':
        console.warn(kleur.yellow(`[${logObj.type.toUpperCase()}] ⚠️:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
      case 'info':
        console.info(kleur.blue(`[${logObj.type.toUpperCase()}] 🔥:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
      case 'success':
      case 'ready':
      case 'start':
        console.log(kleur.green(`[${logObj.type.toUpperCase()}] ✅:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
      case 'fail':
      case 'fatal':
      case 'error':
        console.error(kleur.red(`[${logObj.type.toUpperCase()}] ❌:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
      case 'debug':
      case 'verbose':
      case 'trace':
        console.log(kleur.gray(`[${logObj.type.toUpperCase()}] 🐛:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
      case 'box':
        console.log(kleur.gray(`[${logObj.type.toUpperCase()}] 📦:${logObj.tag} ${kleur.dim(logObj.date.toLocaleString())} ${this.toString(logObj)}`))
        break
    }
  }
}