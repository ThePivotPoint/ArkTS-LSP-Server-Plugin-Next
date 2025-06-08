import type { Translator } from '../translate'
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
}
