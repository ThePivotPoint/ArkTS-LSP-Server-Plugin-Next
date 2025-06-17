import type { CodeMapping, VirtualCode } from '@volar/language-core'
import type * as ts from 'typescript'

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

export class TSIgnoreVirtualCode implements VirtualCode {
  id = 'root'
  mappings: CodeMapping[] = []
  embeddedCodes: VirtualCode[] = []

  constructor(
    public filePath: string,
    public snapshot: ts.IScriptSnapshot,
    public languageId: string,
  ) {
    this.mappings = [{
      sourceOffsets: [0],
      generatedOffsets: [0],
      lengths: [snapshot.getLength()],
      data: {
        completion: false,
        format: false,
        navigation: false,
        semantic: false,
        structure: false,
        verification: false,
      },
    }]
  }
}

export class TSInternalLibIgnoreVirtualCode implements VirtualCode {
  id = 'root'
  mappings: CodeMapping[] = []
  embeddedCodes: VirtualCode[] = []

  constructor(
    public filePath: string,
    public snapshot: ts.IScriptSnapshot,
    public languageId: string,
  ) {
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
