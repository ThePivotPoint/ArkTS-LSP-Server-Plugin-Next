export class SdkInstallerException extends Error {
  constructor(public code: SdkInstallerException.Code, message?: string) {
    super(message)
  }
}

export namespace SdkInstallerException {
  export enum Code {
    SDKArchNotFound = 'SDK_ARCH_NOT_FOUND',
    SDKVersionNotFound = 'SDK_VERSION_NOT_FOUND',
    SDKRequestFailed = 'SDK_REQUEST_FAILED',
  }
}
