import type { LabsInfo } from '@volar/vscode'
import { useCommand } from 'reactive-vscode'
import * as vscode from 'vscode'
import { EtsLanguageServer } from './language-server'
import { SdkManager } from './sdk/sdk-manager'
import { Translator } from './translate'
import type { EtsServerClientOptions } from '@arkts/shared'

let lsp: EtsLanguageServer | undefined

function handleLspError(e: any): void {
  lsp?.getConsola().error(e)
  vscode.window.showErrorMessage(`Failed to restart ETS Language Server: ${e.code} ${e.message}`)
}

export async function activate(context: vscode.ExtensionContext): Promise<LabsInfo> {
  const translator = new Translator()
  SdkManager.from(translator)

  try {
    lsp = new EtsLanguageServer(context, translator)

    useCommand('ets.restartServer', () => {
      lsp?.restart().catch(e => handleLspError(e))
    })

    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (!e.affectsConfiguration('ets'))
        return

      const clientOptions = await lsp?.getClientOptions() || {}
      await lsp?.getCurrentLanguageClient()?.sendNotification('workspace/didChangeConfiguration', {
        settings: clientOptions.initializationOptions as EtsServerClientOptions,
        configType: 'lspConfiguration'
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
}

export function deactivate(): Promise<void> | undefined {
  return lsp?.stop()
}
