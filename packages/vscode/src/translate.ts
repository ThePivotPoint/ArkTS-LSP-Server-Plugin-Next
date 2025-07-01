import fs from 'node:fs'
import path from 'node:path'
import get from 'lodash/get'
import { Service } from 'unioc'
import * as vscode from 'vscode'

export interface LocaleFile {
  locale: string
  content: Record<string, string>
}

export interface TOptions {
  args?: unknown[]
}

export type TFn = (key: string, options: TOptions) => string

@Service
export class Translator {
  private localeFolder = path.join(__dirname, '..')
  private localeFiles: LocaleFile[] = []

  constructor() {
    this.load()
  }

  public load(): void {
    this.localeFiles = fs.readdirSync(this.localeFolder)
      .filter(file => file.endsWith('.json') && file.startsWith('package.nls'))
      .map((fileName) => {
        const match = fileName.match(/^package\.nls(?:\.([^.]+))?\.json$/)
        const fileLocale = (match?.[1] || 'en').toLowerCase()
        const fileContent = JSON.parse(fs.readFileSync(path.join(this.localeFolder, fileName), 'utf-8'))

        return {
          locale: fileLocale,
          content: fileContent,
        }
      })
  }

  public t<TKey extends string>(key: TKey, options: TOptions = {}): string {
    const locale = vscode.env.language.toLowerCase()
    // Try to match the current locale; if not found, fall back to default English locale
    const localeFile = this.localeFiles.find(file => file.locale === locale) ?? this.localeFiles.find(file => file.locale === 'en')
    if (!localeFile)
      return key
    const value = get(localeFile.content, key)
    if (!value)
      return key
    return value.replace(/\{(\d+)\}/g, (match, p1) => {
      const arg = options.args?.[p1]
      if (typeof arg === 'string')
        return arg
      return match
    })
  }
}
