import type { EtsServerClientOptions } from '@arkts/shared'
import type { LabsInfo } from '@volar/vscode'
import type { Ref } from 'reactive-vscode'
import fs from 'node:fs'
import path from 'node:path'
import { watch } from 'chokidar'
import { ref, useCommand, useWebviewView } from 'reactive-vscode'
import * as vscode from 'vscode'
import { EtsLanguageServer } from './language-server'
import { SdkManager } from './sdk/sdk-manager'
import { Translator } from './translate'

let lsp: EtsLanguageServer | undefined

function handleLspError(e: any): void {
  lsp?.getConsola().error(e)
  vscode.window.showErrorMessage(`Failed to restart ETS Language Server: ${e.code} ${e.message}`)
}

function loadHtml(html: Ref<string>, context: vscode.ExtensionContext, htmlPath: string): void {
  let content = fs.readFileSync(htmlPath, 'utf-8')
  content = content.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_, src) => {
    return `<script type="module" crossorigin src="https://file+.vscode-resource.vscode-cdn.net${vscode.Uri.joinPath(context.extensionUri, 'build', src).fsPath}"></script>`
  }).replace(/<link rel="stylesheet" crossorigin href="([^"]+)"/g, (_, src) => {
    return `<link rel="stylesheet" crossorigin href="https://file+.vscode-resource.vscode-cdn.net${vscode.Uri.joinPath(context.extensionUri, 'build', src).fsPath}"`
  })
  html.value = content
}

export async function activate(context: vscode.ExtensionContext): Promise<LabsInfo> {
  const translator = new Translator()
  SdkManager.from(translator)
  const html = ref('')
  const htmlPath = path.join(__dirname, '..', 'build', 'hilog.html')
  watch([htmlPath])
    .on('change', () => loadHtml(html, context, htmlPath))
    .on('add', () => loadHtml(html, context, htmlPath))
  useWebviewView('ets-hilog-view', html, {
    webviewOptions: {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'build')],
    },
  })

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
}

export function deactivate(): Promise<void> | undefined {
  return lsp?.stop()
}
