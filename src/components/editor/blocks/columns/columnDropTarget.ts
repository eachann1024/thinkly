import type { ColumnDropSide } from "./columnDropTransaction";

export function columnDropSide(rect: Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width">, x: number, y: number): ColumnDropSide | null {
  if (rect.width < 80 || y < rect.top || y > rect.bottom) return null;
  const inset = Math.min(28, rect.width / 5);
  if (x >= rect.right - inset && x <= rect.right + 36) return "right";
  if (x >= rect.left - 36 && x <= rect.left + inset) return "left";
  return null;
}

export function columnDropTarget(root: HTMLElement, x: number, y: number) {
  const bounds = root.getBoundingClientRect();
  if (x < bounds.left - 36 || x > bounds.right + 36 || y < bounds.top || y > bounds.bottom) return null;
  const hit = root.ownerDocument.elementFromPoint(Math.max(bounds.left + 2, Math.min(bounds.right - 2, x)), y);
  if (!hit || !root.contains(hit)) return null;
  let block = hit.closest<HTMLElement>('[data-node-type="blockContainer"]');
  while (block && root.contains(block)) {
    const content = block.querySelector<HTMLElement>(":scope > .bn-block > .bn-block-content, :scope > .bn-block-content");
    const type = content?.dataset.contentType;
    // Within a column, the column edge inserts a sibling column, not a nested layout.
    const section = block.parentElement?.closest<HTMLElement>('[data-node-type="blockContainer"]');
    const sectionContent = section?.querySelector<HTMLElement>(":scope > .bn-block > .bn-block-content, :scope > .bn-block-content");
    if (sectionContent?.dataset.contentType === "columnSection") block = section!;
    const rect = block.getBoundingClientRect();
    const side = columnDropSide(rect, x, y);
    if (side && type !== "columnLayout") return { id: block.dataset.id!, side, rect };
    block = block.parentElement?.closest<HTMLElement>('[data-node-type="blockContainer"]') ?? null;
  }
  return null;
}
