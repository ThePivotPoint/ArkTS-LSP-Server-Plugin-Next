import type { EtsServerClientOptions } from '@arkts/shared'
import { ETSLanguagePlugin } from '@arkts/language-plugin'
import { LanguageServerLogger } from '@arkts/shared'
import { createConnection, createServer, createTypeScriptProject } from '@volar/language-server/node'
import defu from 'defu'
import * as ets from 'ohos-typescript'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { URI } from 'vscode-uri'
import { LanguageServerConfigManager } from './language-server-config-manager'

const connection = createConnection()
const server = createServer(connection)
const logger = new LanguageServerLogger()
const lspConfiguration = new LanguageServerConfigManager(logger)

connection.listen()

server.configurations.onDidChange(async (e) => {
  if (!e || !e.settings || !('configType' in e) || e.configType !== 'lspConfiguration') return
  logger.getConsola().info(`ETS configuration changed: `)
  logger.getConsola().info(JSON.stringify(e, null, 2))
  lspConfiguration.setConfiguration(e.settings)
})

/** A helper function to assert the type of the value. */
function typeAssert<T>(_value: unknown): asserts _value is T {}

connection.onInitialize((params) => {
  typeAssert<EtsServerClientOptions>(params.initializationOptions)
  lspConfiguration.setConfiguration(params.initializationOptions)
  const tsdk = lspConfiguration.getTypeScriptTsdk()
  const etsLoaderOptions = lspConfiguration.getEtsLoaderConfigCompilerOptions()

  return server.initialize(
    params,
    createTypeScriptProject(ets as any, tsdk.diagnosticMessages, () => {
      typeAssert<EtsServerClientOptions>(params.initializationOptions)

      return {
        languagePlugins: [ETSLanguagePlugin()],
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
        name: 'ets-diagnostic',

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
            provideDiagnostics(document, token) {
              if (token.isCancellationRequested)
                return

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
