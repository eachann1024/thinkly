import type { EditorView } from "@tiptap/pm/view";

export type BlockHitRect = { top: number; bottom: number };

export function pickOwningBlockIndex(
  blocks: BlockHitRect[],
  clientY: number,
): number | null {
  if (blocks.length === 0) return null;

  let containing = -1;
  for (let i = 0; i < blocks.length; i += 1) {
    if (clientY >= blocks[i].top && clientY <= blocks[i].bottom) {
      containing = i;
    }
  }
  if (containing >= 0) return containing;

  let above = -1;
  let aboveBottom = -Infinity;
  for (let i = 0; i < blocks.length; i += 1) {
    if (blocks[i].bottom <= clientY && blocks[i].bottom >= aboveBottom) {
      above = i;
      aboveBottom = blocks[i].bottom;
    }
  }
  if (above >= 0) return above;
  return 0;
}

export function isClickInInterBlockGap(
  blocks: BlockHitRect[],
  clientY: number,
): boolean {
  if (blocks.length < 2) return false;
  for (const block of blocks) {
    if (clientY >= block.top && clientY <= block.bottom) return false;
  }
  let hasAbove = false;
  let hasBelow = false;
  for (const block of blocks) {
    if (block.bottom < clientY) hasAbove = true;
    if (block.top > clientY) hasBelow = true;
    if (hasAbove && hasBelow) return true;
  }
  return false;
}

function textblockRangeAt(
  view: EditorView,
  pos: number,
): { start: number; end: number } | null {
  const $pos = view.state.doc.resolve(pos);
  if ($pos.parent.isTextblock) {
    return { start: $pos.start(), end: $pos.end() };
  }
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (!node.isTextblock) continue;
    const start = $pos.start(depth);
    return { start, end: start + node.content.size };
  }
  return null;
}

const NON_TEXT_BLOCK_CONTENT_TYPES = new Set([
  "table",
  "image",
  "imageResize",
  "video",
  "file",
  "audio",
  "divider",
]);

export function isTextBlockContent(el: HTMLElement): boolean {
  const type = el.getAttribute("data-content-type");
  if (type && NON_TEXT_BLOCK_CONTENT_TYPES.has(type)) return false;
  if (type === "codeBlock" || type === "callout") return true;
  return Boolean(
    el.querySelector(":scope > .bn-inline-content") ||
    el.querySelector(
      ":scope > :is(h1, h2, h3, h4, h5, h6) .bn-inline-content",
    ) ||
    el.querySelector(":scope > blockquote .bn-inline-content") ||
    el.querySelector(":scope > pre") ||
    el.querySelector(":scope .bn-inline-content"),
  );
}

export function collectInlineBlockContents(editorDom: Element): HTMLElement[] {
  return [
    ...editorDom.querySelectorAll<HTMLElement>(".bn-block-content"),
  ].filter(isTextBlockContent);
}

export function closestBlockContentEl(
  target: EventTarget | null,
): HTMLElement | null {
  if (!target || typeof target !== "object") return null;
  const closest = (target as { closest?: (selector: string) => unknown })
    .closest;
  if (typeof closest !== "function") return null;
  const el = closest.call(target, ".bn-block-content");
  if (
    !el ||
    typeof (el as { querySelector?: unknown }).querySelector !== "function"
  ) {
    return null;
  }
  return el as HTMLElement;
}

export function tableCellInlineFromEventTarget(
  target: EventTarget | null,
): HTMLElement | null {
  if (!target || typeof target !== "object") return null;
  const closest = (target as { closest?: (selector: string) => unknown })
    .closest;
  if (typeof closest !== "function") return null;
  const cell = closest.call(target, "td, th");
  if (
    !cell ||
    typeof (cell as { querySelector?: unknown }).querySelector !== "function"
  ) {
    return null;
  }
  const tableBlock = closestBlockContentEl(target);
  if (!tableBlock || tableBlock.getAttribute("data-content-type") !== "table") {
    return null;
  }
  const htmlCell = cell as HTMLElement;
  return (
    htmlCell.querySelector<HTMLElement>(":scope > .bn-inline-content") ??
    htmlCell.querySelector<HTMLElement>(".bn-inline-content") ??
    htmlCell
  );
}

function inlineContentEl(contentEl: HTMLElement): HTMLElement {
  const type = contentEl.getAttribute("data-content-type");
  if (type === "codeBlock") {
    return contentEl.querySelector<HTMLElement>(":scope pre") ?? contentEl;
  }
  return (
    contentEl.querySelector<HTMLElement>(":scope > .bn-inline-content") ??
    contentEl.querySelector<HTMLElement>(
      ":scope > :is(h1, h2, h3, h4, h5, h6) .bn-inline-content",
    ) ??
    contentEl.querySelector<HTMLElement>(
      ":scope > blockquote .bn-inline-content",
    ) ??
    contentEl.querySelector<HTMLElement>(".callout-content") ??
    contentEl.querySelector<HTMLElement>(":scope .bn-inline-content") ??
    contentEl.querySelector<HTMLElement>(":scope > pre") ??
    contentEl
  );
}

export function textblockRangeFromContentEl(
  view: EditorView,
  contentEl: HTMLElement,
): { start: number; end: number } | null {
  const inline = contentEl.classList.contains("bn-block-content")
    ? inlineContentEl(contentEl)
    : contentEl;
  try {
    const pos = view.posAtDOM(inline, 0);
    return textblockRangeAt(view, pos);
  } catch {
    return null;
  }
}

export function contentBlockFromEventTarget(
  target: EventTarget | null,
): HTMLElement | null {
  const htmlEl = closestBlockContentEl(target);
  return htmlEl && isTextBlockContent(htmlEl) ? htmlEl : null;
}

export function pickTrailingBlankContentEl(
  target: EventTarget | null,
  contents: HTMLElement[],
  clientY: number,
): HTMLElement | null {
  const closest = closestBlockContentEl(target);
  if (closest && !isTextBlockContent(closest)) {
    return tableCellInlineFromEventTarget(target);
  }
  if (closest && isTextBlockContent(closest)) return closest;
  if (contents.length === 0) return null;
  return (
    contents[
      pickOwningBlockIndex(
        contents.map((el) => {
          const rect = el.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom };
        }),
        clientY,
      ) ?? -1
    ] ?? null
  );
}
