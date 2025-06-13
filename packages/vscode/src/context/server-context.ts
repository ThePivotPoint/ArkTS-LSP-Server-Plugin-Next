import type { LabsInfo } from '@volar/vscode'
import type { LanguageClient } from '@volar/vscode/node'
import type { LanguageClientOptions } from '@volar/vscode/node'
import path from 'node:path'
import * as vscode from 'vscode'
import { AbstractWatcher } from '../abstract-watcher'

export abstract class LanguageServerContext extends AbstractWatcher {
  /** Start the language server. */
  abstract start(overrideClientOptions: LanguageClientOptions): Promise<[LabsInfo | undefined, LanguageClientOptions]>
  /** Stop the language server. */
  abstract stop(): Promise<void>
  /** Restart the language server. */
  abstract restart(): Promise<void>
  /** Get the current language client. */
  abstract getCurrentLanguageClient(): LanguageClient | undefined

  /** Listen to all local.properties files in the workspace. */
  protected listenAllLocalPropertiesFile(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders ?? []

    for (const workspaceFolder of workspaceFolders) {
      this.watcher.add(vscode.Uri.joinPath(workspaceFolder.uri, 'local.properties').fsPath)
      this.getConsola().info(`Listening ${vscode.Uri.joinPath(workspaceFolder.uri, 'local.properties').fsPath}`)
    }

    this.watcher.on('all', (event, path) => this.localPropertiesWatcher(event, path))
  }

  private isFirstStart: boolean = true
  private async localPropertiesWatcher(event: string, path: string): Promise<void> {
    if (this.isFirstStart) {
      this.isFirstStart = false
      return
    }
    this.getConsola().warn(`${path} is ${event.toUpperCase()}, restarting ETS Language Server...`)
    await this.restart()
  }

  /** Get the path of the Ohos SDK from `local.properties` file. */
  protected async getOhosSdkPathFromLocalProperties(): Promise<string | undefined> {
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
    return sdkPath?.split('=')?.[1]?.trim()
  }
}
