export function isHeadingBlock(block: {
  type?: string;
} | null | undefined): boolean {
  return block?.type === "heading";
}

export function queryHeadingTextRect(blockId: string, root: ParentNode = document): DOMRect | null {
  const blockEl = root.querySelector(`[data-id="${CSS.escape(blockId)}"]`);
  if (!blockEl) return null;
  const textEl = blockEl.querySelector("h1, h2, h3, .bn-inline-content");
  if (!textEl) return null;
  return textEl.getBoundingClientRect();
}

export {
  isFoldableHeadingBlock,
  readHeadingCollapsed,
  toggleHeadingCollapsed,
} from "@/components/editor/core/headingSectionFold";
