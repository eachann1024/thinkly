import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { resolveBlockEmptyClickPos } from "./trailingBlankClickGeometry";
import {
  collectInlineBlockContents,
  closestBlockContentEl,
  textblockRangeFromContentEl,
  tableCellInlineFromEventTarget,
  isTextBlockContent,
  pickTrailingBlankContentEl,
  type BlockHitRect,
} from "./trailingBlankClickBlocks";
import {
  isClickBelowTextPosition,
  startBlankDragFromPos,
} from "./trailingBlankDrag";
export {
  TRAILING_BLANK_CLICK_SLOP_PX,
  isClickPastTextRight,
  isClickOnVisualLine,
  extendToVisualLineEnd,
  extendToVisualLineStart,
  findPosOnVisualLine,
  resolveLineEndIfClickPastText,
  resolveBlockEmptyClickPos,
  type CaretCoords,
} from "./trailingBlankClickGeometry";
export {
  pickOwningBlockIndex,
  isClickInInterBlockGap,
  isTextBlockContent,
  tableCellInlineFromEventTarget,
  contentBlockFromEventTarget,
  pickTrailingBlankContentEl,
  type BlockHitRect,
} from "./trailingBlankClickBlocks";


const INTERACTIVE_CLICK_SELECTOR = [
  "input",
  "button",
  "textarea",
  "select",
  "a",
  ".bn-side-menu",
  ".bn-toggle-button",
  ".bn-table-handle",
  ".bn-table-cell-handle",
  ".goose-table-extend-button",
  "[data-file-block]",
].join(",");

export function isInteractiveCaretClickTarget(
  target: EventTarget | null,
): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) {
    return false;
  }
  return Boolean(target.closest(INTERACTIVE_CLICK_SELECTOR));
}

function textBandForContent(
  view: EditorView,
  el: HTMLElement,
  fallback: BlockHitRect,
): BlockHitRect {
  const range = textblockRangeFromContentEl(view, el);
  if (!range) return fallback;
  try {
    const first = view.coordsAtPos(range.start);
    const last = view.coordsAtPos(range.end);
    return {
      top: Math.min(first.top, last.top),
      bottom: Math.max(first.bottom, last.bottom),
    };
  } catch {
    return fallback;
  }
}

function isPointerInInterBlockGap(view: EditorView, clientY: number): boolean {
  const contents = collectInlineBlockContents(view.dom);
  if (contents.length < 2) return false;

  let hasAbove = false;
  let hasBelow = false;
  for (const el of contents) {
    const rect = el.getBoundingClientRect();
    if (rect.bottom < clientY) {
      hasAbove = true;
      continue;
    }
    if (rect.top > clientY) {
      hasBelow = true;
      if (hasAbove) return true;
      continue;
    }
    const band = textBandForContent(view, el, {
      top: rect.top,
      bottom: rect.bottom,
    });
    if (clientY >= band.top && clientY <= band.bottom) return false;
    if (band.bottom < clientY) hasAbove = true;
    if (band.top > clientY) hasBelow = true;
    if (hasAbove && hasBelow) return true;
  }
  return hasAbove && hasBelow;
}

export function resolveTrailingBlankClickPos(
  view: EditorView,
  event: MouseEvent,
): number | null {
  if (isPointerInInterBlockGap(view, event.clientY)) return null;

  const contentEl = pickTrailingBlankContentEl(
    event.target,
    collectInlineBlockContents(view.dom),
    event.clientY,
  );
  if (!contentEl) return null;

  const range = textblockRangeFromContentEl(view, contentEl);
  if (!range) return null;

  return resolveBlockEmptyClickPos({
    clientX: event.clientX,
    clientY: event.clientY,
    start: range.start,
    end: range.end,
    coordsAtPos: (pos) => view.coordsAtPos(pos),
  });
}

function shouldIgnoreTrailingBlankEvent(
  view: EditorView,
  event: MouseEvent,
): boolean {
  if (event.button !== 0) return true;
  if (event.shiftKey || event.altKey) return true;
  if (view.composing) return true;
  if (!view.editable) return true;
  return isInteractiveCaretClickTarget(event.target);
}

function isInterBlockGapEvent(view: EditorView, event: MouseEvent): boolean {
  if (tableCellInlineFromEventTarget(event.target)) return false;
  const closest = closestBlockContentEl(event.target);
  if (closest && !isTextBlockContent(closest)) return false;
  return isPointerInInterBlockGap(view, event.clientY);
}

function swallowInterBlockGapClick(
  view: EditorView,
  event: MouseEvent,
): boolean {
  if (shouldIgnoreTrailingBlankEvent(view, event)) return false;
  if (!isInterBlockGapEvent(view, event)) return false;
  if (!view.hasFocus()) view.focus();
  return true;
}

function applyTrailingBlankSelection(view: EditorView, pos: number): boolean {
  if (!view.dom.isConnected) return false;
  if (!view.state.selection.empty) return false;
  if (view.state.selection.from === pos) return false;
  view.dispatch(
    view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)),
  );
  return true;
}

function handleTrailingBlankClick(
  view: EditorView,
  _pos: number,
  event: MouseEvent,
): boolean {
  if (shouldIgnoreTrailingBlankEvent(view, event)) return false;
  const nextPos = resolveTrailingBlankClickPos(view, event);
  if (nextPos == null) return false;
  return applyTrailingBlankSelection(view, nextPos);
}

export const gooseTrailingBlankClickExtension = createExtension({
  key: "goose-trailing-blank-click",
  prosemirrorPlugins: [
    new Plugin({
      key: new PluginKey("goose-trailing-blank-click"),
      props: {
        handleDOMEvents: {
          mousedown(view, event) {
            if (swallowInterBlockGapClick(view, event)) return true;
            if (shouldIgnoreTrailingBlankEvent(view, event)) return false;
            const nextPos = resolveTrailingBlankClickPos(view, event);
            if (nextPos == null) return false;
            if (isClickBelowTextPosition(view, event.clientY, nextPos)) {
              event.preventDefault();
              const target = event.target;
              const insideBlock =
                target instanceof Element &&
                Boolean(target.closest(".bn-block-outer, .bn-block-content"));
              const blocks = view.dom.querySelectorAll<HTMLElement>(".bn-block-outer");
              const lastBlock = blocks[blocks.length - 1];
              const belowLastBlock =
                !insideBlock &&
                (!lastBlock || event.clientY >= lastBlock.getBoundingClientRect().bottom);
              if (!belowLastBlock) startBlankDragFromPos(view, event, nextPos);
              return true;
            }
            queueMicrotask(() => {
              applyTrailingBlankSelection(view, nextPos);
            });
            return false;
          },
        },
        handleClick(view, pos, event) {
          if (swallowInterBlockGapClick(view, event)) return true;
          return handleTrailingBlankClick(view, pos, event);
        },
      },
    }),
  ],
});
