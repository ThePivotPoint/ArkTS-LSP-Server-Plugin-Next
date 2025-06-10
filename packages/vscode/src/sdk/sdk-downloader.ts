import type { AxiosProgressEvent, AxiosResponse, GenericAbortSignal } from 'axios'
import type { SdkExtractOptions } from './sdk-unzipper'
import type { SdkInstallOptions, SdkVersion } from './sdk-url-selector'
import fs from 'node:fs'
import axios from 'axios'
import { FileSystem } from '../fs/file-system'

export type SpeedText = `${number} MB/s` | `${number} KB/s`
/** Calculate the current speed of the download from the progress event. */
export type SpeedCalculator = (e: AxiosProgressEvent) => SpeedText

/** Enhanced axios progress event for resume download. */
export interface DownloadProgressEvent extends AxiosProgressEvent {
  /** Current speed of the download. */
  speed: SpeedText
  /** Total size of the requested file. */
  totalSize: number
  /** Current percentage of the download. */
  percentage: number
  /** Increment of the download. */
  increment: number
  /** Current progress of the download. */
  currentProgress: number
}

export interface DownloadOptions {
  /** Abort signal for the download. */
  signal?: GenericAbortSignal
  /** The path to the cache file. */
  cacheFilePath: string
  /** The callback function to handle the download progress. */
  onProgress?: (e: DownloadProgressEvent) => void | Promise<void>
}

export interface DownloadFinishResponse {
  type: 'finish'
  /** The start byte of the download. */
  startByte: number
}

export interface DownloadSuccessResponse {
  type: 'success'
  /** The axios response (`stream`) from the server. */
  response: AxiosResponse<import('stream').Readable>
  /** The start byte of the download. */
  startByte: number
}

export type DownloadResponse = DownloadFinishResponse | DownloadSuccessResponse

export interface UnzipDownloadedOptions extends Omit<SdkInstallOptions, 'onProgress'>, SdkExtractOptions {
  /** The download response. */
  response: DownloadResponse
  /** The version of the SDK to install. */
  version: SdkVersion
}

export abstract class SdkDownloader extends FileSystem {
  /**
   * Install the selected SDK.
   *
   * @param version - The version of the SDK to install
   * @param options - The options for the installation
   * @returns A promise that resolves when the installation is complete
   */
  abstract install(version: SdkVersion, options: SdkInstallOptions): Promise<DownloadResponse>

  /**
   * Write the downloaded SDK to the disk.
   *
   * @param filePath - The path to the downloaded SDK tar.gz file.
   * @param res - The axios response from the server.
   */
  abstract writeToDisk(filePath: string, res: AxiosResponse<import('stream').Readable>): Promise<void>

  /**
   * Unzip the downloaded SDK.
   *
   * @param options - The options for the unzip.
   */
  abstract unzipDownloaded(options: UnzipDownloadedOptions): Promise<void>

  /**
   * Get the calculator function that calculates the current speed of the download.
   *
   * @param lastTime - The last time the speed was calculated.
   * @param lastLoaded - The last loaded amount.
   * @returns A calculator function that calculates the current speed.
   */
  getCurrentSpeed(lastTime = Date.now(), lastLoaded = 0): SpeedCalculator {
    return (e: AxiosProgressEvent) => {
      const currentTime = Date.now()
      const timeDiff = (currentTime - lastTime) / 1000
      const loadedDiff = e.loaded - lastLoaded
      const speed = loadedDiff / timeDiff

      lastLoaded = e.loaded
      lastTime = currentTime

      if (speed > 1024 * 1024)
        return `${(speed / (1024 * 1024)).toFixed(2)} MB/s` as SpeedText
      return `${(speed / 1024).toFixed(2)} KB/s` as SpeedText
    }
  }

  /**
   * Download the file from the url (support resume download).
   *
   * @param url - The url to download the file from.
   * @param options - The options for the download.
   * @returns The axios response (`stream`) from the server.
   */
  async download(url: string, options: DownloadOptions): Promise<DownloadResponse> {
    let startByte = 0
    if (fs.existsSync(options.cacheFilePath)) {
      const stats = fs.statSync(options.cacheFilePath)
      startByte = stats.size
    }

    const headResponse = await axios.head(url)
    const totalSize = Number.parseInt(headResponse.headers['content-length'] || '0', 10)

    let percentage = 0
    const calculateSpeed = this.getCurrentSpeed()

    try {
      const response = await axios.get(url, {
        headers: {
          Range: `bytes=${startByte}-`,
        },
        onDownloadProgress: async (progressEvent) => {
          const speed = calculateSpeed(progressEvent)
          const progress = Math.round(((startByte + progressEvent.loaded) / totalSize) * 100)
          await options.onProgress?.({
            ...progressEvent,
            speed,
            totalSize,
            percentage,
            increment: progress - percentage,
            currentProgress: progress,
          })
          percentage = progress
        },
        responseType: 'stream',
        signal: options.signal,
      })

      return {
        type: 'success',
        response,
        startByte,
      }
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 416) {
        return {
          type: 'finish',
          startByte,
        }
      }

      this.getConsola().error(`SDK download failed.`)
      if (axios.isAxiosError(error)) {
        this.getConsola().error(error)
        this.getConsola().error(`Response: ${JSON.stringify(error.response || {})}`)
      }
      else {
        this.getConsola().error(error)
      }
      throw error
    }
  }
}
