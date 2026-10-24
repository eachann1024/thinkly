
import type { IImageStorageStrategy } from '../types'
import { blobToBase64 } from '../utils'

export class InlinedStrategy implements IImageStorageStrategy {
  private threshold: number

  constructor(threshold: number) {
    this.threshold = threshold
  }

  async save(blob: Blob, mimeType: string): Promise<string> {
    return blobToBase64(blob)
  }

  async load(ref: string): Promise<Blob | null> {
    return null
  }

  async delete(ref: string): Promise<void> {
  }

  canHandle(ref: string): boolean {
    return ref.startsWith('data:image/')
  }
}
