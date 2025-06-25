import type { CodeInformation, VirtualCode } from '@volar/language-core'
import type * as ts from 'typescript'

export function createVirtualCode(snapshot: ts.IScriptSnapshot, languageId: string, data: CodeInformation): VirtualCode {
  return {
    id: 'root',
    languageId,
    snapshot,
    mappings: [{
      sourceOffsets: [0],
      generatedOffsets: [0],
      lengths: [snapshot.getLength()],
      data,
    }],
  }
}

export function createEmptyVirtualCode(snapshot: ts.IScriptSnapshot, languageId: string, data: CodeInformation): VirtualCode {
  return {
    id: 'root',
    languageId,
    snapshot: {
      getText: () => '',
      getLength: () => 0,
      getChangeRange: () => undefined,
    },
    mappings: [{
      sourceOffsets: [0],
      generatedOffsets: [0],
      lengths: [snapshot.getLength()],
      data,
    }],
  }
}
