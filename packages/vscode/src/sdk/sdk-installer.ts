import type { AxiosResponse } from 'axios'
import type { Translator } from '../translate'
import type { DownloadResponse, UnzipDownloadedOptions } from './sdk-downloader'
import type { SdkInstallOptions, SdkVersion } from './sdk-url-selector'
import fs from 'node:fs'
import path from 'node:path'
import { useCommand } from 'reactive-vscode'
import * as vscode from 'vscode'
import { SdkUnzipper } from './sdk-unzipper'
import { SdkUrlSelector } from './sdk-url-selector'

export interface OnDownloadProgressEvent {
  /** The progress of the vscode progress. */
  progress: vscode.Progress<{ increment: number, message: string }>
  /** Cancellation token for the vscode progress. */
  token: vscode.CancellationToken
  /** The selection label (human readable) of the SDK. */
  label: string
  /** The path to the cache file path. */
  cacheFilePath: string
  /** The API version of the SDK. */
  apiVersion: SdkVersion
  /** The target folder path to install the SDK. */
  targetPath: string
}

export interface OnExtractProgressEvent extends SdkInstallOptions {
  /** The progress of the vscode progress. */
  progress: vscode.Progress<{ increment: number, message: string }>
  /** Cancellation token for the vscode progress. */
  token: vscode.CancellationToken
  /** The API version of the SDK. */
  apiVersion: SdkVersion
  /** The download response. */
  response: DownloadResponse
}

export abstract class SdkInstaller extends SdkUrlSelector {
  /**
   * Set the path to the OpenHarmony SDK.
   *
   * @param sdkFolderPath - The path to the OpenHarmony SDK.
   */
  abstract setOhosSdkPath(sdkFolderPath: string): Promise<void>

  /**
   * Get the base path of the OpenHarmony SDK.
   *
   * @returns The base path of the OpenHarmony SDK.
   */
  abstract getOhosSdkBasePath(): Promise<string>

  private readonly unzipper = new SdkUnzipper(this)

  protected constructor(private readonly translator: Translator) {
    super()
    useCommand('ets.installSDK', async () => await this.selectSdkToInstall())
  }

  private async onDownloadProgress(e: OnDownloadProgressEvent): Promise<DownloadResponse | undefined> {
    if (e.token.isCancellationRequested)
      return

    if (this.isDownloading(e.apiVersion) || this.isExtracting(e.apiVersion)) {
      vscode.window.showWarningMessage(this.translator.t('sdk.install.alreadyDownloading', { args: [e.label] }))
      return
    }

    this.setDownloading(e.apiVersion, true)
    const controller = new AbortController()
    e.token.onCancellationRequested(() => {
      controller.abort()
      vscode.window.showInformationMessage(this.translator.t('sdk.install.cancelled', { args: [e.label] }))
      this.setDownloading(e.apiVersion, false)
    })

    try {
      const downloadResponse = await this.install(e.apiVersion, {
        signal: controller.signal,
        onProgress: ({ currentProgress, increment, speed }) => e.progress.report({
          increment,
          message: `${currentProgress}% ${speed}`,
        }),
        cacheFilePath: e.cacheFilePath,
        targetPath: e.targetPath,
      })
      return downloadResponse
    }
    finally {
      this.setDownloading(e.apiVersion, false)
    }
  }

  private async onExtractProgress(e: OnExtractProgressEvent): Promise<void> {
    if (e.token.isCancellationRequested)
      return

    if (this.isDownloading(e.apiVersion) || this.isExtracting(e.apiVersion)) {
      vscode.window.showWarningMessage(this.translator.t('sdk.install.alreadyDownloading', { args: [e.apiVersion] }))
      return
    }

    this.setExtracting(e.apiVersion, true)

    await this.unzipDownloaded({
      ...e,
      version: e.apiVersion,
      onProgress: ({ increment, progress, subPackageName }) => (
        e.progress.report({
          increment,
          message: this.translator.t('sdk.install.extractingProgress', {
            args: [
              e.apiVersion.toString(),
              subPackageName,
              progress.toString(),
            ],
          }),
        })
      ),
    }).finally(() => this.setExtracting(e.apiVersion, false))
  }

  private async selectSdkToInstall(): Promise<void> {
    const version = await vscode.window.showQuickPick(this.toQuickPickItem(), {
      canPickMany: false,
      title: this.translator.t('sdk.install.title'),
      placeHolder: this.translator.t('sdk.install.placeHolder'),
    })

    if (!version || !version.label)
      return
    const apiVersion = this.toApiVersion(version.label)
    const baseSdkPath = await this.getOhosSdkBasePath()
    const cacheFilePath = path.join(baseSdkPath, `.tmp`, `${apiVersion}.tar.gz`)
    const targetPath = path.join(baseSdkPath, apiVersion.toString())
    let downloadResponse: DownloadResponse | undefined

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: this.translator.t('sdk.install.installing', { args: [version.label] }),
      cancellable: true,
    }, async (progress, token) => {
      downloadResponse = await this.onDownloadProgress({
        progress,
        token,
        label: version.label,
        cacheFilePath,
        apiVersion,
        targetPath,
      })
    })

    if (downloadResponse) {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: this.translator.t('sdk.install.extracting', { args: [version.label] }),
      }, (progress, token) => this.onExtractProgress({
        apiVersion,
        response: downloadResponse!,
        progress,
        token,
        targetPath,
        cacheFilePath,
      }))
    }

    vscode.window.showInformationMessage(this.translator.t('sdk.install.success', { args: [version.label] }))
    await this.setOhosSdkPath(targetPath)
  }

  writeToDisk(filePath: string, res: AxiosResponse<import('stream').Readable>, append: boolean = false): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.getConsola().info(`SDK download success, start writing to ${filePath}`)
      const file = fs.createWriteStream(filePath, { flags: append ? 'a' : 'w' })
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

  async install(version: SdkVersion, options: SdkInstallOptions): Promise<DownloadResponse> {
    const url = this.getCurrentSdkUrl(version)
    this.getConsola().info(`Downloading OpenHarmony SDK API ${version} from ${url}`)

    const downloadResponse = await super.download(url, {
      cacheFilePath: options.cacheFilePath,
      onProgress: (e) => {
        options.onProgress?.(e)
        this.getConsola().info(`Downloading OpenHarmony SDK ${version} ${e.progress}%`)
      },
    })

    if (!fs.existsSync(path.dirname(options.cacheFilePath)))
      fs.mkdirSync(path.dirname(options.cacheFilePath), { recursive: true })

    if (downloadResponse.type === 'success') {
      await this.writeToDisk(options.cacheFilePath, downloadResponse.response, downloadResponse.startByte > 0)
    }

    return downloadResponse
  }

  async unzipDownloaded(options: UnzipDownloadedOptions): Promise<void> {
    if (options.response.type === 'success') {
      await this.unzipper.unzip(options.cacheFilePath, options.version, options.targetPath, options)
    }
    else if (options.response.type === 'finish') {
      this.getConsola().success(`SDK download already completed, skip downloading...`)
      await this.unzipper.unzip(options.cacheFilePath, options.version, options.targetPath, options)
    }
  }
}
