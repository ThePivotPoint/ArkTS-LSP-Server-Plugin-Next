import { type DocumentSymbol, type LanguageServicePlugin, SymbolKind } from '@volar/language-server'
import * as ts from 'ohos-typescript'
import { URI } from 'vscode-uri'

export interface TSProvider {
  'typescript/languageService': () => import('ohos-typescript').LanguageService
}

/** @see https://github.com/microsoft/vscode/blob/5b34b12d958fbb656b624629a242e78b3b667cf0/extensions/html-language-features/server/src/modes/javascriptMode.ts#L547 */
function convertSymbolKind(kind: ts.ScriptElementKind): SymbolKind {
  switch (kind) {
    case ts.ScriptElementKind.moduleElement: return SymbolKind.Module
    case ts.ScriptElementKind.classElement: return SymbolKind.Class
    case ts.ScriptElementKind.enumElement: return SymbolKind.Enum
    case ts.ScriptElementKind.enumMemberElement: return SymbolKind.EnumMember
    case ts.ScriptElementKind.interfaceElement: return SymbolKind.Interface
    case ts.ScriptElementKind.indexSignatureElement: return SymbolKind.Method
    case ts.ScriptElementKind.callSignatureElement: return SymbolKind.Method
    case ts.ScriptElementKind.memberFunctionElement: return SymbolKind.Method
    case ts.ScriptElementKind.memberVariableElement: return SymbolKind.Property
    case ts.ScriptElementKind.memberGetAccessorElement: return SymbolKind.Property
    case ts.ScriptElementKind.memberSetAccessorElement: return SymbolKind.Property
    case ts.ScriptElementKind.variableElement: return SymbolKind.Variable
    case ts.ScriptElementKind.letElement: return SymbolKind.Variable
    case ts.ScriptElementKind.constElement: return SymbolKind.Variable
    case ts.ScriptElementKind.localVariableElement: return SymbolKind.Variable
    case ts.ScriptElementKind.alias: return SymbolKind.Variable
    case ts.ScriptElementKind.functionElement: return SymbolKind.Function
    case ts.ScriptElementKind.localFunctionElement: return SymbolKind.Function
    case ts.ScriptElementKind.constructSignatureElement: return SymbolKind.Constructor
    case ts.ScriptElementKind.constructorImplementationElement: return SymbolKind.Constructor
    case ts.ScriptElementKind.typeParameterElement: return SymbolKind.TypeParameter
    case ts.ScriptElementKind.string: return SymbolKind.String
    case ts.ScriptElementKind.structElement: return SymbolKind.Struct
    default: return SymbolKind.Variable
  }
}

export function createETSDocumentSymbolService(): LanguageServicePlugin {
  return {
    name: 'ets-navigation-tree',
    capabilities: {
      documentSymbolProvider: true,
    },
    create(context) {
      if (!context.project.typescript?.languageServiceHost)
        return {}

      const languageService = context.inject<TSProvider>('typescript/languageService')
      if (!languageService)
        return {}

      return {
        provideDocumentSymbols(document) {
          const decodeDocumentUri = context.decodeEmbeddedDocumentUri(URI.parse(document.uri))
          if (!decodeDocumentUri)
            return []
          const documentUri = decodeDocumentUri[0]

          // Ignore non-ets files
          if (!documentUri.fsPath.endsWith('.ets'))
            return []

          const items: DocumentSymbol[] = []
          const navigationBarItems = languageService.getNavigationTree(documentUri.fsPath)

          const getSymbol = (item: ts.NavigationTree, level: number = 0): DocumentSymbol => {
            return {
              name: item.text.replace(/["'`]/g, ''),
              kind: convertSymbolKind(item.kind),
              range: {
                start: document.positionAt(item.spans[0].start),
                end: document.positionAt(item.spans[0].start + item.spans[0].length),
              },
              selectionRange: {
                start: document.positionAt(item.spans[0].start),
                end: document.positionAt(item.spans[0].start + item.spans[0].length),
              },
              children: (item.childItems || []).map(item => getSymbol(item, level + 1)),
            }
          }

          navigationBarItems.childItems?.forEach(item => items.push(getSymbol(item)))
          return items
        },
      }
    },
  }
}
