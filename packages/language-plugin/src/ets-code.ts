import type { CodeMapping, VirtualCode } from '@volar/language-core'
import type { TsmLanguagePlugin } from 'ts-macro'
import type * as ts from 'typescript'
import { TsmVirtualCode } from 'ts-macro'

export class EtsVirtualCode implements VirtualCode {
  id = 'root'
  languageId = 'ets'
  mappings: CodeMapping[] = []
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

export class DtsVirtualCode extends TsmVirtualCode implements VirtualCode {
  constructor(
    public filePath: string,
    public ast: import('typescript').SourceFile,
    public languageId: string,
    plugins: TsmLanguagePlugin[],
  ) {
    super(filePath, ast, languageId, plugins)
  }
}
