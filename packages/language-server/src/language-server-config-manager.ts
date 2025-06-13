import { EtsServerClientOptions, LanguageServerLogger } from "@arkts/shared";
import { loadTsdkByPath } from "@volar/language-server/node";
import fs from "node:fs";
import path from "node:path";
import * as ets from 'ohos-typescript'

export class LanguageServerConfigManager {
  constructor(private readonly logger: LanguageServerLogger) {}

  private config: EtsServerClientOptions = {
    ohos: {
      sdkPath: '',
      etsComponentPath: '',
      etsLoaderConfigPath: '',
      etsLoaderPath: '',
      baseUrl: '',
      lib: [],
      typeRoots: [],
      paths: {},
    },
    typescript: {
      tsdk: '',
    },
  }

  getConfiguration(): EtsServerClientOptions {
    return this.config
  }

  setTypeScriptTsdk(tsdk: string): this {
    if (!tsdk || typeof tsdk !== 'string') {
      return this
    }
    this.logger.getConsola().info(`TSDK path changed: new: ${tsdk}, old: ${this.config.typescript.tsdk}`)
    this.config.typescript.tsdk = tsdk
    return this
  }

  private locale: string = ''
  private tsdk: ReturnType<typeof loadTsdkByPath> | undefined

  getTypeScriptTsdk(force: boolean = false): ReturnType<typeof loadTsdkByPath> {
    if (this.tsdk && !force)
      return this.tsdk
    this.tsdk = loadTsdkByPath(this.config.typescript.tsdk, this.locale)
    return this.tsdk
  }

  setSdkPath(sdkPath: string): this {
    this.logger.getConsola().info(`ohos.sdkPath changed: new: ${sdkPath}, old: ${this.config.ohos.sdkPath}`)
    this.config.ohos.sdkPath = sdkPath
    return this
  }

  setEtsComponentPath(etsComponentPath: string): this {
    this.logger.getConsola().info(`ohos.etsComponentPath changed: new: ${etsComponentPath}, old: ${this.config.ohos.etsComponentPath}`)
    this.config.ohos.etsComponentPath = etsComponentPath
    return this
  }

  setEtsLoaderConfigPath(etsLoaderConfigPath: string): this {
    this.logger.getConsola().info(`ohos.etsLoaderConfigPath changed: new: ${etsLoaderConfigPath}, old: ${this.config.ohos.etsLoaderConfigPath}`)
    if (!fs.existsSync(etsLoaderConfigPath)) {
      this.logger.getConsola().warn(`ohos.etsLoaderConfigPath not exists: ${etsLoaderConfigPath}`)
    }
    else if (!fs.statSync(etsLoaderConfigPath).isFile()) {
      this.logger.getConsola().warn(`ohos.etsLoaderConfigPath is not a file: ${etsLoaderConfigPath}`)
    }
    else {
      this.config.ohos.etsLoaderConfigPath = etsLoaderConfigPath
    }
    return this
  }

  getEtsLoaderConfigCompilerOptions(): ets.CompilerOptions {
    if (!this.config.ohos.etsLoaderConfigPath)
      return {}

    const etsLoaderConfig = fs.readFileSync(this.config.ohos.etsLoaderConfigPath, 'utf-8')
    const { options = {}, errors = [] } = ets.parseJsonConfigFileContent(
      ets.parseConfigFileTextToJson(this.config.ohos.etsLoaderConfigPath, etsLoaderConfig).config || {},
      ets.sys,
      path.dirname(this.config.ohos.etsLoaderConfigPath),
    )

    if (errors.length > 0) {
      for (const error of errors)
        this.logger.getConsola().warn(`ETS loader config error: [${error.code}:${error.category}] ${error.messageText}`)
    } else {
      this.logger.getConsola().info(`ETS loader config parsed successfully: ${JSON.stringify(options, null, 2)}`)
    }

    return options
  }

  setEtsLoaderPath(etsLoaderPath: string): this {
    this.logger.getConsola().info(`ohos.etsLoaderPath changed: new: ${etsLoaderPath}, old: ${this.config.ohos.etsLoaderPath}`)
    this.config.ohos.etsLoaderPath = etsLoaderPath
    return this
  }

  setBaseUrl(baseUrl: string): this {
    this.logger.getConsola().info(`ohos.baseUrl changed: new: ${baseUrl}, old: ${this.config.ohos.baseUrl}`)
    this.config.ohos.baseUrl = baseUrl
    return this
  }

  setLib(lib: string[]): this {
    this.logger.getConsola().info(`ohos.lib changed: new: ${lib}, old: ${this.config.ohos.lib}`)
    this.config.ohos.lib = lib
    return this
  }

  appendLib(lib: string): this {
    this.logger.getConsola().info(`ohos.lib changed: new: ${lib}, old: ${this.config.ohos.lib}`)
    this.config.ohos.lib.push(lib)
    return this
  }

  setTypeRoots(typeRoots: string[]): this {
    this.logger.getConsola().info(`ohos.typeRoots changed: new: ${typeRoots}, old: ${this.config.ohos.typeRoots}`)
    this.config.ohos.typeRoots = typeRoots
    return this
  }

  appendTypeRoot(typeRoot: string): this {
    this.logger.getConsola().info(`ohos.typeRoots changed: new: ${typeRoot}, old: ${this.config.ohos.typeRoots}`)
    this.config.ohos.typeRoots.push(typeRoot)
    return this
  }

  setPaths(paths: import('ohos-typescript').MapLike<string[]>): this {
    this.logger.getConsola().info(`ohos.paths changed: new: ${JSON.stringify(paths, null, 2)}, old: ${JSON.stringify(this.config.ohos.paths, null, 2)}`)
    this.config.ohos.paths = paths
    return this
  }

  appendPath(path: string, value: string[]): this {
    this.logger.getConsola().info(`ohos.paths changed: new: ${path}, old: ${this.config.ohos.paths}`)
    this.config.ohos.paths[path] = value
    return this
  }

  setLocale(locale: string): this {
    this.logger.getConsola().info(`locale changed: new: ${locale}, old: ${this.locale}`)
    this.locale = locale
    return this
  }

  getLocale(): string {
    return this.locale
  }

  setConfiguration(config: EtsServerClientOptions): this {
    if (config.ohos.baseUrl)
      this.setBaseUrl(config.ohos.baseUrl)
    if (config.ohos.etsComponentPath)
      this.setEtsComponentPath(config.ohos.etsComponentPath)
    if (config.ohos.etsLoaderConfigPath)
      this.setEtsLoaderConfigPath(config.ohos.etsLoaderConfigPath)
    if (config.ohos.etsLoaderPath)
      this.setEtsLoaderPath(config.ohos.etsLoaderPath)
    if (config.ohos.lib)
      this.setLib(config.ohos.lib)
    if (config.ohos.paths)
      this.setPaths(config.ohos.paths)
    if (config.ohos.sdkPath)
      this.setSdkPath(config.ohos.sdkPath)
    if (config.ohos.typeRoots)
      this.setTypeRoots(config.ohos.typeRoots)
    if (config.typescript.tsdk)
      this.setTypeScriptTsdk(config.typescript.tsdk)
    return this
  }
}