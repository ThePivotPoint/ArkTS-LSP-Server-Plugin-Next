import { type DocumentSymbol, type LanguageServicePlugin, Range, SymbolKind } from '@volar/language-server'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import * as ets from 'ohos-typescript'
import { URI } from 'vscode-uri'

export interface TSProvider {
  'typescript/languageService': () => import('ohos-typescript').LanguageService
}

/** @see https://github.com/microsoft/vscode/blob/5b34b12d958fbb656b624629a242e78b3b667cf0/extensions/html-language-features/server/src/modes/javascriptMode.ts#L547 */
function convertSymbolKind(kind: ets.ScriptElementKind): SymbolKind {
  switch (kind) {
    case ets.ScriptElementKind.moduleElement: return SymbolKind.Module
    case ets.ScriptElementKind.classElement: return SymbolKind.Class
    case ets.ScriptElementKind.enumElement: return SymbolKind.Enum
    case ets.ScriptElementKind.enumMemberElement: return SymbolKind.EnumMember
    case ets.ScriptElementKind.interfaceElement: return SymbolKind.Interface
    case ets.ScriptElementKind.indexSignatureElement: return SymbolKind.Method
    case ets.ScriptElementKind.callSignatureElement: return SymbolKind.Method
    case ets.ScriptElementKind.memberFunctionElement: return SymbolKind.Method
    case ets.ScriptElementKind.memberVariableElement: return SymbolKind.Property
    case ets.ScriptElementKind.memberGetAccessorElement: return SymbolKind.Property
    case ets.ScriptElementKind.memberSetAccessorElement: return SymbolKind.Property
    case ets.ScriptElementKind.variableElement: return SymbolKind.Variable
    case ets.ScriptElementKind.letElement: return SymbolKind.Variable
    case ets.ScriptElementKind.constElement: return SymbolKind.Variable
    case ets.ScriptElementKind.localVariableElement: return SymbolKind.Variable
    case ets.ScriptElementKind.alias: return SymbolKind.Variable
    case ets.ScriptElementKind.functionElement: return SymbolKind.Function
    case ets.ScriptElementKind.localFunctionElement: return SymbolKind.Function
    case ets.ScriptElementKind.constructSignatureElement: return SymbolKind.Constructor
    case ets.ScriptElementKind.constructorImplementationElement: return SymbolKind.Constructor
    case ets.ScriptElementKind.typeParameterElement: return SymbolKind.TypeParameter
    case ets.ScriptElementKind.string: return SymbolKind.String
    case ets.ScriptElementKind.structElement: return SymbolKind.Struct
    default: return SymbolKind.Variable
  }
}

function toRange(textSpan: ets.TextSpan, document: TextDocument): Range {
  return {
    start: document.positionAt(textSpan.start),
    end: document.positionAt(textSpan.start + textSpan.length),
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

          const getSymbol = (item: ets.NavigationTree): DocumentSymbol => {
            if (!item.spans || item.spans.length === 0) {
              return {
                name: item.text.replace(/["'`]/g, ''),
                kind: convertSymbolKind(item.kind),
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                detail: item.kindModifiers,
                children: (item.childItems || []).map(item => getSymbol(item)),
              }
            }

            return {
              name: item.text.replace(/["'`]/g, ''),
              kind: convertSymbolKind(item.kind),
              range: toRange(item.spans[0], document),
              selectionRange: toRange(item.spans[0], document),
              detail: item.kindModifiers,
              children: (item.childItems || []).map(item => getSymbol(item)),
            }
          }

          navigationBarItems.childItems?.forEach(item => items.push(getSymbol(item)))
          return items
        },
      }
    },
  }
}
