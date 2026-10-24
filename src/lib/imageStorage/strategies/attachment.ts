import { formatDecimal } from "@/i18n/format";
import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageStorage/strategies/attachment.ts#localMessages:1">`
zh-Hans:
  compressedImageTooLarge: "图片过大（约 {{size}}MB），压缩后仍超过 {{limit}}MB 上限"
  imageAttachmentFailed: "图片写入附件存储失败: {{error}}"
en:
  compressedImageTooLarge: "The compressed image (about {{size}} MB) still exceeds the {{limit}} MB limit"
  imageAttachmentFailed: "Couldn’t save the image as an attachment: {{error}}"
ja:
  compressedImageTooLarge: "画像が大きすぎます（約 {{size}}MB）。圧縮後も上限の {{limit}}MB を超えています"
  imageAttachmentFailed: "画像を添付ファイルとして保存できませんでした: {{error}}"
`;
const uiText = createTranslator(localMessages);

import type { IImageStorageStrategy } from '../types'
import { getExtensionFromMimeType } from '../utils'
import { HostAdapter } from '../../host/adapter'
import { compressIfNeeded } from '../../imageProcessor'
import { MAX_IMAGE_STORE_BYTES } from '../types'

const ATT_PREFIX = 'att:'
const ID_PREFIX = 'goose-img/'

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export class AttachmentStrategy implements IImageStorageStrategy {
  async save(blob: Blob, _mimeType: string): Promise<string> {
    const out = await compressIfNeeded(blob)

    if (out.size > MAX_IMAGE_STORE_BYTES) {
      throw new Error(
        uiText("compressedImageTooLarge", {size: formatDecimal(out.size / (1024 * 1024), 1), limit: Math.floor(MAX_IMAGE_STORE_BYTES / (1024 * 1024))}),
      )
    }

    const arrayBuf = await out.arrayBuffer()
    const buffer = new Uint8Array(arrayBuf)

    const hash = await sha256Hex(arrayBuf)
    const ext = getExtensionFromMimeType(out.type)
    const id = `${ID_PREFIX}${hash}.${ext}`

    const existing = await HostAdapter.db.getAttachment(id)
    if (existing) {
      return `${ATT_PREFIX}${id}`
    }

    const result = await HostAdapter.db.postAttachment(id, buffer, out.type)
    if (!result || result.ok === false) {
      const detail =
        result && typeof result.error === 'string'
          ? result.error
          : result?.error
            ? JSON.stringify(result.error)
            : 'unknown'
      if (/上限|\blimit\b/i.test(detail)) {
        throw new Error(detail)
      }
      throw new Error(uiText("imageAttachmentFailed", {error: detail}))
    }

    return `${ATT_PREFIX}${id}`
  }

  async load(ref: string): Promise<Blob | null> {
    const id = ref.slice(ATT_PREFIX.length)
    const data = await HostAdapter.db.getAttachment(id)
    if (!data) return null

    const mimeType = (await HostAdapter.db.getAttachmentType(id)) || 'image/jpeg'
    return new Blob([data.buffer as ArrayBuffer], { type: mimeType })
  }

  async delete(ref: string): Promise<void> {
    const id = ref.slice(ATT_PREFIX.length)
    try {
      HostAdapter.db.remove(id)
    } catch {
    }
  }

  canHandle(ref: string): boolean {
    return (
      ref.startsWith(ATT_PREFIX) &&
      !ref.startsWith("att-file:") &&
      !ref.startsWith("att-video:")
    );
  }
}
