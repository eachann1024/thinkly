
export interface IImageStorageStrategy {
  save(blob: Blob, mimeType: string): Promise<string>

  load(ref: string): Promise<Blob | null>

  delete(ref: string): Promise<void>

  canHandle(ref: string): boolean
}

export interface StorageConfig {
  inlineThreshold: number
  compressThreshold: number
  compressQuality: number
  maxEdge: number
}

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  inlineThreshold: 100 * 1024,
  compressThreshold: 500 * 1024,
  compressQuality: 0.8,
  maxEdge: 4096,
}

export const MAX_IMAGE_STORE_BYTES = 10 * 1024 * 1024

export type StorageStrategyType = 'base64' | 'attachment' | 'file-system' | 'inlined'
