import { FileSystemException } from '../fs/file-system-exception'

export class SdkAnalyzerException extends FileSystemException {
  constructor(public code: SdkAnalyzerException.Code, message?: string) {
    super(code, message)
  }

  /**
   * Convert the `FileSystemException` to `SdkAnalyzerException`.
   *
   * @param {FileSystemException} error The `FileSystemException` to convert.
   * @returns {SdkAnalyzerException} The converted `SdkAnalyzerException`.
   */
  static fromFileSystemException(error: FileSystemException): SdkAnalyzerException {
    return new SdkAnalyzerException(error.code as SdkAnalyzerException.Code, error.message)
  }
}

export namespace SdkAnalyzerException {
  export enum Code {
    SDKPathNotFound = 'SDK_PATH_NOT_FOUND',
    SDKPathNotDirectory = 'SDK_PATH_NOT_DIRECTORY',
    EtsComponentPathNotFound = 'ETS_COMPONENT_PATH_NOT_FOUND',
    EtsComponentPathNotDirectory = 'ETS_COMPONENT_PATH_NOT_DIRECTORY',
    EtsLoaderConfigPathNotFound = 'ETS_LOADER_CONFIG_PATH_NOT_FOUND',
    EtsLoaderConfigPathNotFile = 'ETS_LOADER_CONFIG_PATH_NOT_FILE',
  }
}
