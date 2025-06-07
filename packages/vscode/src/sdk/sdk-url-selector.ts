import type { AxiosResponse, GenericAbortSignal } from 'axios'
import type * as vscode from 'vscode'
import process from 'node:process'
import { ExtensionLogger } from '@arkts/shared/vscode'
import { SdkInstallerException } from './sdk-installer-exception'

export interface SdkURL {
  m1macOS: string
  x86macOS: string
  windowsLinux: string
  openHarmonyVersion: string
  isDownloading: boolean
}

export interface SdkDownloadProgressEvent {
  currentProgress: number
  increment: number
  speed: string
}

export interface SdkInstallOptions {
  signal?: GenericAbortSignal
  onProgress?: (event: SdkDownloadProgressEvent) => void | Promise<void>
  cacheFilePath: string
}

export type SdkVersion = 10 | 11 | 12 | 13 | 14 | 15 | 18
export type SdkArch = 'm1macOS' | 'x86macOS' | 'windowsLinux'

export abstract class SdkUrlSelector extends ExtensionLogger {
  static readonly sdkUrls: Record<string, SdkURL> = {
    10: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/4.0-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/4.0-Release/ohos-sdk-mac-public.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/4.0-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '4.0.0',
      isDownloading: false,
    },
    11: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/4.1-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/4.1-Release/ohos-sdk-mac-public-signed.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/4.1-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '4.1.0',
      isDownloading: false,
    },
    12: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.0-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.0-Release/ohos-sdk-mac-public.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.0-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '5.0.0',
      isDownloading: false,
    },
    13: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.1-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.1-Release/ohos-sdk-mac-public.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.1-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '5.0.1',
      isDownloading: false,
    },
    14: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.2-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.2-Release/ohos-sdk-mac-public.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.2-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '5.0.2',
      isDownloading: false,
    },
    15: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.3-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.3-Release/ohos-sdk-mac-public.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/5.0.3-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '5.0.3',
      isDownloading: false,
    },
    18: {
      m1macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.1.0-Release/L2-SDK-MAC-M1-PUBLIC.tar.gz',
      x86macOS: 'https://mirrors.huaweicloud.com/harmonyos/os/5.1.0-Release/ohos-sdk-mac-public.tar.gz',
      windowsLinux: 'https://mirrors.huaweicloud.com/harmonyos/os/5.1.0-Release/ohos-sdk-windows_linux-public.tar.gz',
      openHarmonyVersion: '5.1.0',
      isDownloading: false,
    },
  }

  isDownloading(version: SdkVersion): boolean {
    return SdkUrlSelector.sdkUrls[version].isDownloading
  }

  setDownloading(version: SdkVersion, isDownloading: boolean): this {
    SdkUrlSelector.sdkUrls[version].isDownloading = isDownloading
    return this
  }

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

  toApiVersion(apiVersionLabel: `API ${SdkVersion}`): SdkVersion
  toApiVersion(apiVersionLabel: string): SdkVersion
  toApiVersion(apiVersionLabel: `API ${SdkVersion}`): SdkVersion {
    return Number(apiVersionLabel.split(' ')[1]) as SdkVersion
  }

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

  getCurrentSdkUrl(version: SdkVersion): string {
    const arch = this.getCurrentSdkArch()
    if (!arch)
      throw new SdkInstallerException(SdkInstallerException.Code.SDKArchNotFound, 'Current arch/os not supported.')
    const url = SdkUrlSelector.sdkUrls[version][arch]
    if (!url)
      throw new SdkInstallerException(SdkInstallerException.Code.SDKVersionNotFound, `SDK version ${version} not found.`)
    return url
  }

  /**
   * Install the selected SDK.
   *
   * @param version - The version of the SDK to install
   * @param options - The options for the installation
   * @returns A promise that resolves when the installation is complete
   */
  abstract install(version: SdkVersion, options: SdkInstallOptions): Promise<void>

  /**
   * Write the downloaded SDK to the disk.
   *
   * @param filePath - The path to the downloaded SDK tar.gz file.
   * @param res - The axios response from the server.
   */
  abstract writeToDisk(filePath: string, res: AxiosResponse<import('stream').Readable>): Promise<void>
}
