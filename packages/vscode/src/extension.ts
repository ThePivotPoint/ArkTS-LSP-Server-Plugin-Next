/* eslint-disable no-restricted-syntax */
import type { EtsServerClientOptions } from '@arkts/shared'
import type { LabsInfo } from '@volar/vscode'
import path from 'node:path'
import { defineExtension, onDeactivate, useCommand } from 'reactive-vscode'
import * as vscode from 'vscode'
import { useCompiledWebview } from './hook/compiled-webview'
import { EtsLanguageServer } from './language-server'
import { ResourceProvider } from './res/resource-provider'
import { SdkManager } from './sdk/sdk-manager'
import { Translator } from './translate'

let lsp: EtsLanguageServer | undefined

function handleLspError(e: any): void {
  lsp?.getConsola().error(e)
  vscode.window.showErrorMessage(`${e.message} [${e.code}]`)
}

export = defineExtension<Promise<LabsInfo>>(async (context) => {
  const translator = new Translator()
  SdkManager.from(translator)
  ResourceProvider.from(context, translator)
  useCompiledWebview(path.join(__dirname, '..', 'build', 'hilog.html'))

  try {
    onDeactivate(() => lsp?.stop())
    useCommand('ets.restartServer', () => lsp?.restart().catch(e => handleLspError(e)))

    lsp = new EtsLanguageServer(context, translator)

    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (!e.affectsConfiguration('ets'))
        return

      const clientOptions = await lsp?.getClientOptions() || {}
      await lsp?.getCurrentLanguageClient()?.sendNotification('workspace/didChangeConfiguration', {
        settings: clientOptions.initializationOptions as EtsServerClientOptions,
        configType: 'lspConfiguration',
      }).then(() => lsp?.getConsola().info(`ets configuration changed: ${JSON.stringify(vscode.workspace.getConfiguration().get('ets'), null, 2)}`))
    })

    // First start it will be return LabsInfo object for volar.js labs extension
    const [labsInfo] = await lsp.start()
    return labsInfo!
  }
  catch (error) {
    handleLspError(error)
    throw error
  }
})
