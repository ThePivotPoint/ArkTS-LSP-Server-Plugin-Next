/* eslint-disable no-restricted-syntax */
import type { LabsInfo } from '@volar/vscode'
import path from 'node:path'
import { defineExtension } from 'reactive-vscode'
import { useCompiledWebview } from './hook/compiled-webview'
import { EtsLanguageServer } from './language-server'
import { ResourceProvider } from './res/resource-provider'
import { SdkManager } from './sdk/sdk-manager'
import { Translator } from './translate'

export = defineExtension<Promise<LabsInfo>>(async (context) => {
  const translator = new Translator()
  const sdkManager = SdkManager.from(translator)
  ResourceProvider.from(context, translator)
  useCompiledWebview(path.resolve(context.extensionPath, 'build', 'hilog.html'))
  return await EtsLanguageServer.from(context, translator, sdkManager)
})
