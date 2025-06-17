import type { MaybeRefOrGetter, Ref, WebviewViewRegisterOptions } from 'reactive-vscode'
import fs from 'node:fs'
import path from 'node:path'
import { watch as watchFile } from 'chokidar'
import { extensionContext, ref, toValue, useWebviewView, watch } from 'reactive-vscode'
import * as vscode from 'vscode'

export function useCompiledWebview(htmlPath: MaybeRefOrGetter<string>, options: WebviewViewRegisterOptions = {}): ReturnType<typeof useWebviewView> {
  const html = ref('')

  watchFile([path.join(path.dirname(toValue(htmlPath)), '**', '*')])
    .on('change', () => loadHtml(html, toValue(htmlPath)))
    .on('add', () => loadHtml(html, toValue(htmlPath)))
  watch(() => htmlPath, () => loadHtml(html, toValue(htmlPath)))

  function loadHtml(html: Ref<string>, htmlPath: string): void {
    let content = fs.readFileSync(htmlPath, 'utf-8')
    content = content.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_, src) => {
      return `<script type="module" crossorigin src="https://file+.vscode-resource.vscode-cdn.net${vscode.Uri.joinPath(extensionContext.value!.extensionUri, 'build', src).fsPath}"></script>`
    }).replace(/<link rel="stylesheet" crossorigin href="([^"]+)"/g, (_, src) => {
      return `<link rel="stylesheet" crossorigin href="https://file+.vscode-resource.vscode-cdn.net${vscode.Uri.joinPath(extensionContext.value!.extensionUri, 'build', src).fsPath}"`
    })
    html.value = content
  }

  return useWebviewView('ets-hilog-view', html, {
    ...options,
    webviewOptions: {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionContext.value!.extensionUri, 'build')],
      ...options?.webviewOptions,
    },
  })
}
