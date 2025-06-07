import type { LanguagePlugin } from '@volar/language-core'
import type * as ets from 'ohos-typescript'
import type { URI } from 'vscode-uri'
import { EtsVirtualCode } from './ets-code'
import '@volar/typescript'

export function ETSLanguagePlugin(): LanguagePlugin<URI | string> {
  return {
    getLanguageId() {
      return undefined
    },
    createVirtualCode(_uri, languageId, snapshot) {
      if (languageId === 'ets')
        return new EtsVirtualCode(snapshot)
    },
    typescript: {
      extraFileExtensions: [
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        { extension: 'ets', isMixedContent: false, scriptKind: 8 satisfies ets.ScriptKind.ETS },
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        { extension: 'd.ets', isMixedContent: false, scriptKind: 8 satisfies ets.ScriptKind.ETS },
      ],
      resolveHiddenExtensions: true,
      getServiceScript(root) {
        return {
          code: root,
          extension: '.ets',
          scriptKind: 3 satisfies typeof ets.ScriptKind.TS,
        }
      },
    },
  }
}
