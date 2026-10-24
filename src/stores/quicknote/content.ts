import type { JSONContent, Page } from "@/types";
import { UNTITLED_PAGE_TITLE } from "@/components/editor/utils/page-title";
import type { QuickNoteSlot, QuickNoteDrafts } from "./types";
import { createEmptyLocalPageContent } from "@/components/editor/utils/blocknote-content";
import { DEFAULT_NOTEBOOK } from "@/stores/useNotebooks";

export const TEXTUAL_BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "toggleListItem",
  "quote",
  "callout",
]);

export function inlineContentHasText(content: unknown): boolean {
  if (typeof content === "string") return content.trim().length > 0;
  if (!Array.isArray(content)) return false;
  return content.some((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as { text?: unknown; content?: unknown };
    return (
      (typeof candidate.text === "string" &&
        candidate.text.trim().length > 0) ||
      inlineContentHasText(candidate.content)
    );
  });
}

export function blockHasMeaningfulContent(block: unknown): boolean {
  if (!block || typeof block !== "object") return false;
  const candidate = block as {
    type?: unknown;
    content?: unknown;
    children?: unknown;
  };
  const type = typeof candidate.type === "string" ? candidate.type : "";
  if (!type || !TEXTUAL_BLOCK_TYPES.has(type)) return true;
  if (inlineContentHasText(candidate.content)) return true;
  return (
    Array.isArray(candidate.children) &&
    candidate.children.some(blockHasMeaningfulContent)
  );
}

export function isQuickNoteDraftEmpty(content: JSONContent | null): boolean {
  if (!content) return true;
  if (Array.isArray(content)) return !content.some(blockHasMeaningfulContent);
  if (typeof content !== "object") return true;
  const root = content as { type?: unknown; content?: unknown };
  if (root.type === "doc" && Array.isArray(root.content)) {
    return !root.content.some(blockHasMeaningfulContent);
  }
  return !blockHasMeaningfulContent(root);
}

export function collectInlineText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  let text = "";
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as { text?: unknown; content?: unknown };
    if (typeof candidate.text === "string") text += candidate.text;
    else text += collectInlineText(candidate.content);
  }
  return text;
}

export function extractFirstBlockText(block: unknown): string {
  if (!block || typeof block !== "object") return "";
  const candidate = block as { content?: unknown; children?: unknown };
  const inline = collectInlineText(candidate.content).trim();
  if (inline) return inline.split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (!Array.isArray(candidate.children)) return "";
  for (const child of candidate.children) {
    const nested = extractFirstBlockText(child);
    if (nested) return nested;
  }
  return "";
}

export function getDraftBlocks(content: JSONContent | null): unknown[] {
  if (!content) return [];
  if (Array.isArray(content)) return content;
  if (typeof content !== "object") return [];
  const root = content as { type?: unknown; content?: unknown };
  if (root.type === "doc" && Array.isArray(root.content)) return root.content;
  return [content];
}

export function extractQuickNoteDraftTitle(
  content: JSONContent | null,
): string {
  for (const block of getDraftBlocks(content)) {
    const text = extractFirstBlockText(block);
    if (text) return text.slice(0, 80);
  }
  return UNTITLED_PAGE_TITLE;
}

export function getActiveDraftContent(state: {
  activeSlot: QuickNoteSlot;
  drafts: QuickNoteDrafts;
}): JSONContent | null {
  return state.drafts[state.activeSlot] ?? null;
}

export const isBlankSingleBlockDraft = (
  content: JSONContent | null,
): boolean => {
  if (!content) return true;
  if (!Array.isArray(content)) return false;
  if (content.length === 0) return true;
  if (content.length > 1) return false;
  const only = content[0] as {
    type?: string;
    content?: unknown;
    children?: unknown[];
  };
  if (Array.isArray(only.children) && only.children.length > 0) return false;
  if (!only.type || !TEXTUAL_BLOCK_TYPES.has(only.type)) return false;
  const inline = only.content;
  if (inline == null) return true;
  if (typeof inline === "string") return inline.length === 0;
  if (Array.isArray(inline)) {
    return inline.every(
      (n) =>
        typeof (n as { text?: unknown })?.text !== "string" ||
        (n as { text: string }).text.length === 0,
    );
  }
  return false;
};

export function demoteFirstHeadingToParagraph(
  content: JSONContent,
): JSONContent {
  if (!Array.isArray(content) || content.length === 0) return content;
  const first = content[0] as {
    type?: string;
    props?: Record<string, unknown>;
  };
  if (first?.type !== "heading") return content;
  const props = first.props ?? {};
  const paragraphProps: Record<string, unknown> = {};
  for (const key of ["textColor", "backgroundColor", "textAlignment"]) {
    if (props[key] !== undefined) paragraphProps[key] = props[key];
  }
  const demoted = { ...first, type: "paragraph", props: paragraphProps };
  return [demoted, ...content.slice(1)] as JSONContent;
}

export function buildQuickNoteDraftPage(content: JSONContent | null): Page {
  const now = Date.now();
  const draftContent = isBlankSingleBlockDraft(content)
    ? createEmptyLocalPageContent()
    : demoteFirstHeadingToParagraph(content as JSONContent);
  return {
    id: "__quicknote_draft__",
    workspaceId: DEFAULT_NOTEBOOK,
    parentId: undefined,
    content: draftContent,
    isFolder: false,
    isLocked: false,
    fontSize: "default",
    fontFamily: "default",
    createdAt: now,
    updatedAt: now,
    order: now,
  };
}
