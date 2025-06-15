import type { LanguagePlugin } from '@volar/language-core'
import type * as ets from 'ohos-typescript'
import type * as ts from 'typescript'
import type { URI } from 'vscode-uri'
import { EtsVirtualCode, TSIgnoreVirtualCode } from './ets-code'
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
      const filePath = typeof uri === 'string' ? uri : uri.fsPath

      if (languageId === 'ets') {
        return new EtsVirtualCode(filePath, snapshot, languageId)
      }
      else if (languageId === 'typescript') {
        const isInSdkPath = filePath.startsWith(options.sdkPath)
        // 不是ets环境那就说明是ts环境，ts环境 === typescript plugin环境；
        // 如果当前文件位于open harmony sdk路径下，说明是内置的.d.ts声明文件，那就直接清空文件内容
        // 这样vscode自带的ts服务器就会认为这个文件是空的，于是没有任何报错✨
        if (!isEts(tsOrEts) && isInSdkPath) {
          snapshot.getText = () => ''
          snapshot.getLength = () => 0
          snapshot.getChangeRange = () => undefined
        }
        // 当前是ets环境的时候，ets环境 === language server环境；
        // 如果当前文件不在open harmony sdk路径下，说明是用户自己写的.d.ts声明文件或者就是ts文件，那就直接清空文件内容
        // 这样ets的lsp服务器就会认为这个文件是空的，于是没有任何报错✨
        if (isEts(tsOrEts) && !isInSdkPath) {
          snapshot.getText = () => ''
          snapshot.getLength = () => 0
          snapshot.getChangeRange = () => undefined
          return new TSIgnoreVirtualCode(filePath, snapshot, languageId)
        }
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
