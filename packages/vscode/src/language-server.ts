import type { LabsInfo } from '@volar/vscode'
import type { LanguageClientOptions, ServerOptions } from '@volar/vscode/node'
import * as serverProtocol from '@volar/language-server/protocol'
import { activateAutoInsertion, createLabsInfo, getTsdk } from '@volar/vscode'
import { LanguageClient, TransportKind } from '@volar/vscode/node'
import * as vscode from 'vscode'
import { LanguageServerContext } from './context/server-context'

export class EtsLanguageServer extends LanguageServerContext {
  private async getServerOptions(context: vscode.ExtensionContext): Promise<ServerOptions> {
    const serverModule = vscode.Uri.joinPath(context.extensionUri, 'dist', 'server.js')
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

  private async getClientOptions(context: vscode.ExtensionContext): Promise<LanguageClientOptions> {
    const ohosSdkPath = await this.getOhosSdkPath()

    return {
      documentSelector: [{ language: 'ets' }],
      initializationOptions: {
        typescript: {
          tsdk: (await getTsdk(context))!.tsdk,
        },
        ohos: {
          sdkPath: ohosSdkPath,
          tsconfigPath: vscode.Uri.joinPath(context.extensionUri, 'dist', 'types', 'tsconfig.base.json').fsPath,
        },
      },
    }
  }

  private _client: LanguageClient | undefined

  async start(context: vscode.ExtensionContext): Promise<LabsInfo | undefined> {
    if (this._client) {
      await this._client.stop()
      this._client = undefined
    }

    const [serverOptions, clientOptions] = await Promise.all([
      this.getServerOptions(context),
      this.getClientOptions(context),
    ])
    this._client = new LanguageClient(
      'ets-language-server',
      'ETS Language Server',
      serverOptions,
      clientOptions,
    )
    this.listenAllLocalPropertiesFile(context)
    await this._client.start()
    // support for auto close tag
    activateAutoInsertion('ets', this._client)
    this.getConsola().info('ETS Language Server started!')
    vscode.window.setStatusBarMessage('ETS Language Server started!', 1000)

    // support for https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volarjs-labs
    // ref: https://twitter.com/johnsoncodehk/status/1656126976774791168
    const labsInfo = createLabsInfo(serverProtocol)
    labsInfo.addLanguageClient(this._client)
    return labsInfo.extensionExports
  }

  getCurrentLanguageClient(): LanguageClient | undefined {
    return this._client
  }

  async stop(): Promise<void> {
    if (this._client) {
      await this._client.stop()
      this._client = undefined
      this.getConsola().info('ETS Language Server stopped!')
      vscode.window.setStatusBarMessage('ETS Language Server stopped!', 1000)
    }
    else {
      this.getConsola().warn('ETS Language Server is not running, cannot stop it.')
      vscode.window.setStatusBarMessage('ETS Language Server is not running, cannot stop it.', 1000)
    }
  }

  async restart(context: vscode.ExtensionContext): Promise<void> {
    await this.stop()
    await this.start(context)
  }
}
