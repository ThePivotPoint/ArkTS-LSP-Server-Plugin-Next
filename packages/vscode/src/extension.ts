import type { LabsInfo } from '@volar/vscode'
import type * as vscode from 'vscode'
import { EtsLanguageServer } from './language-server'

let lsp: EtsLanguageServer | undefined

export async function activate(context: vscode.ExtensionContext): Promise<LabsInfo> {
  lsp = new EtsLanguageServer()

  // First start it will be return LabsInfo object for volar.js labs extension
  return await lsp.start(context) as LabsInfo
}

export function deactivate(): Promise<void> | undefined {
  return lsp?.stop()
}
