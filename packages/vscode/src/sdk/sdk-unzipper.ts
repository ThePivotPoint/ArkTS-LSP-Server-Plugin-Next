import type { SdkUrlSelector, SdkVersion } from './sdk-url-selector'
import fs from 'node:fs'
import path from 'node:path'
import extract from 'extract-zip'
import fg from 'fast-glob'
import { x } from 'tar'

export class SdkUnzipper {
  constructor(private readonly urlSelector: SdkUrlSelector) {}

  private async unzipRoot(filePath: string, version: SdkVersion): Promise<string> {
    const dest = path.join(filePath, `.extracted`, version.toString())
    if (!fs.existsSync(dest))
      fs.mkdirSync(dest, { recursive: true })
    await x({ file: filePath, cwd: dest })
    this.urlSelector.getConsola().info(`SDK root package ${version} extracted to ${dest}, start extracting sub packages...`)
    return dest
  }

  private async unzipSubPackages(unzipRoot: string): Promise<void> {
    const zipFiles = fg.sync(path.join(unzipRoot, '**', '*.zip'), {
      absolute: true,
      onlyFiles: true,
    })

    // Using Promise.all to unzip the sub packages in `parallel` to speed up the process.
    await Promise.all(
      zipFiles.map(async (zipFilePath) => {
        const fileName = path.basename(zipFilePath)

        if (fileName.includes('ets')) {
          await this.unzipSubPackage(zipFilePath, path.join(unzipRoot, 'ets'))
        }
        else if (fileName.includes('js')) {
          await this.unzipSubPackage(zipFilePath, path.join(unzipRoot, 'js'))
        }
        else if (fileName.includes('native')) {
          await this.unzipSubPackage(zipFilePath, path.join(unzipRoot, 'native'))
        }
        else if (fileName.includes('previewer')) {
          await this.unzipSubPackage(zipFilePath, path.join(unzipRoot, 'previewer'))
        }
        else if (fileName.includes('toolchains')) {
          await this.unzipSubPackage(zipFilePath, path.join(unzipRoot, 'toolchains'))
        }
      }),
    )
  }

  private async unzipSubPackage(zipFilePath: string, dest: string): Promise<void> {
    await extract(zipFilePath, { dir: dest })
  }

  /**
   * Starting unzip the downloaded SDK tar.gz file.
   *
   * @param filePath - The path to the downloaded SDK tar.gz file.
   * @param version - The version of the SDK.
   */
  async unzip(filePath: string, version: SdkVersion): Promise<void> {
    const dest = await this.unzipRoot(filePath, version)
    await this.unzipSubPackages(dest)
  }
}
