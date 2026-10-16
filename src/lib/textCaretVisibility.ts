import type { CaretBox } from "./textCaretGeometry";

/** A body-level caret must not paint over a menu inside the field's own scope. */
export function isTextCaretExposed(field: HTMLElement, box: CaretBox): boolean {
  const bounds = field.getBoundingClientRect();
  // Line ends can sit exactly on an input edge; sample just inside the field.
  const x = Math.max(bounds.left + 1, Math.min(box.left, bounds.right - 1));
  return [box.top + 1, box.top + box.height / 2, box.top + box.height - 1].every((y) => {
    const hit = document.elementFromPoint(x, y);
    return hit !== null && (hit === field || field.contains(hit));
  });
}
