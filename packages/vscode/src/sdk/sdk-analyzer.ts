import type { OhosClientOptions } from '@arkts/shared'
import type { FileSystem } from '../fs/file-system'
import type { Translator } from '../translate'
import path from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import * as vscode from 'vscode'
import { SdkAnalyzerException } from './sdk-analyzer-exception'

export class SdkAnalyzer {
  constructor(
    private readonly sdkUri: vscode.Uri,
    private readonly fileSystem: FileSystem,
    private readonly translator: Translator,
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
        throw SdkAnalyzerException.fromFileSystemException(error, this.translator)
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
        throw SdkAnalyzerException.fromFileSystemException(error, this.translator)
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
        throw SdkAnalyzerException.fromFileSystemException(error, this.translator)
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
    const etsLoaderPath = vscode.Uri.joinPath(sdkPath, 'ets', 'build-tools', 'ets-loader')
    const workspaceFolder = this.fileSystem.getCurrentWorkspaceDir()

    // Force load typescript default libs if tsdk is provided (For ArkTS)
    const typescriptDefaultLibs = [
      'lib.d.ts',
      'lib.decorators.legacy.d.ts', // Using legacy decorators
      // 'lib.dom.asynciterable.d.ts', // Exclude dom lib
      // 'lib.dom.d.ts', // Exclude dom lib
      // 'lib.dom.iterable.d.ts', // Exclude dom lib
      'lib.es5.d.ts',
      'lib.es6.d.ts',
      'lib.es2015.collection.d.ts',
      'lib.es2015.core.d.ts',
      'lib.es2015.d.ts',
      'lib.es2015.generator.d.ts',
      'lib.es2015.iterable.d.ts',
      'lib.es2015.promise.d.ts',
      'lib.es2015.proxy.d.ts',
      'lib.es2015.reflect.d.ts',
      'lib.es2015.symbol.d.ts',
      'lib.es2015.symbol.wellknown.d.ts',
      'lib.es2016.array.include.d.ts',
      'lib.es2016.d.ts',
      'lib.es2016.full.d.ts',
      'lib.es2016.intl.d.ts',
      'lib.es2017.arraybuffer.d.ts',
      'lib.es2017.d.ts',
      'lib.es2017.date.d.ts',
      'lib.es2017.full.d.ts',
      'lib.es2017.intl.d.ts',
      'lib.es2017.object.d.ts',
      'lib.es2017.sharedmemory.d.ts',
      'lib.es2017.string.d.ts',
      'lib.es2017.typedarrays.d.ts',
      'lib.es2018.asyncgenerator.d.ts',
      'lib.es2018.asynciterable.d.ts',
      'lib.es2018.d.ts',
      'lib.es2018.full.d.ts',
      'lib.es2018.intl.d.ts',
      'lib.es2018.promise.d.ts',
      'lib.es2018.regexp.d.ts',
      'lib.es2019.array.d.ts',
      'lib.es2019.d.ts',
      'lib.es2019.full.d.ts',
      'lib.es2019.intl.d.ts',
      'lib.es2019.object.d.ts',
      'lib.es2019.string.d.ts',
      'lib.es2019.symbol.d.ts',
      'lib.es2020.bigint.d.ts',
      'lib.es2020.d.ts',
      'lib.es2020.date.d.ts',
      'lib.es2020.full.d.ts',
      'lib.es2020.intl.d.ts',
      'lib.es2020.number.d.ts',
      'lib.es2020.promise.d.ts',
      'lib.es2020.sharedmemory.d.ts',
      'lib.es2020.string.d.ts',
      'lib.es2020.symbol.wellknown.d.ts',
    ]

    const declarationsLib = process.platform === 'win32'
      ? [
          fg.convertPathToPattern(vscode.Uri.joinPath(etsComponentPath, '**', '*.d.ts').fsPath),
          fg.convertPathToPattern(vscode.Uri.joinPath(etsComponentPath, '**', '*.d.ets').fsPath),
          fg.convertPathToPattern(vscode.Uri.joinPath(etsLoaderPath, 'declarations', '**', 'global.d.ts').fsPath),
        ]
      : [
          vscode.Uri.joinPath(etsComponentPath, '**', '*.d.ts').fsPath,
          vscode.Uri.joinPath(etsComponentPath, '**', '*.d.ets').fsPath,
          vscode.Uri.joinPath(etsLoaderPath, 'declarations', '**', 'global.d.ts').fsPath,
        ]

    return {
      sdkPath: sdkPath.fsPath,
      etsComponentPath: etsComponentPath.fsPath,
      etsLoaderConfigPath: etsLoaderConfigPath.fsPath,
      lib: [
        ...(tsdk ? typescriptDefaultLibs.map(lib => path.join(tsdk, lib)) : []),
        ...fg.sync(declarationsLib, { onlyFiles: true, absolute: true }),
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
      etsLoaderPath: etsLoaderPath.fsPath,
    }
  }
}
