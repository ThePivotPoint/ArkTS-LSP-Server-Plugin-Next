import type * as vscode from 'vscode'
import type { DownloadOptions } from './sdk-downloader'
import process from 'node:process'
import { SdkDownloader } from './sdk-downloader'
import { SdkInstallerException } from './sdk-installer-exception'

export interface SdkURL {
  m1macOS: string
  x86macOS: string
  windowsLinux: string
  openHarmonyVersion: string
  isDownloading: boolean
  isExtracting: boolean
}

/** The options for the SDK installation. */
export interface SdkInstallOptions extends DownloadOptions {
  /** The target path to install the SDK. */
  targetPath: string
}

export type SdkVersion = 10 | 11 | 12 | 13 | 14 | 15 | 18
export type SdkArch = 'm1macOS' | 'x86macOS' | 'windowsLinux'

export abstract class SdkUrlSelector extends SdkDownloader {
  static readonly sdkUrls: Record<string, SdkURL> = {
    10: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/4.0-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/4.0-Release/ohos-sdk-mac-public.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/4.0-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '4.0.0',
      isDownloading: false,
      isExtracting: false,
    },
    11: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/4.1-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/4.1-Release/ohos-sdk-mac-public-signed.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/4.1-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '4.1.0',
      isDownloading: false,
      isExtracting: false,
    },
    12: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.0-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.0-Release/ohos-sdk-mac-public.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.0-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '5.0.0',
      isDownloading: false,
      isExtracting: false,
    },
    13: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.1-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.1-Release/ohos-sdk-mac-public.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.1-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '5.0.1',
      isDownloading: false,
      isExtracting: false,
    },
    14: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.2-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.2-Release/ohos-sdk-mac-public.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.2-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '5.0.2',
      isDownloading: false,
      isExtracting: false,
    },
    15: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.3-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.3-Release/ohos-sdk-mac-public.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.3-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '5.0.3',
      isDownloading: false,
      isExtracting: false,
    },
    18: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.1.0-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.1.0-Release/ohos-sdk-mac-public.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/5.1.0-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '5.1.0',
      isDownloading: false,
      isExtracting: false,
    },
  }

  /**
   * Check if the SDK is downloading.
   *
   * @param version - The version of the SDK to check the downloading status for.
   * @returns The downloading status of the SDK.
   */
  isDownloading(version: SdkVersion): boolean {
    return SdkUrlSelector.sdkUrls[version].isDownloading
  }

  /**
   * Set the downloading status of the SDK.
   *
   * @param version - The version of the SDK to set the downloading status for.
   * @param isDownloading - The downloading status to set.
   * @returns The current instance.
   */
  setDownloading(version: SdkVersion, isDownloading: boolean): this {
    SdkUrlSelector.sdkUrls[version].isDownloading = isDownloading
    return this
  }

  /**
   * Check if the SDK is extracting.
   *
   * @param version - The version of the SDK to check the extracting status for.
   * @returns The extracting status of the SDK.
   */
  isExtracting(version: SdkVersion): boolean {
    return SdkUrlSelector.sdkUrls[version].isExtracting
  }

  /**
   * Set the extracting status of the SDK.
   *
   * @param version - The version of the SDK to set the extracting status for.
   * @param isExtracting - The extracting status to set.
   * @returns The current instance.
   */
  setExtracting(version: SdkVersion, isExtracting: boolean): this {
    SdkUrlSelector.sdkUrls[version].isExtracting = isExtracting
    return this
  }

  /**
   * Convert the SDK urls to the quick pick items.
   *
   * @returns The quick pick items.
   */
  toQuickPickItem(): vscode.QuickPickItem[] {
    const keys = Object.keys(SdkUrlSelector.sdkUrls) as `${SdkVersion}`[]
    return keys.map((version) => {
      return {
        label: `API ${version}`,
        description: `OpenHarmony API ${version}`,
        detail: `OpenHarmony ${SdkUrlSelector.sdkUrls[version].openHarmonyVersion} Release`,
      } satisfies vscode.QuickPickItem
    })
  }

  /**
   * Convert the API version label to the API version.
   *
   * @param apiVersionLabel - The API version label to convert.
   * @returns The API version.
   */
  toApiVersion(apiVersionLabel: `API ${SdkVersion}`): SdkVersion
  toApiVersion(apiVersionLabel: string): SdkVersion
  toApiVersion(apiVersionLabel: `API ${SdkVersion}`): SdkVersion {
    return Number(apiVersionLabel.split(' ')[1]) as SdkVersion
  }

  /**
   * Get the current SDK arch.
   *
   * @returns The current SDK arch.
   */
  getCurrentSdkArch(): SdkArch | undefined {
    const arch = process.arch
    const os = process.platform

    if (os === 'darwin' && (arch === 'arm64' || arch === 'arm')) {
      return 'm1macOS'
    }

    if (os === 'darwin' && arch === 'x64') {
      return 'x86macOS'
    }

    if (os === 'win32' || os === 'linux') {
      return 'windowsLinux'
    }
  }

  /**
   * Get the current SDK url.
   *
   * @param version - The version of the SDK to get the url for.
   * @returns The url of the SDK.
   */
  getCurrentSdkUrl(version: SdkVersion): string {
    const arch = this.getCurrentSdkArch()
    if (!arch)
      throw new SdkInstallerException(SdkInstallerException.Code.SDKArchNotFound, 'Current arch/os not supported.')
    const url = SdkUrlSelector.sdkUrls[version][arch]
    if (!url)
      throw new SdkInstallerException(SdkInstallerException.Code.SDKVersionNotFound, `SDK version ${version} not found.`)
    return url
  }
}
