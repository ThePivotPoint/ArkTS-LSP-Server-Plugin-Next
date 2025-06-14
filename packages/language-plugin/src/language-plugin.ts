import type { LanguagePlugin } from '@volar/language-core'
import type * as ets from 'ohos-typescript'
import type * as ts from 'typescript'
import type { URI } from 'vscode-uri'
import { DtsVirtualCode, EtsVirtualCode } from './ets-code'
import '@volar/typescript'

function isEts(tsOrEts: typeof ets | typeof ts): tsOrEts is typeof ets {
  return 'ArkTSLinter_1_0' in tsOrEts
}

export interface ETSLanguagePluginOptions {
  sdkPath: string
}

export function ETSLanguagePlugin(tsOrEts: typeof ets | typeof ts, options: ETSLanguagePluginOptions): LanguagePlugin<URI | string> {
  return {
    getLanguageId(uri) {
      if (typeof uri === 'string') {
        if (uri.endsWith('.d.ets') || uri.endsWith('.ets'))
          return 'ets'
        else if (uri.endsWith('.d.ts'))
          return 'typescript'
      }
      else {
        if (uri.fsPath.endsWith('.d.ets') || uri.fsPath.endsWith('.ets'))
          return 'ets'
        else if (uri.fsPath.endsWith('.d.ts'))
          return 'typescript'
      }
    },
    createVirtualCode(uri, languageId, snapshot) {
      if (languageId === 'ets') {
        return new EtsVirtualCode(snapshot)
      }
      else if (languageId === 'typescript') {
        const filePath = typeof uri === 'string' ? uri : uri.fsPath
        const isInSdkPath = filePath.startsWith(options.sdkPath)
        if (!isEts(tsOrEts) && isInSdkPath) {
          snapshot.getText = () => ''
          snapshot.getLength = () => 0
          snapshot.getChangeRange = () => undefined
        }
        if (isEts(tsOrEts) && !isInSdkPath) {
          snapshot.getText = () => ''
          snapshot.getLength = () => 0
          snapshot.getChangeRange = () => undefined
        }
        return new DtsVirtualCode(
          filePath,
          tsOrEts.createSourceFile(filePath, snapshot.getText(0, snapshot.getLength()), tsOrEts.ScriptTarget.Latest as any) as any,
          languageId,
          [],
        )
      }
    },
    typescript: getTypeScriptConfiguration(tsOrEts),
  }
}

function getTypeScriptConfiguration(tsOrEts: typeof ets | typeof ts): LanguagePlugin<any>['typescript'] {
  // ETS (Language server environment)
  if (isEts(tsOrEts)) {
    return {
      extraFileExtensions: [
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        { extension: 'ets', isMixedContent: false, scriptKind: 8 satisfies ets.ScriptKind.ETS },
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        { extension: 'd.ets', isMixedContent: false, scriptKind: 8 satisfies ets.ScriptKind.ETS },
      ],
      resolveHiddenExtensions: true,
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-expect-error
      getServiceScript(root) {
        return {
          code: root,
          extension: '.ets',
          // In typescript plugin mode the scriptKind is always 3
          scriptKind: 8 satisfies ets.ScriptKind.ETS,
        }
      },
    }
  }
  // TypeScript (TypeScript plugin environment)
  else {
    return {
      extraFileExtensions: [],
      getServiceScript(root) {
        return {
          code: root,
          extension: '.ts',
          // In typescript plugin mode the scriptKind is always 3
          scriptKind: 3 satisfies ts.ScriptKind.TS,
        }
      },
    }
  }
}
