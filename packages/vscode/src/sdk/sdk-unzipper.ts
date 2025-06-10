import type { SdkUrlSelector, SdkVersion } from './sdk-url-selector'
import fs from 'node:fs'
import path from 'node:path'
import fg from 'fast-glob'
import { x } from 'tar'
import { Open } from 'unzipper'

export interface SdkExtractOptions {
  onProgress?: (e: OnExtractProgressEvent) => void | Promise<void>
}

export interface OnExtractProgressEvent {
  /** The progress of the vscode progress. */
  progress: number
  /** The increment of the vscode progress. */
  increment: number
  /** The name of the sub package. */
  subPackageName: string
}

export class SdkUnzipper {
  constructor(private readonly urlSelector: SdkUrlSelector) {}

  private async unzipRoot(cacheFilePath: string, version: SdkVersion): Promise<string> {
    const dest = path.join(path.dirname(cacheFilePath), `.extracted`, version.toString())
    if (!fs.existsSync(dest))
      fs.mkdirSync(dest, { recursive: true })
    await x({
      file: cacheFilePath,
      cwd: dest,
      onReadEntry: entry => this.urlSelector.getConsola().info(`Extracting ${entry.path}...`),
    })
    this.urlSelector.getConsola().info(`SDK root package ${version} extracted to ${dest}, start extracting sub packages...`)
    return dest
  }

  private async unzipSubPackages(unzipRoot: string, targetPath: string, options: SdkExtractOptions = {}): Promise<void> {
    const zipFiles = fg.sync(path.join(unzipRoot, '**', '*.zip'), {
      absolute: true,
      onlyFiles: true,
    })

    // Calculate the full progress of the unzip process.
    const subPackageProgresses = new Map<string, number>()
    let lastTotalProgress = 0

    const onProgressCallback: SdkExtractOptions['onProgress'] = ({ progress, subPackageName }) => {
      // 更新当前子包的进度
      subPackageProgresses.set(subPackageName, progress)

      // 计算所有子包的总进度
      const totalProgress = Array.from(subPackageProgresses.values()).reduce((sum, p) => sum + p, 0)
      const currentTotalProgress = Math.round(totalProgress / 5)

      // 计算总进度的增量
      const totalIncrement = currentTotalProgress - lastTotalProgress
      lastTotalProgress = currentTotalProgress

      // 只有当总进度实际增长时才报告
      if (totalIncrement > 0) {
        options.onProgress?.({ progress: currentTotalProgress, increment: totalIncrement, subPackageName })
        this.urlSelector.getConsola().info(`Extracting sub package ${subPackageName}, API ${path.basename(unzipRoot)}... ${currentTotalProgress}%`)
      }
    }

    // Using Promise.all to unzip the sub packages in `parallel` to speed up the process.
    await Promise.all(
      zipFiles.map(async (zipFilePath) => {
        const fileName = path.basename(zipFilePath)

        if (fileName.includes('ets')) {
          await this.unzipSubPackage(zipFilePath, path.join(targetPath, 'ets'), {
            onProgress: onProgressCallback,
          })
        }
        else if (fileName.includes('js')) {
          await this.unzipSubPackage(zipFilePath, path.join(targetPath, 'js'), {
            onProgress: onProgressCallback,
          })
        }
        else if (fileName.includes('native')) {
          await this.unzipSubPackage(zipFilePath, path.join(targetPath, 'native'), {
            onProgress: onProgressCallback,
          })
        }
        else if (fileName.includes('previewer')) {
          await this.unzipSubPackage(zipFilePath, path.join(targetPath, 'previewer'), {
            onProgress: onProgressCallback,
          })
        }
        else if (fileName.includes('toolchains')) {
          await this.unzipSubPackage(zipFilePath, path.join(targetPath, 'toolchains'), {
            onProgress: onProgressCallback,
          })
        }
      }),
    )
  }

  private async unzipSubPackage(zipFilePath: string, dest: string, options: SdkExtractOptions = {}): Promise<void> {
    const directory = await Open.file(zipFilePath)
    const files = directory.files
    const subPackageName = path.basename(dest)

    let extracted = 0
    let lastProgress = 0

    await Promise.all(
      files.map(async (file) => {
        // Remove the first element of the path, which is the name of the sub package.
        file.path = file.path.split(path.sep).slice(1).join(path.sep)
        const filePath = path.join(dest, file.path)
        await this.urlSelector.createDirectoryIfNotExists(path.dirname(filePath))

        const writeStream = fs.createWriteStream(filePath)
        await new Promise<void>((resolve, reject) => (
          file.stream()
            .pipe(writeStream)
            .on('finish', () => {
              extracted++
              const progress = Math.round((extracted / files.length) * 100)
              const increment = progress - lastProgress

              // 只有当子包进度实际增长时才报告
              if (increment > 0) {
                lastProgress = progress
                options.onProgress?.({ progress, increment, subPackageName })
              }
              this.urlSelector.getConsola().info(`Extracting ${path.relative(dest, filePath)}...`)
              resolve()
            })
            .on('error', reject)
        ))
      }),
    )

    this.urlSelector.getConsola().success(`Extracting sub package ${path.basename(dest)} completed.`)
  }

  /**
   * Starting unzip the downloaded SDK tar.gz file.
   *
   * @param cacheFilePath - The path to the downloaded SDK tar.gz file.
   * @param version - The version of the SDK.
   * @param targetPath - The target path to install the SDK.
   */
  async unzip(cacheFilePath: string, version: SdkVersion, targetPath: string, options: SdkExtractOptions = {}): Promise<void> {
    try {
      await this.urlSelector.createDirectoryIfNotExists(targetPath)
      await this.urlSelector.createDirectoryIfNotExists(path.join(targetPath, 'ets'))
      await this.urlSelector.createDirectoryIfNotExists(path.join(targetPath, 'js'))
      await this.urlSelector.createDirectoryIfNotExists(path.join(targetPath, 'native'))
      await this.urlSelector.createDirectoryIfNotExists(path.join(targetPath, 'previewer'))
      await this.urlSelector.createDirectoryIfNotExists(path.join(targetPath, 'toolchains'))

      const unzipRoot = await this.unzipRoot(cacheFilePath, version)
      await this.unzipSubPackages(unzipRoot, targetPath, options)
    }
    catch (error) {
      this.urlSelector.getConsola().error(`Failed to unzip the SDK ${version}, error: ${error}`)
      // throw error
    }
  }
}
