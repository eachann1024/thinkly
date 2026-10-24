import type { Page } from "@/types";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { normalizePageContent } from "@/components/editor/utils/blocknote-content";
import { inlineExportMediaAsBase64 } from "./inlineImagesBase64";

type ExportBlock = {
  type?: string;
  children?: ExportBlock[];
  [key: string]: unknown;
};

export function flattenHeadingChildrenForExport<T extends ExportBlock>(
  blocks: T[],
): T[] {
  if (!Array.isArray(blocks)) return [];
  const out: T[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") {
      out.push(block);
      continue;
    }
    const children = Array.isArray(block.children) ? block.children : undefined;
    if (block.type === "heading" && children && children.length > 0) {
      const { children: nested, ...rest } = block;
      out.push({ ...(rest as T), children: [] as T[] });
      out.push(...flattenHeadingChildrenForExport(nested as T[]));
      continue;
    }
    if (children && children.length > 0) {
      out.push({
        ...block,
        children: flattenHeadingChildrenForExport(children as T[]),
      });
      continue;
    }
    out.push(block);
  }
  return out;
}

function asInlineContent(content: unknown): unknown[] {
  if (Array.isArray(content)) return content;
  if (typeof content === "string") {
    return content ? [{ type: "text", text: content, styles: {} }] : [];
  }
  return [];
}

function sanitizeExportBlock(block: unknown): Record<string, unknown> {
  if (!block || typeof block !== "object") {
    return { type: "paragraph", content: [] };
  }
  const next = { ...(block as Record<string, unknown>) };
  if (next.type !== "table") {
    next.content = asInlineContent(next.content);
  }
  if (Array.isArray(next.children)) {
    next.children = next.children.map(sanitizeExportBlock);
  } else {
    next.children = [];
  }
  return next;
}

export function cloneExportBlocks(
  content: Page["content"] | unknown,
  options?: { ensureFirstTitle?: boolean },
): BlockNoteContent {
  const normalized = Array.isArray(content)
    ? (structuredClone(content) as BlockNoteContent)
    : normalizePageContent(content as never, {
        ensureFirstTitle: options?.ensureFirstTitle,
      });
  return flattenHeadingChildrenForExport(
    normalized as ExportBlock[],
  ).map(sanitizeExportBlock) as BlockNoteContent;
}

export async function prepareExportBlocks(page: Page): Promise<BlockNoteContent> {
  const blocks = cloneExportBlocks(page.content, {
    ensureFirstTitle: !page.localFilePath,
  });
  await inlineExportMediaAsBase64(blocks, page.localFilePath);
  return blocks;
}
