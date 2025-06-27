/* eslint-disable perfectionist/sort-imports */
import 'reflect-metadata'
import type { LabsInfo } from '@volar/vscode'
import type { ExtensionContext } from 'vscode'
import path from 'node:path'
import { extensionContext } from 'reactive-vscode'
import { CommandPlugin, DisposablePlugin, LanguageProviderPlugin, VSCodeBootstrap } from 'unioc/vscode'
import { useCompiledWebview } from './hook/compiled-webview'
import { EtsLanguageServer } from './language-server'
import './res/resource-provider'
import './sdk/sdk-guesser'

class ArkTSExtension extends VSCodeBootstrap<Promise<LabsInfo | undefined>> {
  beforeInitialize(context: ExtensionContext): Promise<void> | void {
    this.use(CommandPlugin)
    this.use(LanguageProviderPlugin)
    this.use(DisposablePlugin)
    extensionContext.value = context
  }

  async onActivate(context: ExtensionContext): Promise<LabsInfo | undefined> {
    useCompiledWebview(path.resolve(context.extensionPath, 'build', 'hilog.html'))
    return (await this.getGlobalContainer().findOne<EtsLanguageServer>(EtsLanguageServer)?.resolve())?.run()
  }
}

// eslint-disable-next-line no-restricted-syntax
export = new ArkTSExtension().run()
