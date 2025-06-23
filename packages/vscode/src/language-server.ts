import type { EtsServerClientOptions, TypescriptLanguageFeatures } from '@arkts/shared'
import type { LabsInfo } from '@volar/vscode'
import type { LanguageClientOptions, ServerOptions } from '@volar/vscode/node'
import type { ExtensionLogger } from 'packages/shared/out/vscode.mjs'
import type { Translator } from './translate'
import * as serverProtocol from '@volar/language-server/protocol'
import { activateAutoInsertion, createLabsInfo, getTsdk } from '@volar/vscode'
import { LanguageClient, TransportKind } from '@volar/vscode/node'
import defu from 'defu'
import { executeCommand, useCommand } from 'reactive-vscode'
import * as vscode from 'vscode'
import { LanguageServerContext } from './context/server-context'

export class EtsLanguageServer extends LanguageServerContext {
  private static errorToDetail(error: unknown): string {
    if (error instanceof Error || (error && typeof error === 'object' && 'message' in error))
      return `${error.message} ${'code' in error ? `[${error.code}]` : ''}`
    return `${typeof error === 'string' || typeof error === 'number' || typeof error === 'boolean' ? error : JSON.stringify(error)}`
  }

  private static async handleLspError(error: unknown, translator: Translator): Promise<void> {
    this._lsp?.getConsola().error(error)
    const choiceSdkPath = translator.t('sdk.error.choiceSdkPathMasually')
    const downloadOrChoiceSdkPath = translator.t('sdk.error.downloadOrChoiceSdkPath')
    const result = await vscode.window.showWarningMessage('OpenHarmony SDK Warning', {
      modal: true,
      detail: this.errorToDetail(error),
    }, choiceSdkPath, downloadOrChoiceSdkPath)

    if (result === choiceSdkPath) {
      const [sdkPath] = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: translator.t('sdk.error.choiceSdkPathMasually'),
      }) || []
      if (!sdkPath) {
        vscode.window.showErrorMessage(translator.t('sdk.error.validSdkPath'))
      }
      else {
        vscode.workspace.getConfiguration().update('ets.sdkPath', sdkPath.fsPath, vscode.ConfigurationTarget.Global)
      }
    }
    else if (result === downloadOrChoiceSdkPath) {
      executeCommand('ets.installSDK')
    }
  }

  private static _lsp: EtsLanguageServer | undefined

  private static async startLanguageServer(context: vscode.ExtensionContext, translator: Translator): Promise<LabsInfo> {
    try {
      this._lsp = new EtsLanguageServer(context, translator)

      // First start it will be return LabsInfo object for volar.js labs extension
      const [labsInfo] = await this._lsp.start(undefined, true)
      return labsInfo!
    }
    catch (error) {
      this.handleLspError(error, translator)
      this._lsp = undefined
      throw error
    }
  }

  public static async from(context: vscode.ExtensionContext, translator: Translator, logger: ExtensionLogger): Promise<LabsInfo> {
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (!e.affectsConfiguration('ets'))
        return
      if (!this._lsp) {
        logger.getConsola().info(`[underwrite] sdk path changed, start language server...`)
        await this.startLanguageServer(context, translator)
        return
      }
      this._lsp.refresh()
    })

    useCommand('ets.restartServer', () => this._lsp?.restart().catch(e => this.handleLspError(e, translator)))
    return await this.startLanguageServer(context, translator)
  }

  /**
   * Get the server options for the ETS Language Server.
   *
   * @returns The server options.
   */
  private async getServerOptions(): Promise<ServerOptions> {
    const serverModule = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'lsp.js')
    const runOptions = { execArgv: [] as string[] }
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
  async getClientOptions(force: boolean = false): Promise<LanguageClientOptions> {
    const sdkPath = await this.getAnalyzedSdkPath(force)
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
      outputChannel: this.getOutputChannel(),
      initializationOptions: {
        typescript: {
          tsdk: tsdk!.tsdk,
        },
        ohos: await sdkAnalyzer.toOhosClientOptions(force, tsdk?.tsdk),
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
  async start(overrideClientOptions: LanguageClientOptions = {}, force: boolean = false): Promise<[LabsInfo | undefined, LanguageClientOptions]> {
    const [serverOptions, clientOptions] = await Promise.all([
      this.getServerOptions(),
      this.getClientOptions(force),
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

  async refresh(existingClientOptions?: LanguageClientOptions): Promise<void> {
    const clientOptions = existingClientOptions || await this.getClientOptions(true) || {}
    await this.getCurrentLanguageClient()?.sendNotification('workspace/didChangeConfiguration', {
      settings: clientOptions.initializationOptions as EtsServerClientOptions,
      configType: 'lspConfiguration',
    })
  }
}
