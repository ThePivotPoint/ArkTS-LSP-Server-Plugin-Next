import type { AxiosProgressEvent, AxiosResponse } from 'axios'
import type { SdkInstallOptions, SdkVersion } from './sdk-url-selector'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import axios from 'axios'
import { useCommand } from 'reactive-vscode'
import * as vscode from 'vscode'
import { SdkUnzipper } from './sdk-unzipper'
import { SdkUrlSelector } from './sdk-url-selector'
import { Translator } from '../translate'

export interface OnDownloadProgressEvent {
  progress: vscode.Progress<{ increment: number, message: string }>
  token: vscode.CancellationToken
  label: string
  cacheFilePath: string
  apiVersion: SdkVersion
}

export class SdkInstaller extends SdkUrlSelector {
  private readonly unzipper = new SdkUnzipper(this)

  private async onDownloadProgress(e: OnDownloadProgressEvent): Promise<void> {
    if (e.token.isCancellationRequested)
      return

    if (this.isDownloading(e.apiVersion)) {
      vscode.window.showWarningMessage(this.translator.t('sdk.install.alreadyDownloading', { args: [e.label] }))
      return
    }

    this.setDownloading(e.apiVersion, true)
    const controller = new AbortController()
    e.token.onCancellationRequested(() => {
      controller.abort()
      vscode.window.showInformationMessage(this.translator.t('sdk.install.cancelled', { args: [e.label] }))
      fs.rmSync(e.cacheFilePath, { force: true })
    })

    await this.install(e.apiVersion, {
      signal: controller.signal,
      onProgress: ({ currentProgress, increment, speed }) => e.progress.report({
        increment,
        message: `${currentProgress}% ${speed}`,
      }),
      cacheFilePath: e.cacheFilePath,
    })
    vscode.window.showInformationMessage(this.translator.t('sdk.install.success', { args: [e.label] }))
  }

  public static from(translator: Translator): SdkInstaller {
    return new SdkInstaller(translator)
  }

  constructor(private readonly translator: Translator) {
    super()

    useCommand('ets.installSDK', async () => {
      const version = await vscode.window.showQuickPick(this.toQuickPickItem(), {
        canPickMany: false,
        title: this.translator.t('sdk.install.title'),
        placeHolder: this.translator.t('sdk.install.placeHolder'),
      })

      if (!version || !version.label)
        return

      const apiVersion = this.toApiVersion(version.label)
      const cacheFilePath = path.join(os.homedir(), 'ohos-sdk', `.tmp`, `${apiVersion}.tar.gz`)
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: this.translator.t('sdk.install.installing', { args: [version.label] }),
        cancellable: true,
      }, (progress, token) => this.onDownloadProgress({
        progress,
        token,
        label: version.label,
        cacheFilePath,
        apiVersion,
      }))
    })
  }

  writeToDisk(filePath: string, res: AxiosResponse<import('stream').Readable>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.getConsola().info(`SDK download success, start writing to ${filePath}`)
      const file = fs.createWriteStream(filePath)
      res.data.pipe(file)
      file.on('finish', () => {
        this.getConsola().info(`SDK download success, file written to ${filePath}`)
        resolve()
      })
      file.on('error', (err) => {
        this.getConsola().error(err)
        reject(err)
      })
    })
  }

  async install(version: SdkVersion, options: SdkInstallOptions): Promise<void> {
    const url = this.getCurrentSdkUrl(version)
    this.getConsola().info(`Downloading OpenHarmony SDK API ${version} from ${url}`)

    let lastLoaded = 0
    let lastTime = Date.now()

    function getSpeed(e: AxiosProgressEvent): string {
      const currentTime = Date.now()
      const timeDiff = (currentTime - lastTime) / 1000 // 转换为秒
      const loadedDiff = e.loaded - lastLoaded
      const speed = loadedDiff / timeDiff // 字节/秒

      // 更新状态
      lastLoaded = e.loaded
      lastTime = currentTime

      // 格式化速度显示
      if (speed > 1024 * 1024)
        return `${(speed / (1024 * 1024)).toFixed(2)} MB/s`
      return `${(speed / 1024).toFixed(2)} KB/s`
    }

    let percentage = 0
    const res = await axios.get(url, {
      onDownloadProgress: (progressEvent) => {
        const speed = getSpeed(progressEvent)
        const progress = Math.round((progressEvent.loaded / (progressEvent.total ?? 0)) * 100)
        options.onProgress?.({
          currentProgress: progress,
          increment: progress - percentage,
          speed,
        })
        percentage = progress
        this.getConsola().info(`Downloading OpenHarmony SDK ${version} ${progress}%`)
      },
      responseType: 'stream',
      signal: options.signal,
    }).catch((err) => {
      this.getConsola().error(`SDK download failed.`)
      this.getConsola().error(err)
      throw err
    })

    if (!fs.existsSync(path.dirname(options.cacheFilePath)))
      fs.mkdirSync(path.dirname(options.cacheFilePath), { recursive: true })
    await this.writeToDisk(options.cacheFilePath, res)
    await this.unzipper.unzip(options.cacheFilePath, version)
  }
}
