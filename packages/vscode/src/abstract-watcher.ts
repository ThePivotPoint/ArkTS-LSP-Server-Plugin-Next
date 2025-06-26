import type { FSWatcher } from 'chokidar'
import type * as vscode from 'vscode'
import type { Translator } from './translate'
import { watch } from 'chokidar'
import { Autowired } from 'unioc'
import { Disposable, ExtensionContext } from 'unioc/vscode'
import { FileSystem } from './fs/file-system'

@Disposable
export class AbstractWatcher extends FileSystem implements Disposable {
  @Autowired(ExtensionContext)
  protected readonly context: vscode.ExtensionContext

  @Autowired
  protected readonly translator: Translator

  private _watcher: FSWatcher | undefined
  private static readonly watchers: FSWatcher[] = []

  protected get watcher(): FSWatcher {
    if (!this._watcher) {
      this._watcher = watch([])
      AbstractWatcher.watchers.push(this._watcher)
    }
    return this._watcher
  }

  async dispose(): Promise<void> {
    await Promise.all(AbstractWatcher.watchers.map(watcher => watcher.close()))
  }

  protected async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose()
  }
}
