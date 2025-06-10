import fs from 'node:fs'
import { ExtensionLogger } from '@arkts/shared/vscode'
import * as vscode from 'vscode'
import { SdkAnalyzer } from '../sdk/sdk-analyzer'
import { FileSystemException } from './file-system-exception'

export abstract class FileSystem extends ExtensionLogger {
  /**
   * Get the current workspace directory.
   *
   * @returns {vscode.Uri | undefined} The current workspace directory.
   */
  getCurrentWorkspaceDir(): vscode.Uri | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders)
      return undefined
    return workspaceFolders[0].uri
  }

  createSdkAnalyzer(sdkUri: vscode.Uri): SdkAnalyzer {
    return new SdkAnalyzer(sdkUri, this)
  }

  /**
   * Check if the path is a directory.
   *
   * @param {vscode.Uri} uri The path to check.
   * @param {SdkAnalyzerException.Code} notFoundCode The code to throw if the path does not exist.
   * @param {SdkAnalyzerException.Code} notDictCode The code to throw if the path is not a directory.
   * @throws {SdkAnalyzerException} If the path does not exist or is not a directory.
   */
  async mustBeDirectory(uri: vscode.Uri, notFoundCode: number | string, notDictCode: number | string): Promise<void> {
    if (!fs.existsSync(uri.fsPath))
      throw new FileSystemException(notFoundCode, `Path ${uri.fsPath} does not exist.`)
    const statInfo = await vscode.workspace.fs.stat(uri)
    if (statInfo.type !== vscode.FileType.Directory)
      throw new FileSystemException(notDictCode, `Path ${uri.fsPath} is not a directory.`)
  }

  /**
   * Check if the path is a file.
   *
   * @param {vscode.Uri} uri The path to check.
   * @param {number | string} notFoundCode The code to throw if the path does not exist.
   * @param {number | string} notFileCode The code to throw if the path is not a file.
   * @throws {FileSystemException} If the path does not exist or is not a file.
   */
  async mustBeFile(uri: vscode.Uri, notFoundCode: number | string, notFileCode: number | string): Promise<void> {
    if (!fs.existsSync(uri.fsPath))
      throw new FileSystemException(notFoundCode, `Path ${uri.fsPath} does not exist.`)
    const statInfo = await vscode.workspace.fs.stat(uri)
    if (statInfo.type !== vscode.FileType.File)
      throw new FileSystemException(notFileCode, `Path ${uri.fsPath} is not a file.`)
  }

  /**
   * Create a directory if it does not exist.
   *
   * @param folderPath - The path to the directory.
   */
  async createDirectoryIfNotExists(folderPath: string): Promise<void> {
    if (!fs.existsSync(folderPath))
      fs.mkdirSync(folderPath, { recursive: true })
  }
}
