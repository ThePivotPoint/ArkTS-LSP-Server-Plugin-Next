import type { Translator } from '../translate'
import path from 'node:path'
import { download, DownloadError, getSdkUrl, getSdkUrls, SdkVersion as SdkVersionEnum } from '@arkts/sdk-downloader'
import { useCommand } from 'reactive-vscode'
import * as vscode from 'vscode'
import { SdkUrlSelector } from './sdk-url-selector'

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

  protected constructor(private readonly translator: Translator) {
    super()
    useCommand('ets.installSDK', async () => await this.selectSdkToInstall())
  }

  private buildQuickPickItem(urls: ReturnType<typeof getSdkUrls>): vscode.QuickPickItem[] {
    return Object.entries(urls).map(([openHarmonyVersion]) => {
      const apiVersion = Object.keys(SdkVersionEnum).find(key => SdkVersionEnum[key as keyof typeof SdkVersionEnum] === openHarmonyVersion) as keyof typeof SdkVersionEnum
      return {
        label: apiVersion,
        description: `OpenHarmony ${apiVersion} Release`,
        detail: `OpenHarmony ${SdkVersionEnum[apiVersion as keyof typeof SdkVersionEnum]} Release`,
      } satisfies vscode.QuickPickItem
    })
  }

  private async selectSdkToInstall(): Promise<void> {
    const urls = getSdkUrls()
    const version = await vscode.window.showQuickPick(this.buildQuickPickItem(urls), {
      canPickMany: false,
      title: this.translator.t('sdk.install.title'),
      placeHolder: this.translator.t('sdk.install.placeHolder'),
    })

    if (!version || !version.label)
      return
    const currentSdkVersion = version.label as keyof typeof SdkVersionEnum
    const baseSdkPath = await this.getOhosSdkBasePath()

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: this.translator.t('sdk.install.installing', { args: [version.label] }),
      cancellable: true,
    }, async (progress, token) => {
      if (token.isCancellationRequested)
        return

      try {
        const apiNumberVersion = currentSdkVersion.toString().split('API')[1]
        console.warn(`Arch: ${this.getArch()}, OS: ${this.getOs()}, version: ${SdkVersionEnum[currentSdkVersion]}, ${currentSdkVersion}`)

        const url = getSdkUrl(SdkVersionEnum[currentSdkVersion], this.getArch(), this.getOs())
        if (!url)
          throw new Error('Current SDK version is not supported by the current platform.')
        await download({
          url,
          cacheDir: path.join(baseSdkPath, '.tmp', apiNumberVersion),
          targetDir: path.join(baseSdkPath, apiNumberVersion),
          resumeDownload: true,
          clean: true,
          onDownloadProgress: (e) => {
            progress.report({
              increment: e.increment,
              message: `${e.percentage.toFixed(2)}% ${e.network.toFixed(2)}${e.unit}/s`,
            })
            this.getConsola().info(`Downloading SDK ${apiNumberVersion}: ${e.percentage.toFixed(2)}% ${e.network.toFixed(2)}${e.unit}/s`)
          },
          onTarExtracted: (e) => {
            progress.report({
              message: this.translator.t('sdk.install.extractingTar', { args: [e.path] }),
            })
            this.getConsola().info(`Extracting tar.gz API ${apiNumberVersion}: ${e.path}`)
          },
          onZipExtracted: (e) => {
            progress.report({
              message: this.translator.t('sdk.install.extractingZip', { args: [e.path] }),
            })
            this.getConsola().info(`Extracting zip API ${apiNumberVersion}: ${e.path}`)
          },
        })
      }
      catch (error) {
        if (error instanceof DownloadError) {
          vscode.window.showErrorMessage(`下载错误: ${error.code} ${error.message}`)
        }
        else {
          vscode.window.showErrorMessage(`下载错误: ${(error && typeof error === 'object' && 'message' in error) ? error.message : '未知错误'}`)
        }
        console.error(error)
        throw error
      }
    })

    vscode.window.showInformationMessage(this.translator.t('sdk.install.success', { args: [version.label] }))
  }
}
