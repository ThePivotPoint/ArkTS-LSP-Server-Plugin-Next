import type { LanguagePlugin } from '@volar/language-core'
import type * as ets from 'ohos-typescript'
import type { URI } from 'vscode-uri'
import { EtsVirtualCode, TSIgnoreVirtualCode, TSInternalLibIgnoreVirtualCode } from './ets-code'
import '@volar/typescript'
import type * as ts from 'typescript'

function isEts(tsOrEts: typeof ets | typeof ts): tsOrEts is typeof ets {
  return 'ETS' in tsOrEts.ScriptKind && tsOrEts.ScriptKind.ETS === 8
}

export function ETSLanguagePlugin(tsOrEts: typeof ets | typeof ts, { sdkPath = '', tsdk = '' }: { sdkPath?: string, tsdk?: string }): LanguagePlugin<URI | string> {
  return {
    getLanguageId(uri) {
      const filePath = typeof uri === 'string' ? uri : uri.fsPath
      if (filePath.endsWith('.ets'))
        return 'ets'
      if (filePath.endsWith('.ts'))
        return 'typescript'
      return undefined
    },
    createVirtualCode(uri, languageId, snapshot) {
      const filePath = typeof uri === 'string' ? uri : uri.fsPath
      if (languageId === 'ets' && filePath.endsWith('.ets'))
        return new EtsVirtualCode(snapshot)

      const isInSdkPath = filePath.startsWith(sdkPath)
      const isInTsdkPath = filePath.startsWith(tsdk)
      const isDTS = filePath.endsWith('.d.ts')
      const isDETS = filePath.endsWith('.d.ets')

      // TS Plugin mode
      if (!isEts(tsOrEts) && (isDTS || isDETS) && isInSdkPath) {
        snapshot.getText = () => ''
        snapshot.getLength = () => 0
        snapshot.getChangeRange = () => undefined
        return
      }

      // ETS Server mode
      if (isEts(tsOrEts) && !(isDTS || isDETS) && !isInSdkPath) {
        snapshot.getText = () => ''
        snapshot.getLength = () => 0
        snapshot.getChangeRange = () => undefined
        return new TSIgnoreVirtualCode(filePath, snapshot, languageId)
      }

      // Proxy ts internal lib files, such as `lib.d.ts`, `lib.es2020.d.ts`, etc.
      if (isEts(tsOrEts) && (isDTS || isDETS) && isInTsdkPath) {
        return new TSInternalLibIgnoreVirtualCode(filePath, snapshot, languageId)
      }
    },
    typescript: {
      // @ts-expect-error
      extraFileExtensions: isEts(tsOrEts) ? [
        { extension: 'ets', isMixedContent: false, scriptKind: 8 satisfies ets.ScriptKind.ETS },
        { extension: 'd.ets', isMixedContent: false, scriptKind: 8 satisfies ets.ScriptKind.ETS },
      ] : [],
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
