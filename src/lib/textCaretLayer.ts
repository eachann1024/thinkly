/** The body-level caret belongs to the focused field's outermost numbered layer. */
export function textCaretLayer(element: HTMLElement): number {
  let layer = 0;
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const zIndex = getComputedStyle(node).zIndex;
    if (zIndex !== "auto") {
      const value = Number(zIndex);
      if (Number.isFinite(value)) layer = value;
    }
  }
  // Stay above the field itself, while allowing higher menus/dialogs to cover it.
  return layer + 1;
}
