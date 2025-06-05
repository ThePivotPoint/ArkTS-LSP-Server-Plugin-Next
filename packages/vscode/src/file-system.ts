import * as vscode from 'vscode'
import { Logger } from './log/logger'

export abstract class FileSystem extends Logger {
  getCurrentWorkspaceDir(): vscode.Uri | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders)
      return undefined
    return workspaceFolders[0].uri
  }
}
