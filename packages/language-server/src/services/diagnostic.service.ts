import type { LanguageServerLogger } from '@arkts/shared'
import type { LanguageServicePlugin } from '@volar/language-server'
import { URI } from 'vscode-uri'

interface TSProvider {
  'typescript/languageServiceHost': () => import('ohos-typescript').LanguageServiceHost
}

export function createETSLinterDiagnosticService(ets: typeof import('ohos-typescript'), logger: LanguageServerLogger): LanguageServicePlugin {
  return {
    name: 'ets-diagnostic',
    capabilities: {
      diagnosticProvider: {
        interFileDependencies: true,
        workspaceDiagnostics: true,
      },
    },
    create(context) {
      const languageServiceHost = context.inject<TSProvider>('typescript/languageServiceHost')
      if (!languageServiceHost)
        return {}

      const languageService = ets.createLanguageService(languageServiceHost)

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
  }
}
