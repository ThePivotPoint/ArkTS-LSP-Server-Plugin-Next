/* eslint-disable perfectionist/sort-imports */
import 'reflect-metadata'
import type { LabsInfo } from '@volar/vscode'
import type { ExtensionContext } from 'vscode'
import path from 'node:path'
import { extensionContext } from 'reactive-vscode'
import { CommandPlugin, DisposablePlugin, LanguageProviderPlugin, VSCodeBootstrap } from 'unioc/vscode'
import { useCompiledWebview } from './hook/compiled-webview'
import { EtsLanguageServer } from './language-server'
import { SdkManager } from './sdk/sdk-manager'
import { Translator } from './translate'
import './res/resource-provider'

class ArkTSExtension extends VSCodeBootstrap<Promise<LabsInfo>> {
  beforeInitialize(context: ExtensionContext): Promise<void> | void {
    this.use(CommandPlugin)
    this.use(LanguageProviderPlugin)
    this.use(DisposablePlugin)
    extensionContext.value = context
  }

  async onActivate(context: ExtensionContext): Promise<LabsInfo> {
    const translator = await this.getGlobalContainer().findOne<Translator>(Translator)?.resolve()
    const sdkManager = await this.getGlobalContainer().findOne<SdkManager>(SdkManager)?.resolve()
    const languageServer = await this.getGlobalContainer().findOne<EtsLanguageServer>(EtsLanguageServer)?.resolve()
    useCompiledWebview(path.resolve(context.extensionPath, 'build', 'hilog.html'))
    return EtsLanguageServer.from(translator!, sdkManager!, languageServer!)
  }
}

// eslint-disable-next-line no-restricted-syntax
export = new ArkTSExtension().run()
