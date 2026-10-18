import type { PartialBlock } from "@blocknote/core";
import { MAX_FILENAME_BYTES, filenameByteLength, truncateToBytes } from "./filenameLimits";

/**
 * 本地文件夹模式下，文件名 ↔ 编辑器首块 H1 双向绑定。
 *
 * 读：scanner 用 `ensureFilenameAsTitle` 把首块 H1 的文字强制覆盖为文件名
 * （没有 H1 就前置一个）。
 * 写：保存时用 `extractFirstHeadingText` 拿到首块 H1 文字，若与当前 basename
 * 不一致则触发 rename。
 */

function extractInlineText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      const node = item as { text?: unknown; content?: unknown; type?: string };
      if (typeof node.text === "string") return node.text;
      if (node.type === "link" && Array.isArray(node.content)) {
        return extractInlineText(node.content);
      }
      if (Array.isArray(node.content)) return extractInlineText(node.content);
      return "";
    })
    .join("");
}

export function extractFirstHeadingText(
  content: unknown,
): string {
  const blocks = Array.isArray(content)
    ? content
    : Array.isArray((content as { content?: unknown })?.content)
      ? ((content as { content: unknown[] }).content as unknown[])
      : null;
  if (!blocks || blocks.length === 0) return "";
  const first = blocks[0] as { type?: string; content?: unknown } | undefined;
  if (!first || first.type !== "heading") return "";
  return extractInlineText(first.content).trim();
}

export function ensureFilenameAsTitle(
  content: PartialBlock[],
  filename: string,
): PartialBlock[] {
  const title = filename.trim() || "无标题";
  const blocks = Array.isArray(content) ? [...content] : [];
  const first = blocks[0];

  if (first && first.type === "heading") {
    blocks[0] = {
      ...first,
      props: { ...(first.props ?? {}), level: 1 },
      content: title,
    } as PartialBlock;
    return blocks;
  }

  return [
    { type: "heading", props: { level: 1 }, content: title } as PartialBlock,
    ...blocks,
  ];
}

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

/**
 * Windows/Mac/Linux 文件名兼容清洗。空白塞回为空格、保留中文/Emoji，
 * 控制字符与跨平台禁用符替换为 `-`。
 * `reservedSuffix` 是调用方还要拼上的扩展名（以及重名序号），字节数从 255 里扣掉。
 */
export function sanitizeFilenameSegment(value: string, reservedSuffix = ""): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  const cleaned = trimmed
    // eslint-disable-next-line no-control-regex -- 有意匹配控制字符以清洗文件名
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(INVALID_FILENAME_CHARS, "-")
    .replace(/\s+/g, " ")
    .replace(/^\s+/g, "")
    .replace(/[.\s]+$/g, "");
  const budget = Math.max(1, MAX_FILENAME_BYTES - filenameByteLength(reservedSuffix));
  return truncateToBytes(cleaned, budget);
}

export function splitFilePath(filePath: string): {
  dir: string;
  base: string;
  ext: string;
} {
  const norm = filePath.replace(/\\/g, "/");
  const lastSlash = norm.lastIndexOf("/");
  const dir = lastSlash >= 0 ? norm.slice(0, lastSlash) : "";
  const fileName = lastSlash >= 0 ? norm.slice(lastSlash + 1) : norm;
  const extMatch = fileName.match(/\.(md|markdown)$/i);
  const ext = extMatch ? extMatch[0] : ".md";
  const base = extMatch ? fileName.slice(0, -ext.length) : fileName;
  return { dir, base, ext };
}
