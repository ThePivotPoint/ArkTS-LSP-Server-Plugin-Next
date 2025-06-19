import type * as vscode from 'vscode'
import type { URI } from 'vscode-uri'
import type { Translator } from '../translate'
import fs from 'node:fs'
import path from 'node:path'
import { AbstractWatcher } from '../abstract-watcher'

export class ResourceDetector extends AbstractWatcher {
  constructor(
    private readonly filePath: URI | string,
    protected readonly context: vscode.ExtensionContext,
    protected readonly translator: Translator,
  ) {
    super(context, translator)
  }

  /** Get file path. */
  public getFilePath(): string {
    if (typeof this.filePath === 'string')
      return path.resolve(this.filePath)
    return this.filePath.fsPath
  }

  /**
   * 从当前文件路径往上找，直到找到 `resources` 文件夹
   * 如果找不到，则返回 `undefined`
   */
  getResourcePath(): Promise<string | undefined> {
    const filePath = this.getFilePath()
    return this.findResourcePath(filePath)
  }

  /**
   * Get resource folders.
   * @param resourcePath 资源目录路径
   * @returns 资源目录下的所有文件夹路径
   */
  public async getResourceFolders(resourcePath?: string): Promise<string[]> {
    const readedResourcePath = resourcePath || await this.getResourcePath()
    if (!readedResourcePath)
      return []
    return fs.readdirSync(readedResourcePath).map(folderPath => path.join(readedResourcePath, folderPath))
  }

  private async findResourcePath(filePath: string): Promise<string | undefined> {
    const parentPath = path.dirname(filePath)
    if (parentPath === '.' || parentPath === '..' || parentPath === '/')
      return undefined
    const resourcePath = path.join(parentPath, 'resources')
    if (await this.isResourceDir(resourcePath))
      return resourcePath
    return this.findResourcePath(parentPath)
  }

  /**
   * 判断一个路径是否是资源目录
   * @param resourcePath 资源目录路径
   * @returns 是否是资源目录
   */
  public async isResourceDir(resourcePath: string): Promise<boolean> {
    // Check resources
    if (!fs.existsSync(resourcePath) || !fs.statSync(resourcePath).isDirectory())
      return false
    const basename = path.basename(resourcePath)
    if (basename !== 'resources')
      return false
    // Check resources/base/profile/main_pages.json
    const resourceBaseProfileMainPagesPath = path.join(resourcePath, 'base', 'profile', 'main_pages.json')
    if (!fs.existsSync(resourceBaseProfileMainPagesPath) || !fs.statSync(resourceBaseProfileMainPagesPath).isFile())
      return false
    const resourceBaseProfileMainPages: unknown = JSON.parse(fs.readFileSync(resourceBaseProfileMainPagesPath, 'utf-8'))
    if (!resourceBaseProfileMainPages || !(typeof resourceBaseProfileMainPages === 'object') || !('src' in resourceBaseProfileMainPages) || !Array.isArray(resourceBaseProfileMainPages.src))
      return false
    // Check if all items are strings, if not, return false
    if (resourceBaseProfileMainPages.src.every(item => typeof item !== 'string'))
      return false
    return true
  }
}
