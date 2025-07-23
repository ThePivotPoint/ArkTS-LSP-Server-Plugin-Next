import type { EtsServerClientOptions } from '@arkts/shared'
import type { LabsInfo } from '@volar/vscode'
import type { LanguageClientOptions, ServerOptions } from '@volar/vscode/node'
import * as serverProtocol from '@volar/language-server/protocol'
import { activateAutoInsertion, createLabsInfo, getTsdk } from '@volar/vscode'
import { LanguageClient, TransportKind } from '@volar/vscode/node'
import defu from 'defu'
import { executeCommand } from 'reactive-vscode'
import { Autowired } from 'unioc'
import { Command, Disposable, ExtensionContext, IOnActivate, WatchConfiguration } from 'unioc/vscode'
import * as vscode from 'vscode'
import { LanguageServerContext } from './context/server-context'
import { SdkAnalyzer } from './sdk/sdk-analyzer'
import { Translator } from './translate'
import { sleep } from './utils'

@Disposable
@Command('ets.restartServer')
export class EtsLanguageServer extends LanguageServerContext implements Command, Disposable, vscode.DocumentFormattingEditProvider, IOnActivate {
  @Autowired
  protected readonly translator: Translator

  @Autowired(ExtensionContext)
  protected readonly context: ExtensionContext

  onExecuteCommand(): void {
    this.restart().catch(e => this.handleLspError(e))
  }

  constructor() {
    super()
  }

  async onActivate(context: vscode.ExtensionContext): Promise<void> {
    context.subscriptions.push(
      vscode.languages.registerDocumentFormattingEditProvider(
        { scheme: 'file', language: 'ets' },
        this,
      ),
    )
  }

  async provideDocumentFormattingEdits(textDocument: vscode.TextDocument, options: vscode.FormattingOptions): Promise<vscode.TextEdit[]> {
    return await this.getCurrentLanguageClient()?.sendRequest('ets/formatDocument', {
      textDocument,
      options,
    }) || []
  }

  @WatchConfiguration()
  async onConfigurationChanged(e: vscode.ConfigurationChangeEvent): Promise<unknown> {
    if (!e.affectsConfiguration('ets'))
      return
    if (!this.getCurrentLanguageClient()?.isRunning()) {
      this.getConsola().info(`[underwrite] sdk path changed, start language server...`)
      return this.run()
    }

    try {
      // Wait the workspace/configurationChanged event send, then restart the language server
      await sleep(100)
      await this.restart(undefined, true).catch(e => this.handleLspError(e))
    }
    catch (error) {
      this.handleLspError(error)
    }
  }

  private errorToString(error: unknown): string {
    if (error instanceof Error || (error && typeof error === 'object' && 'message' in error))
      return `${error.message} ${'code' in error ? `[${error.code}]` : ''}`
    return `${typeof error === 'string' || typeof error === 'number' || typeof error === 'boolean' ? error : JSON.stringify(error)}`
  }

  private async handleLspError(error: unknown): Promise<void> {
    this.getConsola().error(`捕获到错误：`)
    this.getConsola().error(error)
    console.error(error)
    const choiceSdkPath = this.translator.t('sdk.error.choiceSdkPathMasually')
    const downloadOrChoiceSdkPath = this.translator.t('sdk.error.downloadOrChoiceSdkPath')
    const detail = this.errorToString(error)
    const result = await vscode.window.showWarningMessage(
      'OpenHarmony SDK Warning',
      { modal: true, detail },
      choiceSdkPath,
      downloadOrChoiceSdkPath,
    )

    if (result === choiceSdkPath) {
      const [sdkPath] = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: this.translator.t('sdk.error.choiceSdkPathMasually'),
      }) || []
      if (!sdkPath) {
        vscode.window.showErrorMessage(this.translator.t('sdk.error.validSdkPath'))
      }
      else {
        vscode.workspace.getConfiguration().update('ets.sdkPath', sdkPath.fsPath, vscode.ConfigurationTarget.Global)
      }
    }
    else if (result === downloadOrChoiceSdkPath) {
      executeCommand('ets.installSDK')
    }
  }

  async run(): Promise<LabsInfo | undefined> {
    try {
      // First start it will be return LabsInfo object for volar.js labs extension
      const [labsInfo] = await this.start(undefined, true)
      return labsInfo!
    }
    catch (error) {
      this.handleLspError(error)
      return undefined
    }
  }

  /**
   * Get the server options for the ETS Language Server.
   *
   * @returns The server options.
   */
  private async getServerOptions(): Promise<ServerOptions> {
    const serverModule = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'server.js')
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
    const sdkAnalyzer = new SdkAnalyzer(vscode.Uri.file(sdkPath), this, this.translator)
    const tsdk = await getTsdk(this.context)

    return {
      documentSelector: [
        { language: 'ets' },
        { language: 'typescript' },
      ],
      outputChannel: this.getOutputChannel(),
      initializationOptions: {
        typescript: { tsdk: tsdk!.tsdk },
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

    // If the lsp is already created, just restart the lsp
    if (this._client) {
      this._client.start()
      this._client.sendRequest('ets/waitForEtsConfigurationChangedRequested', clientOptions.initializationOptions)
      this.getConsola().info('ETS Language Server restarted!')
      vscode.window.setStatusBarMessage('ETS Language Server restarted!', 1000)
      return [undefined, clientOptions]
    }

    // If the lsp is not created, create a new one
    this._client = new LanguageClient(
      'ets-language-server',
      'ETS Language Server',
      serverOptions,
      defu(overrideClientOptions, clientOptions),
    )
    this._client.start()
    this._client.sendRequest('ets/waitForEtsConfigurationChangedRequested', clientOptions.initializationOptions)
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
  async restart(overrideClientOptions: LanguageClientOptions = {}, force: boolean = false): Promise<void> {
    this.getConsola().info(`======================= Restarting ETS Language Server =======================`)
    await executeCommand('typescript.restartTsServer')
    await this.stop()
    await this.start(overrideClientOptions, force)
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
