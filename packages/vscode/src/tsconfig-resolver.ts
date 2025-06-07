import type * as ets from 'ohos-typescript'

export class TsconfigResolver {
  constructor(private readonly baseCompilerOptions: ets.CompilerOptions = {}) {}

  getCompilerOptions(): ets.CompilerOptions {
    return this.baseCompilerOptions
  }
}
