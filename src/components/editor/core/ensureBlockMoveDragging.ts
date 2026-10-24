import { DOMParser, Slice } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

export function ensureBlockMoveDragging(
  view: EditorView | null | undefined,
  dataTransfer: DataTransfer | null,
): void {
  if (!view || view.dragging || !dataTransfer) return;
  const html = dataTransfer.getData("blocknote/html");
  if (!html) return;
  const blockGroup = view.state.schema.nodes.blockGroup;
  if (!blockGroup) return;
  const element = document.createElement("div");
  element.innerHTML = html;
  const parser = DOMParser.fromSchema(view.state.schema);
  const node = parser.parse(element, {
    topNode: blockGroup.create(),
  });
  view.dragging = {
    slice: new Slice(node.content, 0, 0),
    move: true,
  };
}
