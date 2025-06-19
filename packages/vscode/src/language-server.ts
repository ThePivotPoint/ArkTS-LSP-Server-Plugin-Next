import type { EtsServerClientOptions, TypescriptLanguageFeatures } from '@arkts/shared'
import type { LabsInfo } from '@volar/vscode'
import type { LanguageClientOptions, ServerOptions } from '@volar/vscode/node'
import * as serverProtocol from '@volar/language-server/protocol'
import { activateAutoInsertion, createLabsInfo, getTsdk } from '@volar/vscode'
import { LanguageClient, TransportKind } from '@volar/vscode/node'
import defu from 'defu'
import { executeCommand } from 'reactive-vscode'
import * as vscode from 'vscode'
import { LanguageServerContext } from './context/server-context'

export class EtsLanguageServer extends LanguageServerContext {
  /**
   * Get the server options for the ETS Language Server.
   *
   * @returns The server options.
   */
  private async getServerOptions(): Promise<ServerOptions> {
    const serverModule = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'server.js')
    const runOptions = { execArgv: <string[]>[] }
    const debugOptions = { execArgv: ['--nolazy', `--inspect=${6009}`] }

    return {
      run: {
        module: serverModule.fsPath,
        transport: TransportKind.ipc,
        options: runOptions,
      },
      debug: {
        module: serverModule.fsPath,
        transport: TransportKind.ipc,
        options: debugOptions,
      },
    }
  }

  /**
   * Get the client options for the ETS Language Server.
   *
   * @returns The client options.
   * @throws {SdkAnalyzerException} If the SDK path have any no right, it will throw an error.
   */
  async getClientOptions(): Promise<LanguageClientOptions> {
    const localSdkPath = await this.getOhosSdkPathFromLocalProperties()
    const configSdkPath = vscode.workspace.getConfiguration('ets').get('sdkPath') as string | undefined
    const sdkPath = localSdkPath || configSdkPath
    if (!sdkPath) {
      vscode.window.showErrorMessage(this.translator.t('sdk.error.validSdkPath'))
      throw new Error(this.translator.t('sdk.error.validSdkPath'))
    }
    const sdkAnalyzer = this.createSdkAnalyzer(vscode.Uri.parse(sdkPath))
    const tsdk = await getTsdk(this.context)

    return {
      documentSelector: [
        { language: 'ets' },
        { language: 'typescript' },
      ],
      initializationOptions: {
        typescript: {
          tsdk: tsdk!.tsdk,
        },
        ohos: await sdkAnalyzer.toOhosClientOptions(false, tsdk?.tsdk),
        debug: vscode.workspace.getConfiguration('ets').get<boolean>('lspDebugMode'),
      } satisfies EtsServerClientOptions,
    }
  }

  /** Current language client is persisted here. */
  private _client: LanguageClient | undefined

  getCurrentLanguageClient(): LanguageClient | undefined {
    return this._client
  }

  /** Configure the volar typescript plugin by `ClientOptions`. */
  async configureTypeScriptPlugin(clientOptions: LanguageClientOptions): Promise<void> {
    const typescriptLanguageFeatures = vscode.extensions.getExtension<TypescriptLanguageFeatures>('vscode.typescript-language-features')
    await typescriptLanguageFeatures?.activate()
    typescriptLanguageFeatures?.exports.getAPI?.(0)?.configurePlugin?.('ets-typescript-plugin', {
      workspaceFolder: this.getCurrentWorkspaceDir()?.fsPath,
      lspOptions: clientOptions.initializationOptions,
    })
  }

  /**
   * Start the ETS Language Server.
   *
   * @param overrideClientOptions The override client options.
   * @returns The labs info.
   * @throws {SdkAnalyzerException} If the SDK path have any no right, it will throw an error.
   */
  async start(overrideClientOptions: LanguageClientOptions = {}): Promise<[LabsInfo | undefined, LanguageClientOptions]> {
    const [serverOptions, clientOptions] = await Promise.all([
      this.getServerOptions(),
      this.getClientOptions(),
    ])
    await this.configureTypeScriptPlugin(clientOptions)

    // If the lsp is already started, restart the lsp
    if (this._client) {
      await this._client.start()
      this.getConsola().info('ETS Language Server restarted!')
      vscode.window.setStatusBarMessage('ETS Language Server restarted!', 1000)
      return [undefined, clientOptions]
    }
    this._client = new LanguageClient(
      'ets-language-server',
      'ETS Language Server',
      serverOptions,
      defu(overrideClientOptions, clientOptions),
    )
    await this._client.start()
    // When the lsp is sent ets/configurationChanged notification, restart the lsp
    this._client.onNotification('ets/configurationChanged', () => this.restart(overrideClientOptions))
    this.listenAllLocalPropertiesFile()
    // support for auto close tag
    activateAutoInsertion('ets', this._client)
    this.getConsola().info('ETS Language Server started!')
    vscode.window.setStatusBarMessage('ETS Language Server started!', 1000)

    // support for https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volarjs-labs
    // ref: https://twitter.com/johnsoncodehk/status/1656126976774791168
    const labsInfo = createLabsInfo(serverProtocol)
    labsInfo.addLanguageClient(this._client)
    return [labsInfo.extensionExports!, clientOptions]
  }

  /**
   * Stop the ETS Language Server.
   *
   * @returns {Promise<void>}
   */
  async stop(): Promise<void> {
    if (this._client) {
      await this._client.stop()
      this.watcher.removeAllListeners()
      this._client.outputChannel.clear()
      this.getConsola().info('ETS Language Server stopped!')
      vscode.window.setStatusBarMessage('ETS Language Server stopped!', 1000)
    }
  }

  /**
   * Restart the ETS Language Server.
   *
   * @param overrideClientOptions The override client options.
   * @throws {SdkAnalyzerException} If the SDK path have any no right, it will throw an error.
   */
  async restart(overrideClientOptions: LanguageClientOptions = {}): Promise<void> {
    await executeCommand('typescript.restartTsServer')
    await this.stop()
    await this.start(overrideClientOptions)
    const reloadWindow = this.translator.t('ets.language-server.restart.reloadWindow.button')
    const reloadWindowChoice = await vscode.window.showInformationMessage(
      this.translator.t('ets.language-server.restart.reloadWindow'),
      reloadWindow,
    )
    if (reloadWindowChoice === reloadWindow) {
      await executeCommand('workbench.action.closeActiveEditor')
      await executeCommand('workbench.action.reloadWindow')
    }
  }
}
