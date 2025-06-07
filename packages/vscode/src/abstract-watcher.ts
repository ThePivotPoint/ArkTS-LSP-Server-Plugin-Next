import { watch } from 'chokidar'
import { FileSystem } from './fs/file-system'

export abstract class AbstractWatcher extends FileSystem {
  protected readonly watcher = watch([])
}
