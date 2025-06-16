import type { OhosClientOptions } from '@arkts/shared'
import type { FileSystem } from '../fs/file-system'
import path from 'node:path'
import fg from 'fast-glob'
import * as vscode from 'vscode'
import { SdkAnalyzerException } from './sdk-analyzer-exception'

export class SdkAnalyzer {
  constructor(
    private readonly sdkUri: vscode.Uri,
    private readonly fileSystem: FileSystem,
  ) {}

  private isSdkUriExists = false
  /**
   * Get the SDK path.
   *
   * @throws {SdkAnalyzerException} If the SDK path does not exist.
   */
  async getSdkUri(force: boolean = false): Promise<vscode.Uri> {
    if (this.isSdkUriExists && !force)
      return this.sdkUri
    await this.fileSystem
      .mustBeDirectory(this.sdkUri, SdkAnalyzerException.Code.SDKPathNotFound, SdkAnalyzerException.Code.SDKPathNotDirectory)
      .catch((error) => {
        throw SdkAnalyzerException.fromFileSystemException(error)
      })
    this.isSdkUriExists = true
    return this.sdkUri
  }

  private _cachedEtsComponentFolder: vscode.Uri | undefined
  /**
   * Get the `ets/component` folder of the SDK.
   *
   * @throws {SdkAnalyzerException} If the `ets/component` folder does not exist.
   */
  async getEtsComponentFolder(force: boolean = false): Promise<vscode.Uri> {
    if (this._cachedEtsComponentFolder && !force)
      return this._cachedEtsComponentFolder
    const etsComponentUri = vscode.Uri.joinPath(this.sdkUri, 'ets', 'component')
    await this.fileSystem
      .mustBeDirectory(etsComponentUri, SdkAnalyzerException.Code.EtsComponentPathNotFound, SdkAnalyzerException.Code.EtsComponentPathNotDirectory)
      .catch((error) => {
        throw SdkAnalyzerException.fromFileSystemException(error)
      })
    this._cachedEtsComponentFolder = etsComponentUri
    return etsComponentUri
  }

  private _cachedEtsLoaderConfigPath: vscode.Uri | undefined
  /**
   * Get the `ets/build-tools/ets-loader/tsconfig.json` path.
   *
   * @throws {SdkAnalyzerException} If the `ets/build-tools/ets-loader/tsconfig.json` path does not exist.
   */
  async getEtsLoaderConfigPath(force: boolean = false): Promise<vscode.Uri> {
    if (this._cachedEtsLoaderConfigPath && !force)
      return this._cachedEtsLoaderConfigPath
    const etsLoaderConfigUri = vscode.Uri.joinPath(this.sdkUri, 'ets', 'build-tools', 'ets-loader', 'tsconfig.json')
    await this.fileSystem
      .mustBeFile(etsLoaderConfigUri, SdkAnalyzerException.Code.EtsLoaderConfigPathNotFound, SdkAnalyzerException.Code.EtsLoaderConfigPathNotFile)
      .catch((error) => {
        throw SdkAnalyzerException.fromFileSystemException(error)
      })
    this._cachedEtsLoaderConfigPath = etsLoaderConfigUri
    return etsLoaderConfigUri
  }

  /**
   * Convert the `SdkAnalyzer` to client options.
   *
   * @returns {OhosClientOptions} The client options.
   * @throws {SdkAnalyzerException} If a path is not exists it will throw an error.
   */
  async toOhosClientOptions(force: boolean = false, tsdk?: string): Promise<OhosClientOptions> {
    const sdkPath = await this.getSdkUri(force)
    const etsComponentPath = await this.getEtsComponentFolder(force)
    const etsLoaderConfigPath = await this.getEtsLoaderConfigPath(force)
    const workspaceFolder = this.fileSystem.getCurrentWorkspaceDir()

    // Force load typescript default libs if tsdk is provided (For ArkTS)
    const typescriptDefaultLibs = [
      'lib.decorators.legacy.d.ts',
      'lib.es5.d.ts',
    ]
    return {
      sdkPath: sdkPath.fsPath,
      etsComponentPath: etsComponentPath.fsPath,
      etsLoaderConfigPath: etsLoaderConfigPath.fsPath,
      lib: [
        ...(tsdk ? typescriptDefaultLibs.map(lib => path.join(tsdk, lib)) : []),
        // '/Users/naily/OpenHarmony/10/lib.decorators.legacy.d.ts',
        // '/Users/naily/OpenHarmony/10/lib.es5.d.ts',
        ...fg.sync([
          vscode.Uri.joinPath(etsComponentPath, '**', '*.d.ts').fsPath,
          vscode.Uri.joinPath(etsComponentPath, '**', '*.d.ets').fsPath,
        ], { onlyFiles: true, absolute: true }),
      ].filter(Boolean) as string[],
      typeRoots: [
        workspaceFolder ? vscode.Uri.joinPath(workspaceFolder, 'node_modules', '@types').fsPath : undefined,
        workspaceFolder ? vscode.Uri.joinPath(workspaceFolder, 'oh_modules', '@types').fsPath : undefined,
        vscode.Uri.joinPath(this.sdkUri, 'ets', 'api', '@internal').fsPath,
      ].filter(Boolean) as string[],
      baseUrl: vscode.Uri.joinPath(sdkPath, 'ets').fsPath,
      paths: {
        '*': [
          workspaceFolder ? vscode.Uri.joinPath(workspaceFolder, 'oh_modules', '*').fsPath : undefined,
          './api/*',
          './kits/*',
          './arkts/*',
        ].filter(Boolean) as string[],
        '@internal/full/*': ['./api/@internal/full/*'],
      },
      etsLoaderPath: vscode.Uri.joinPath(sdkPath, 'ets', 'build-tools', 'ets-loader').fsPath,
    }
  }
}
