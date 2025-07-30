import type { MaybeRefOrGetter, WebviewViewRegisterOptions } from 'reactive-vscode'
import fs from 'node:fs'
import path from 'node:path'
import { watch as watchFile } from 'chokidar'
import { extensionContext, ref, toValue, useWebviewView, watch } from 'reactive-vscode'
import * as vscode from 'vscode'

export function useCompiledWebview(htmlPath: MaybeRefOrGetter<string>, options: WebviewViewRegisterOptions = {}): ReturnType<typeof useWebviewView> {
  const html = ref('')

  watchFile(path.dirname(toValue(htmlPath))).on('all', () => loadHtml(toValue(htmlPath)))
  watch(() => htmlPath, () => loadHtml(toValue(htmlPath)))

  const webviewView = useWebviewView('ets-hilog-view', html, {
    ...options,
    webviewOptions: {
      enableScripts: true,
      enableCommandUris: true,
      ...options?.webviewOptions,
    },
  })

  function loadHtml(htmlPath: string): void {
    const content = fs.readFileSync(htmlPath, 'utf-8')
    html.value = content
    html.value = html.value.replace(/\{\{(.*?)\}\}/g, (_, href) => {
      const resourceUri = webviewView.view.value?.webview.asWebviewUri(vscode.Uri.file(path.resolve(extensionContext.value!.extensionPath, 'build', href)))
      return decodeURIComponent(resourceUri?.toString() || '')
    })
  }
  watch(() => webviewView.view.value?.webview, () => loadHtml(toValue(htmlPath)), { immediate: true })

  return webviewView
}
