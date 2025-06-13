import type { EtsServerClientOptions } from '@arkts/shared'
import { ETSLanguagePlugin } from '@arkts/language-plugin'
import { LanguageServerLogger } from '@arkts/shared'
import { createConnection, createServer, createTypeScriptProject } from '@volar/language-server/node'
import * as ets from 'ohos-typescript'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { URI } from 'vscode-uri'
import { LanguageServerConfigManager } from './config-manager'

const connection = createConnection()
const server = createServer(connection)
const logger = new LanguageServerLogger()
const lspConfiguration = new LanguageServerConfigManager(logger)

server.configurations.onDidChange(async (e) => {
  if (!e || !e.settings || !('configType' in e) || e.configType !== 'lspConfiguration') return
  logger.getConsola().info(`ETS configuration changed: `)
  logger.getConsola().info(JSON.stringify(e, null, 2))
  lspConfiguration.setConfiguration(e.settings)
  await connection.sendNotification('ets/configurationChanged', e)
})

connection.listen()

/** A helper function to assert the type of the value. */
function typeAssert<T>(_value: unknown): asserts _value is T {}

connection.onInitialize((params) => {
  typeAssert<EtsServerClientOptions>(params.initializationOptions)
  lspConfiguration.setConfiguration(params.initializationOptions)
  const tsdk = lspConfiguration.getTypeScriptTsdk()

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
          options.project.typescript.languageServiceHost.getCompilationSettings = () => {
            return lspConfiguration.getTsConfig(originalSettings as ets.CompilerOptions) as any
          }
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
