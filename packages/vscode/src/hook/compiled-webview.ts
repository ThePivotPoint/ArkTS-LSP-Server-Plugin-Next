import type { MaybeRefOrGetter, WebviewViewRegisterOptions } from 'reactive-vscode'
import fs from 'node:fs'
import path from 'node:path'
import { watch as watchFile } from 'chokidar'
import { extensionContext, ref, toValue, useWebviewView, watch } from 'reactive-vscode'
import * as vscode from 'vscode'

export function useCompiledWebview(htmlPath: MaybeRefOrGetter<string>, options: WebviewViewRegisterOptions = {}): ReturnType<typeof useWebviewView> {
  const html = ref('')

  watchFile([path.join(path.dirname(toValue(htmlPath)), '**', '*')])
    .on('all', () => loadHtml(toValue(htmlPath)))
  watch(() => htmlPath, () => loadHtml(toValue(htmlPath)))

  function loadHtml(htmlPath: string): void {
    const content = fs.readFileSync(htmlPath, 'utf-8')
    html.value = content.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_, src) => {
      return `<script type="module" crossorigin src="https://file+.vscode-resource.vscode-cdn.net${vscode.Uri.joinPath(extensionContext.value!.extensionUri, 'build', src).fsPath}"></script>`
    }).replace(/<link rel="stylesheet" crossorigin href="([^"]+)"/g, (_, src) => {
      return `<link rel="stylesheet" crossorigin href="https://file+.vscode-resource.vscode-cdn.net${vscode.Uri.joinPath(extensionContext.value!.extensionUri, 'build', src).fsPath}"`
    })
  }
  loadHtml(toValue(htmlPath))

  return useWebviewView('ets-hilog-view', html, {
    ...options,
    webviewOptions: {
      enableScripts: true,
      enableCommandUris: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionContext.value!.extensionUri, 'build')],
      ...options?.webviewOptions,
    },
  })
}
