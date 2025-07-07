import * as l10n from '@vscode/l10n'
import { Service } from 'unioc'
import { IOnActivate } from 'unioc/vscode'
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
export class Translator implements IOnActivate {
  async onActivate(context: vscode.ExtensionContext): Promise<void> {
    await l10n.config({
      uri: vscode.env.language.includes('en')
        ? vscode.Uri.joinPath(context.extensionUri, 'package.nls.json').toString()
        : vscode.Uri.joinPath(context.extensionUri, `package.nls.${vscode.env.language}.json`).toString(),
    })
  }

  public t<TKey extends string>(key: TKey, options: TOptions = {}): string {
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error
    return l10n.t(key, (options.args ?? []) as Array<l10n.L10nReplacement>)
  }
}
