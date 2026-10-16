import { elementRootLayer } from "./uiLayers";

/** The body-level caret belongs to the focused field's outermost stacking layer. */
export function textCaretLayer(element: HTMLElement): number {
  // Stay above the field itself, while allowing higher menus/dialogs to cover it.
  return elementRootLayer(element) + 1;
}
