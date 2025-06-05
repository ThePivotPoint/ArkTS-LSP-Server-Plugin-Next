import type { LabsInfo } from '@volar/vscode'
import path from 'node:path'
import * as vscode from 'vscode'
import { AbstractWatcher } from '../abstract-watcher'

export abstract class LanguageServerContext extends AbstractWatcher {
  /** Start the language server. */
  abstract start(context: vscode.ExtensionContext): Promise<LabsInfo | undefined>
  /** Stop the language server. */
  abstract stop(): Promise<void>
  /** Restart the language server. */
  abstract restart(context: vscode.ExtensionContext): Promise<void>

  /** Listen to all local.properties files in the workspace. */
  listenAllLocalPropertiesFile(context: vscode.ExtensionContext): void {
    const workspaceFolders = vscode.workspace.workspaceFolders ?? []

    for (const workspaceFolder of workspaceFolders) {
      this.watcher.add(vscode.Uri.joinPath(workspaceFolder.uri, 'local.properties').fsPath)
      this.getConsola().info(`Listening ${vscode.Uri.joinPath(workspaceFolder.uri, 'local.properties').fsPath}`)
    }

    this.watcher.on('all', (event, path) => this.localPropertiesWatcher(event, path, context))
  }

  private async localPropertiesWatcher(event: string, path: string, context: vscode.ExtensionContext): Promise<void> {
    this.getConsola().warn(`${path} is ${event.toUpperCase()}, restarting ETS Language Server...`)
    await this.restart(context)
  }

  /** Get the path of the Ohos SDK. */
  protected async getOhosSdkPath(): Promise<string | undefined> {
    const workspaceDir = this.getCurrentWorkspaceDir()
    if (!workspaceDir)
      return undefined
    const localPropPath = vscode.Uri.joinPath(workspaceDir, 'local.properties')
    const stat = await vscode.workspace.fs.stat(localPropPath)
    if (stat.type !== vscode.FileType.File) {
      await vscode.window.showErrorMessage(`${path.relative(workspaceDir.fsPath, localPropPath.fsPath)}文件不存在，请在项目根目录下创建一个。`)
      return
    }

    const content = await vscode.workspace.fs.readFile(localPropPath)
    const lines = content.toString().split('\n')
    const sdkPath = lines.find(line => line.startsWith('sdk.dir'))
    if (!sdkPath) {
      await vscode.window.showErrorMessage(`${path.relative(workspaceDir.fsPath, localPropPath.fsPath)}文件不存在sdk.dir配置，请先配置sdk.dir。`)
      return
    }

    const sdkDir = sdkPath.split('=')[1].trim()
    if (!sdkDir) {
      await vscode.window.showErrorMessage(`${path.relative(workspaceDir.fsPath, localPropPath.fsPath)}文件存在sdk.dir配置，但配置为空。`)
      return
    }

    return sdkDir
  }
}
