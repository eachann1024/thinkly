import type { Node } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";

export function forEachSelectedTextNode(
  { selection, doc }: EditorState,
  visit: (node: Node) => void,
) {
  for (const { $from, $to } of selection.ranges) {
    const from = $from.pos;
    const to = $to.pos;
    doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText) return true;
      if (Math.min(to, pos + node.nodeSize) > Math.max(from, pos)) visit(node);
      return false;
    });
  }
}
