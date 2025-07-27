import type { FSWatcher } from 'chokidar'
import { watch } from 'chokidar'
import { Disposable } from 'unioc/vscode'
import { FileSystem } from './fs/file-system'

@Disposable
export class AbstractWatcher extends FileSystem implements Disposable {
  private _watcher: FSWatcher | undefined
  private static readonly watchers: FSWatcher[] = []

  get watcher(): FSWatcher {
    if (!this._watcher) {
      this._watcher = watch([])
      AbstractWatcher.watchers.push(this._watcher)
    }
    return this._watcher
  }

  async dispose(): Promise<void> {
    await Promise.all(AbstractWatcher.watchers.map(watcher => watcher.close()))
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose()
  }
}
