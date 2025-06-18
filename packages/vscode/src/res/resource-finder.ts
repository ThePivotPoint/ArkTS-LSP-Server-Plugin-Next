import path from 'node:path'
import fg from 'fast-glob'
import * as vscode from 'vscode'
import { ResourceDetector } from './resource-detector'

export class ResourceFinder extends ResourceDetector {
  /**
   * Find `media` resource in `resources/base` folder by name
   *
   * @param resourcePath - The path to the resource folder
   * @param name - The name of the resource
   * @returns The list of locations of the resource
   */
  private findRelativeMediaResource(resourcePath: string, name: string): vscode.Location[] {
    const mediaList = fg.sync(path.join(resourcePath, 'base', 'media', '**', `${name}.{jpg,png,gif,svg,webp,bmp,3gp,mp4}`), {
      absolute: true,
      onlyFiles: true,
    })
    return mediaList.map((filePath) => {
      return new vscode.Location(vscode.Uri.file(filePath), new vscode.Range(0, 0, 0, 0))
    })
  }

  async findRelativeResource(content: string): Promise<vscode.Location[] | undefined> {
    const resourcePath = await this.getResourcePath()
    if (!resourcePath)
      return []
    const resourceFolders = await this.getResourceFolders(resourcePath)
    if (resourceFolders.length === 0)
      return []
    const resourceParts = content.split('.')
    if (resourceParts.length === 0)
      return []
    if (resourceParts[0] !== 'app')
      return []
    if (resourceParts[1] === 'media') {
      return this.findRelativeMediaResource(resourcePath, resourceParts[2] || '')
    }
  }
}
