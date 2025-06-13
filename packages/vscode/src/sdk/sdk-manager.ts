import type { Translator } from '../translate'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as vscode from 'vscode'
import { SdkInstaller } from './sdk-installer'

export class SdkManager extends SdkInstaller {
  public static from(translator: Translator): SdkManager {
    return new SdkManager(translator)
  }

  private constructor(translator: Translator) {
    super(translator)
  }

  async setOhosSdkPath(sdkFolderPath: string): Promise<void> {
    await vscode.workspace.getConfiguration('ets')
      .update('sdkPath', sdkFolderPath, vscode.ConfigurationTarget.Global)
  }

  async getOhosSdkBasePath(): Promise<string> {
    const baseSdkPath = vscode.workspace.getConfiguration('ets').get(
      'baseSdkPath',
      // eslint-disable-next-line no-template-curly-in-string
      '${os.homedir}/OpenHarmony',
    ) as string

    return baseSdkPath.replace(/\$\{os\.homedir\}/g, os.homedir())
  }

  async getOhosSdkPath(): Promise<string | undefined> {
    return vscode.workspace.getConfiguration('ets')
      .get('sdkPath') as string | undefined
  }

  async isInstalled(version: string): Promise<boolean | 'incomplete'> {
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
