import type { Node } from "prosemirror-model";
import {
  TextSelection,
  type Selection,
  type Transaction,
} from "prosemirror-state";

/** Code editing only owns a text selection wholly inside one code block. */
export function getCodeBlockSelection(selection: Selection) {
  if (!(selection instanceof TextSelection)) return null;
  const { $anchor, $head } = selection;
  if (
    $anchor.parent !== $head.parent ||
    $head.parent.type.name !== "codeBlock"
  ) {
    return null;
  }
  return {
    node: $head.parent,
    depth: $head.depth,
    start: $head.start(),
    anchor: $anchor.parentOffset,
    head: $head.parentOffset,
  };
}

export function getCodeBlockText(node: Node) {
  return node.textBetween(0, node.content.size, "\n", "\n");
}

export function replaceCodeBlockText(
  tr: Transaction,
  text: string,
  anchor: number,
  head = anchor,
) {
  const code = getCodeBlockSelection(tr.selection);
  if (!code) return false;
  tr.replaceWith(
    code.start,
    code.start + code.node.content.size,
    text ? tr.doc.type.schema.text(text) : [],
  );
  tr.setSelection(
    TextSelection.create(tr.doc, code.start + anchor, code.start + head),
  );
  tr.setStoredMarks([]);
  return true;
}

export function insertCodeBlockText(tr: Transaction, text: string) {
  const code = getCodeBlockSelection(tr.selection);
  if (!code) return false;
  const from = Math.min(code.anchor, code.head);
  const to = Math.max(code.anchor, code.head);
  const current = getCodeBlockText(code.node);
  // Canonical code content uses literal newlines, including legacy hardBreaks.
  return replaceCodeBlockText(
    tr,
    current.slice(0, from) + text + current.slice(to),
    from + text.length,
  );
}
