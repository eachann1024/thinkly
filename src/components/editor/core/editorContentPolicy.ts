import {
  getContentSignature,
  type BlockNoteContent,
} from "@/components/editor/utils/blocknote-content";
export function toEditorBlocks(content: unknown): BlockNoteContent {
  const blocks = Array.isArray(content) ? (content as BlockNoteContent) : [];
  if (blocks.length > 0) return blocks;
  return [{ type: "paragraph", content: "" }] as BlockNoteContent;
}

const contentSigCache = new WeakMap<object, string>();
export function getCachedContentSignature(content: unknown): string {
  if (content && typeof content === "object") {
    const key = content as object;
    const hit = contentSigCache.get(key);
    if (hit) return hit;
    const sig = getContentSignature(content);
    contentSigCache.set(key, sig);
    return sig;
  }
  return getContentSignature(content);
}
