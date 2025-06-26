import type { SdkVersion } from '@arkts/sdk-downloader'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Service } from 'unioc'
import * as vscode from 'vscode'
import { Environment } from '../environment'

type IsInstalledVersion = keyof typeof SdkVersion extends `API${infer N}` ? N : never

@Service
export class SdkManager extends Environment {
  /**
   * Set the path to the OpenHarmony SDK.
   *
   * @param sdkFolderPath - The path to the OpenHarmony SDK.
   */
  async setOhosSdkPath(sdkFolderPath: string): Promise<void> {
    await vscode.workspace.getConfiguration('ets')
      .update('sdkPath', sdkFolderPath, vscode.ConfigurationTarget.Global)
  }

  /**
   * Get the base path of the OpenHarmony SDK.
   *
   * @returns The base path of the OpenHarmony SDK.
   */
  async getOhosSdkBasePath(): Promise<string> {
    const baseSdkPath = vscode.workspace.getConfiguration('ets').get(
      'baseSdkPath',
      // eslint-disable-next-line no-template-curly-in-string
      '${os.homedir}/OpenHarmony',
    ) as string

    return baseSdkPath.replace(/\$\{os\.homedir\}/g, os.homedir())
  }

  /**
   * Get the path of the OpenHarmony SDK.
   *
   * @returns The path of the OpenHarmony SDK.
   */
  async getOhosSdkPath(): Promise<string | undefined> {
    return vscode.workspace.getConfiguration('ets')
      .get('sdkPath') as string | undefined
  }

  /**
   * Check if the SDK is installed.
   *
   * @param version - The version of the SDK.
   * @returns `true` if the SDK is installed, `false` if the SDK is not installed, `'incomplete'` if the SDK is installed but is incomplete.
   */
  async isInstalled(version: IsInstalledVersion | (string & {})): Promise<boolean | 'incomplete'> {
    const sdkPath = path.join(await this.getOhosSdkBasePath(), version)
    const haveFolder = fs.existsSync(sdkPath) && fs.statSync(sdkPath).isDirectory()
    if (!haveFolder)
      return false

    const dirs = fs.readdirSync(sdkPath)
    if (
      !dirs.includes('ets')
      || !dirs.includes('js')
      || !dirs.includes('native')
      || !dirs.includes('previewer')
      || !dirs.includes('toolchains')
    ) {
      return 'incomplete'
    }

    return true
  }
}
