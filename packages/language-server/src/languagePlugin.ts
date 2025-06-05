import type { CodeMapping, LanguagePlugin, VirtualCode } from '@volar/language-core'
import type * as ts from 'ohos-typescript'
import type { URI } from 'vscode-uri'

export const etsLanguagePlugin: LanguagePlugin<URI> = {
  getLanguageId(uri) {
    if (uri.path.endsWith('.ets')) {
      return 'ets'
    }
  },
  createVirtualCode(_uri, languageId, snapshot) {
    if (languageId === 'ets') {
      return new EtsVirtualCode(snapshot)
    }
  },
  typescript: {
    extraFileExtensions: [
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-expect-error
      { extension: 'ets', isMixedContent: false, scriptKind: 8 satisfies ts.ScriptKind.ETS },
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-expect-error
      { extension: 'd.ets', isMixedContent: false, scriptKind: 8 satisfies ts.ScriptKind.ETS },
    ],
    resolveHiddenExtensions: true,
    getServiceScript(root) {
      return {
        code: root,
        extension: '.ets',
        scriptKind: 3 satisfies typeof ts.ScriptKind.TS,
      }
    },
  },
}

export class EtsVirtualCode implements VirtualCode {
  id = 'root'
  languageId = 'ets'
  mappings: CodeMapping[]
  embeddedCodes: VirtualCode[] = []

  constructor(public snapshot: ts.IScriptSnapshot) {
    this.mappings = [{
      sourceOffsets: [0],
      generatedOffsets: [0],
      lengths: [snapshot.getLength()],
      data: {
        completion: true,
        format: true,
        navigation: true,
        semantic: true,
        structure: true,
        verification: true,
      },
    }]
  }
}
