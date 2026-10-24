import type { DragEvent } from "react";

export const MAIN_TREE_INDENT = 18;
export const MAIN_TREE_ROW_PADDING_LEFT = 6;

export function normalizeMainTreeDragOver<T extends HTMLElement>(
  event: DragEvent<T>,
  tree: HTMLElement,
): DragEvent<T> {
  const rows = tree.querySelectorAll<HTMLElement>(
    "[data-rct-item-container='true']",
  );
  const first = rows[0];
  if (!first) return event;
  const style = getComputedStyle(first);
  const height =
    first.offsetHeight +
    Math.max(parseFloat(style.marginTop), parseFloat(style.marginBottom));
  if (!(height > 0)) return event;
  const position = (event.clientY - tree.getBoundingClientRect().top) / height;
  if (position % 1 !== 0.5) return event;
  const marker = rows[Math.floor(position)]?.querySelector(
    "[data-main-tree-folder='false']",
  );
  if (!marker) return event;
  return Object.assign(Object.create(event), { clientY: event.clientY + 0.01 });
}

export function dropLineTopPx(
  linearIndex: number,
  rowOffsets: number[],
  lastRowHeight: number,
): number {
  if (rowOffsets.length === 0) return 0;
  if (linearIndex < rowOffsets.length) {
    return rowOffsets[linearIndex] ?? 0;
  }
  const last = rowOffsets[rowOffsets.length - 1] ?? 0;
  return last + lastRowHeight;
}
