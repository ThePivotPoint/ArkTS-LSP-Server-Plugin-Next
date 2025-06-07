export class FileSystemException extends Error {
  constructor(public code: number | string, message?: string) {
    super(message)
  }
}
