import type { EtsServerClientOptions } from '@arkts/shared'
import fs from 'node:fs'
import path from 'node:path'
import { ETSLanguagePlugin } from '@arkts/language-plugin'
import { LanguageServerLogger } from '@arkts/shared'
import { createConnection, createServer, createTypeScriptProject, loadTsdkByPath } from '@volar/language-server/node'
import defu from 'defu'
import * as ets from 'ohos-typescript'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { URI } from 'vscode-uri'

const connection = createConnection()
const server = createServer(connection)

connection.listen()

/** A helper function to assert the type of the value. */
function typeAssert<T>(_value: unknown): asserts _value is T {}

connection.onInitialize((params) => {
  typeAssert<EtsServerClientOptions>(params.initializationOptions)
  const logger = new LanguageServerLogger()
  const tsdk = loadTsdkByPath(params.initializationOptions.typescript.tsdk, params.locale)
  logger.getConsola().info(`TSDK path: ${params.initializationOptions.typescript.tsdk} (initializationOptions.typescript.tsdk)`)
  logger.getConsola().info(`OHOS SDK path: ${params.initializationOptions.ohos.sdkPath} (initializationOptions.ohos.sdkPath)`)
  logger.getConsola().info(`ETS component path: ${params.initializationOptions.ohos.etsComponentPath} (initializationOptions.ohos.etsComponentPath)`)
  logger.getConsola().info(`ETS loader config path: ${params.initializationOptions.ohos.etsLoaderConfigPath} (initializationOptions.ohos.etsLoaderConfigPath)`)
  logger.getConsola().info(`ETS Libs: ${params.initializationOptions.ohos.lib.map(lib => path.basename(lib))} (initializationOptions.ohos.lib)`)
  if (!params.initializationOptions.ohos.sdkPath)
    throw new Error('sdkPath is not set, ETS Language Server will exited.')
  else if (!params.initializationOptions.ohos.etsComponentPath)
    throw new Error('etsComponentPath is not set, ETS Language Server will exited.')
  else if (!params.initializationOptions.ohos.etsLoaderConfigPath)
    throw new Error('etsLoaderConfigPath is not set, ETS Language Server will exited.')
  else if (!params.initializationOptions.ohos.lib)
    throw new Error('lib is not set, ETS Language Server will exited.')

  const etsLoaderConfig = fs.readFileSync(params.initializationOptions.ohos.etsLoaderConfigPath, 'utf-8')
  const { options: etsLoaderOptions = {}, errors = [] } = ets.parseJsonConfigFileContent(
    ets.parseConfigFileTextToJson(params.initializationOptions.ohos.etsLoaderConfigPath, etsLoaderConfig).config || {},
    ets.sys,
    path.dirname(params.initializationOptions.ohos.etsLoaderConfigPath),
  )
  logger.getConsola().info(`ETS loader config errors: ${JSON.stringify(errors, null, 2)}`)

  return server.initialize(
    params,
    createTypeScriptProject(ets as any, tsdk.diagnosticMessages, () => {
      typeAssert<EtsServerClientOptions>(params.initializationOptions)

      return {
        languagePlugins: [
          ETSLanguagePlugin(),
        ],
        setup(options) {
          typeAssert<EtsServerClientOptions>(params.initializationOptions)
          if (!options.project || !options.project.typescript || !options.project.typescript.languageServiceHost)
            return
          const originalSettings = options.project.typescript?.languageServiceHost.getCompilationSettings() || {}
          const mergedOptions = defu({
            ...originalSettings as ets.CompilerOptions,
            etsLoaderPath: params.initializationOptions.ohos.etsLoaderPath,
            typeRoots: params.initializationOptions.ohos.typeRoots,
            baseUrl: params.initializationOptions.ohos.baseUrl,
            lib: params.initializationOptions.ohos.lib,
            paths: params.initializationOptions.ohos.paths,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            strict: true,
            strictPropertyInitialization: false,
            incremental: true,
          } satisfies ets.CompilerOptions, etsLoaderOptions)

          logger.getConsola().info(`ETS language server merged options: `)
          logger.getConsola().info(JSON.stringify(mergedOptions, null, 2))

          options.project.typescript.languageServiceHost.getCompilationSettings = () => mergedOptions as any
        },
      }
    }),
    [
      createEmmetService(),
      ...createTypeScriptServices(ets as any),
      {
        name: 'arkts-diagnostic',

        capabilities: {
          diagnosticProvider: {
            interFileDependencies: true,
            workspaceDiagnostics: true,
          },
        },

        create(context) {
          if (!context.project.typescript?.languageServiceHost)
            return {}

          const languageService = ets.createLanguageService(context.project.typescript.languageServiceHost as ets.LanguageServiceHost)

          return {
            provideDiagnostics(document) {
              try {
                // eslint-disable-next-line ts/ban-ts-comment
                // @ts-expect-error
                const builderProgram = languageService.getBuilderProgram(/** withLinterProgram */ true)
                const sourceFile = ets.createSourceFile(context.decodeEmbeddedDocumentUri(URI.parse(document.uri))?.[0].fsPath ?? 'index.ets', document.getText(), ets.ScriptTarget.Latest, true)
                return [
                  ...ets.ArkTSLinter_1_0.runArkTSLinter(builderProgram!, sourceFile, undefined, 'ArkTS_1_0'),
                  ...ets.ArkTSLinter_1_1.runArkTSLinter(builderProgram!, sourceFile, undefined, 'ArkTS_1_1'),
                ] as any[]
              }
              catch (error) {
                logger.getConsola().error(`ArkTS Linter error: `)
                console.error(error)
                return []
              }
            },
          }
        },
      },
    ],
  )
})

connection.onInitialized(server.initialized)
connection.onShutdown(server.shutdown)
