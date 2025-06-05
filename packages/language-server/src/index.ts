import path from 'node:path'
import { createConnection, createServer, createTypeScriptProject, loadTsdkByPath } from '@volar/language-server/node'
import ts, * as ets from 'ohos-typescript'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { getEtsOptions } from './config/ets-options'
import { etsLanguagePlugin } from './languagePlugin'
import { Logger } from './log/logger'
import fs from 'node:fs'

const connection = createConnection()
const server = createServer(connection)

connection.listen()

connection.onInitialize((params) => {
  const logger = new Logger()
  const tsdk = loadTsdkByPath(params.initializationOptions.typescript.tsdk, params.locale)
  logger.getConsola().info(`TSDK path: ${params.initializationOptions.typescript.tsdk} (initializationOptions.typescript.tsdk)`)
  logger.getConsola().info(`OHOS SDK path: ${params.initializationOptions.ohos.sdkPath} (initializationOptions.ohos.sdkPath)`)

  return server.initialize(
    params,
    createTypeScriptProject(ets as any, tsdk.diagnosticMessages, () => ({
      languagePlugins: [etsLanguagePlugin],
      setup(options) {
        if (!options.project || !options.project.typescript || !options.project.typescript.languageServiceHost)
          return
        const originalSettings = options.project.typescript?.languageServiceHost.getCompilationSettings() || {}

        options.project.typescript.languageServiceHost.getCompilationSettings = (): any => {
          const settings = {
            ...originalSettings as ets.CompilerOptions,
            ets: getEtsOptions(),
            etsLoaderPath: path.resolve(params.initializationOptions.ohos.sdkPath, 'ets/build-tools/ets-loader'),
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.NodeNext,
            moduleDetection: ts.ModuleDetectionKind.Force,
            typeRoots: params.rootPath
              ? [
                  path.resolve(params.rootPath, './node_modules/@types'),
                  path.resolve(params.rootPath, './oh_modules/@types'),
                  path.resolve(params.initializationOptions.ohos.sdkPath, 'api', '@internal'),
                ]
              : undefined,
            strict: true,
            lib: fs.readdirSync(path.resolve(params.initializationOptions.ohos.sdkPath, 'ets', 'component'))
              .filter(file => file.endsWith('.d.ts') || file.endsWith('.d.ets'))
              .map(file => {
                return path.resolve(params.initializationOptions.ohos.sdkPath, 'ets', 'component', file)
              }),
            experimentalDecorators: true,
            allowArbitraryExtensions: true,
            allowImportingTsExtensions: true,
            emitDeclarationOnly: true,
            strictPropertyInitialization: false,
            declaration: true,
            paths: {
              '*': [
                './oh_modules/*',
                path.resolve(params.initializationOptions.ohos.sdkPath, 'ets/api/*'),
                path.resolve(params.initializationOptions.ohos.sdkPath, 'ets/kits/*'),
              ],
              '@internal/full/*': [
                path.resolve(params.initializationOptions.ohos.sdkPath, 'ets/@internal/full/*'),
              ],
            },
          } satisfies ets.CompilerOptions

          logger.getConsola().info(`compilerOptions: ${JSON.stringify(settings)}`)
          return settings
        }
      },
    })),
    [
      createEmmetService(),
      ...createTypeScriptServices(ets as any),
    ],
  )
})

connection.onInitialized(server.initialized)
connection.onShutdown(server.shutdown)
