import type { LabsInfo } from '@volar/vscode'
import type { LanguageClient, LanguageClientOptions } from '@volar/vscode/node'
import type { TypescriptLanguageFeatures } from 'packages/shared/out/index.mjs'
import { executeCommand } from 'reactive-vscode'
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

    this.watcher.on('all', (event, path) => this.onLocalPropertiesChanged(event, path))
  }

  private isFirstStart: boolean = true
  private async onLocalPropertiesChanged(event: string, path: string): Promise<void> {
    if (this.isFirstStart) {
      this.isFirstStart = false
      return
    }
    this.getConsola().warn(`${path} is ${event.toUpperCase()}, restarting ETS Language Server...`)
    this.restart()
  }

  /** Get the path of the Ohos SDK from `local.properties` file. */
  protected async getOhosSdkPathFromLocalProperties(): Promise<string | undefined> {
    try {
      const workspaceDir = this.getCurrentWorkspaceDir()
      if (!workspaceDir)
        return undefined
      const localPropPath = vscode.Uri.joinPath(workspaceDir, 'local.properties')
      const stat = await vscode.workspace.fs.stat(localPropPath)
      if (stat.type !== vscode.FileType.File)
        return

      const content = await vscode.workspace.fs.readFile(localPropPath)
      const lines = content.toString().split('\n')
      const sdkPath = lines.find(line => line.startsWith('sdk.dir'))
      return sdkPath?.split('=')?.[1]?.trim()
    }
    catch {}
  }

  private _analyzedSdkPath: string | undefined

  /** Get the path of the Ohos SDK from `local.properties` file or configuration. */
  protected async getAnalyzedSdkPath(force: boolean = false): Promise<string | undefined> {
    if (!force && this._analyzedSdkPath)
      return this._analyzedSdkPath
    const localSdkPath = await this.getOhosSdkPathFromLocalProperties()
    const inspectedConfiguration = vscode.workspace.getConfiguration('ets').inspect<string>('sdkPath') || {} as ReturnType<ReturnType<typeof vscode.workspace.getConfiguration>['inspect']>
    const sdkPath = localSdkPath || inspectedConfiguration?.workspaceFolderValue || inspectedConfiguration?.globalValue
    this.getConsola().info(`Analyzed OHOS SDK path: ${sdkPath}`)
    this._analyzedSdkPath = sdkPath as string | undefined
    return this._analyzedSdkPath
  }

  /** Configure the volar typescript plugin by `ClientOptions`. */
  protected async configureTypeScriptPlugin(clientOptions: LanguageClientOptions): Promise<void> {
    const typescriptLanguageFeatures = vscode.extensions.getExtension<TypescriptLanguageFeatures>('vscode.typescript-language-features')
    if (typescriptLanguageFeatures?.isActive) {
      executeCommand('typescript.restartTsServer')
    }
    await typescriptLanguageFeatures?.activate()
    typescriptLanguageFeatures?.exports.getAPI?.(0)?.configurePlugin?.('ets-typescript-plugin', {
      workspaceFolder: this.getCurrentWorkspaceDir()?.fsPath,
      lspOptions: clientOptions.initializationOptions,
    })
  }
}
