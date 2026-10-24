
import type { IImageStorageStrategy } from './types'
import { DEFAULT_STORAGE_CONFIG } from './types'
import { AttachmentStrategy } from './strategies/attachment'
import { FileSystemStrategy } from './strategies/file-system'
import { InlinedStrategy } from './strategies/inlined'
import { compressIfNeeded } from '../imageProcessor'
import { clearResolvedUrlCache } from './resolvedUrlCache'

type LocalFolderAccessState =
  | boolean
  | string
  | null
  | undefined
  | Promise<boolean | string | null | undefined>

export class ImageStorage {
  private strategy: IImageStorageStrategy | null = null
  private strategyPromise: Promise<IImageStorageStrategy> | null = null
  private inlinedStrategy: InlinedStrategy
  private localFolderAccessResolver: (() => LocalFolderAccessState) | null =
    null

  constructor() {
    this.inlinedStrategy = new InlinedStrategy(DEFAULT_STORAGE_CONFIG.inlineThreshold)
  }

  private async resolveStrategy(): Promise<IImageStorageStrategy> {
    if (this.strategy) return this.strategy
    if (this.strategyPromise) return this.strategyPromise

    this.strategyPromise = (async () => {
      const localFolderPath = await this.resolveLocalFolderPath()

      if (localFolderPath) {
        return new FileSystemStrategy(() => this.resolveLocalFolderPath())
      }

      return new AttachmentStrategy()
    })()

    this.strategy = await this.strategyPromise
    this.strategyPromise = null
    return this.strategy
  }

  private async resolveLocalFolderPath(): Promise<string | null> {
    if (!this.localFolderAccessResolver) return null

    const resolved = await Promise.resolve(this.localFolderAccessResolver())
    return typeof resolved === 'string' && resolved.length > 0 ? resolved : null
  }

  setLocalFolderAccessResolver(
    resolver: () => LocalFolderAccessState,
  ): void {
    this.localFolderAccessResolver = resolver
    this.strategy = null
    this.strategyPromise = null
  }

  async save(blob: Blob, mimeType: string): Promise<string> {
    const processed = await compressIfNeeded(blob, DEFAULT_STORAGE_CONFIG)
    const processedMime = processed.type || mimeType

    if (processed.size < DEFAULT_STORAGE_CONFIG.inlineThreshold) {
      return this.inlinedStrategy.save(processed, processedMime)
    }

    const strategy = await this.resolveStrategy()
    return strategy.save(processed, processedMime)
  }

  async load(ref: string): Promise<Blob | null> {
    if (this.inlinedStrategy.canHandle(ref)) {
      return this.inlinedStrategy.load(ref)
    }

    const strategy = await this.resolveStrategy()
    if (strategy.canHandle(ref)) {
      return strategy.load(ref)
    }

    const fsStrategy = new FileSystemStrategy(() => this.resolveLocalFolderPath())
    if (fsStrategy.canHandle(ref)) {
      return fsStrategy.load(ref)
    }

    const attStrategy = new AttachmentStrategy()
    if (attStrategy.canHandle(ref)) {
      return attStrategy.load(ref)
    }

    if (ref.startsWith("att-file:")) {
      const { fileStorage } = await import("@/lib/fileStorage")
      return fileStorage.load(ref)
    }

    return null
  }

  async delete(ref: string): Promise<void> {
    clearResolvedUrlCache()
    try {
      if (this.inlinedStrategy.canHandle(ref)) {
        return await this.inlinedStrategy.delete(ref)
      }

      const strategy = await this.resolveStrategy()
      if (strategy.canHandle(ref)) {
        return await strategy.delete(ref)
      }

      const fsStrategy = new FileSystemStrategy(() => this.resolveLocalFolderPath())
      if (fsStrategy.canHandle(ref)) {
        return await fsStrategy.delete(ref)
      }

      const attStrategy = new AttachmentStrategy()
      if (attStrategy.canHandle(ref)) {
        return await attStrategy.delete(ref)
      }
    } finally {
      clearResolvedUrlCache()
    }
  }
}

export const imageStorage = new ImageStorage()

export * from './types'
export * from './utils'
