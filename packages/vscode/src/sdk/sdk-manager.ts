import type { Translator } from '../translate'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as vscode from 'vscode'
import { SdkInstaller } from './sdk-installer'
import { SdkVersion } from '@arkts/sdk-downloader'
import * as json5 from 'json5'

type IsInstalledVersion = keyof typeof SdkVersion extends `API${infer N}` ? N : never

export class SdkManager extends SdkInstaller {
  public static from(translator: Translator): SdkManager {
    return new SdkManager(translator)
  }

  private constructor(protected readonly translator: Translator) {
    super(translator)
    this.guessOhosSdkVersion()
  }

  private async guessOhosSdkVersion(): Promise<keyof typeof SdkVersion | undefined> {
    const guessedOhosSdkVersion = this.getGuessedOhosSdkVersion()
    if (!guessedOhosSdkVersion)
      return
    const [sdkStringVersion, sdkNumberVersion] = guessedOhosSdkVersion
    const currentSdkPath = await this.getOhosSdkPath()

    // Check if the current SDK is the same as the guessed SDK.
    if (currentSdkPath) {
      const ohUniPackageJsonPath = path.resolve(currentSdkPath, 'js', 'oh-uni-package.json')
      if (fs.existsSync(ohUniPackageJsonPath)) {
        const ohUniPackageJson = JSON.parse(fs.readFileSync(ohUniPackageJsonPath, 'utf-8'))
        const compileSdkVersion: string = ohUniPackageJson?.apiVersion || ''
        if (compileSdkVersion === String(sdkNumberVersion))
          return
      }
    }

    // Check if the guessed SDK is installed.
    const isInstalled = await this.isInstalled(sdkNumberVersion.toString())
    if (isInstalled) {
      const choiceYes = this.translator.t('sdk.guess.switch.yes')
      const choiceNo = this.translator.t('sdk.guess.switch.no')
      const result = await vscode.window.showInformationMessage(
        this.translator.t('sdk.guess.switch.title', { args: [sdkStringVersion] }),
        choiceYes,
        choiceNo,
      )
      if (result === choiceYes) {
        await this.setOhosSdkPath(path.join(await this.getOhosSdkBasePath(), sdkNumberVersion.toString()))
        vscode.window.showInformationMessage(this.translator.t('sdk.guess.switch.success', { args: [sdkStringVersion] }))
      }
    }
    else {
      const choiceYes = this.translator.t('sdk.guess.install.yes')
      const choiceNo = this.translator.t('sdk.guess.install.no')
      const result = await vscode.window.showInformationMessage(
        this.translator.t('sdk.guess.install.title', { args: [sdkStringVersion] }),
        choiceYes,
        choiceNo,
      )
      if (result === choiceYes)
        await this.installSdk(sdkStringVersion)
    }
  }

  /** Guess the OpenHarmony SDK version from the current workspace's build-profile.json5 file. */
  getGuessedOhosSdkVersion(): [keyof typeof SdkVersion, number] | undefined {
    const currentWorkspaceDir = this.getCurrentWorkspaceDir()
    if (!currentWorkspaceDir)
      return

    const buildProfileFilePath = vscode.Uri.joinPath(currentWorkspaceDir, 'build-profile.json5')
    if (!fs.existsSync(buildProfileFilePath.fsPath) || !fs.statSync(buildProfileFilePath.fsPath).isFile())
      return

    try {
      const buildProfile = json5.parse(fs.readFileSync(buildProfileFilePath.fsPath, 'utf-8'))
      const sdkVersion = buildProfile?.app?.products?.[0]?.compileSdkVersion
      if (!sdkVersion || typeof sdkVersion !== 'number')
        return

      if (sdkVersion === 10)
        return ['API10', 10]
      else if (sdkVersion === 11)
        return ['API11', 11]
      else if (sdkVersion === 12)
        return ['API12', 12]
      else if (sdkVersion === 13)
        return ['API13', 13]
      else if (sdkVersion === 14)
        return ['API14', 14]
      else if (sdkVersion === 15)
        return ['API15', 15]
      else if (sdkVersion === 18)
        return ['API18', 18]
    } catch (error) {
      this.getConsola().error(error)
      this.getConsola().error(`Failed to parse build-profile.json5: ${buildProfileFilePath.fsPath}`)
      return
    }
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
