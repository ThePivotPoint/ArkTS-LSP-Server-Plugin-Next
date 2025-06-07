import get from 'lodash/get'
import path from 'node:path'
import * as vscode from 'vscode'
import fs from 'node:fs'

export interface LocaleFile {
  locale: string
  content: Record<string, string>
}

export interface TOptions {
  args?: unknown[]
}

export type TFn = (key: string, options: TOptions) => string

export class Translator {
  private localeFolder = path.join(__dirname, '..')
  private localeFiles: LocaleFile[] = []

  constructor() {
    this.load()
  }

  public load() {
    this.localeFiles = fs.readdirSync(this.localeFolder)
      .filter(file => file.endsWith('.json') && file.startsWith('package.nls'))
      .map(fileName => {
        const fileLocale = fileName.replace('package.nls.', '').replace('.json', '')
        const fileContent = JSON.parse(fs.readFileSync(path.join(this.localeFolder, fileName), 'utf-8'))

        return {
          locale: fileLocale,
          content: fileContent,
        }
      })
  }

  public t(key: string, options: TOptions = {}): string {
    const locale = vscode.env.language
    const localeFile = this.localeFiles.find(file => file.locale === locale)
    if (!localeFile)
      return key
    const value = get(localeFile.content, key)
    if (!value)
      return key
    return value.replace(/{(\d+)}/g, (match, p1) => {
      const arg = options.args?.[p1]
      if (typeof arg === 'string')
        return arg
      return match
    })
  }
}