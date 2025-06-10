import type { Translator } from '../translate'
import os from 'node:os'
import * as vscode from 'vscode'
import { SdkInstaller } from './sdk-installer'

export class SdkManager extends SdkInstaller {
  public static from(translator: Translator): SdkManager {
    return new SdkManager(translator)
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
}
