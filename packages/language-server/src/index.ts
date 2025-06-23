import process from 'node:process'
import { ETSLanguagePlugin } from '@arkts/language-plugin'
import { LanguageServerLogger } from '@arkts/shared'
import { createConnection, createServer, createTypeScriptProject } from '@volar/language-server/node'
import * as ets from 'ohos-typescript'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { LanguageServerConfigManager } from './config-manager'
import { createETSLinterDiagnostic } from './diagnostic'

let connection = createConnection()
const server = createServer(connection)
const logger = new LanguageServerLogger("ETS Language Server")
const lspConfiguration = new LanguageServerConfigManager(logger)

logger.getConsola().info(`ETS Language Server is running: (pid: ${process.pid})`)

connection.onInitialize((params) => {
  if (params.locale)
    lspConfiguration.setLocale(params.locale)
  lspConfiguration.setConfiguration(params.initializationOptions)
  const tsdk = lspConfiguration.getTypeScriptTsdk()

  return server.initialize(
    params,
    createTypeScriptProject(ets as any, tsdk.diagnosticMessages, () => {
      return {
        languagePlugins: [ETSLanguagePlugin(ets, { sdkPath: lspConfiguration.getSdkPath(), tsdk: lspConfiguration.getTsdkPath() })],
        setup(options) {
          if (!options.project || !options.project.typescript || !options.project.typescript.languageServiceHost)
            return

          const originalSettings = options.project.typescript.languageServiceHost.getCompilationSettings() || {}
          logger.getConsola().debug(`Settings: ${JSON.stringify(lspConfiguration.getTsConfig(originalSettings as ets.CompilerOptions), null, 2)}`)
          options.project.typescript.languageServiceHost.getCompilationSettings = () => {
            return lspConfiguration.getTsConfig(originalSettings as ets.CompilerOptions) as any
          }
        },
      }
    }),
    [
      createEmmetService(),
      ...createTypeScriptServices(ets as any),
      createETSLinterDiagnostic(ets, logger),
    ],
  )
})

connection.listen()
connection.onInitialized(server.initialized)
connection.onShutdown(server.shutdown)