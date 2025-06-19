import type { FSWatcher } from 'chokidar'
import type * as vscode from 'vscode'
import { watch } from 'chokidar'
import { FileSystem } from './fs/file-system'

export abstract class AbstractWatcher extends FileSystem implements vscode.Disposable {
  private _watcher: FSWatcher | undefined
  private static readonly watchers: FSWatcher[] = []

  protected get watcher(): FSWatcher {
    if (!this._watcher) {
      this._watcher = watch([])
      AbstractWatcher.watchers.push(this._watcher)
    }
    return this._watcher
  }

  constructor(context: vscode.ExtensionContext) {
    super()
    context.subscriptions.push(this)
  }

  async dispose(): Promise<void> {
    await Promise.all(AbstractWatcher.watchers.map(watcher => watcher.close()))
  }

  protected async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose()
  }
}
