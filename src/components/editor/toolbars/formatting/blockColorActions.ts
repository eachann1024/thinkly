import type { BlockNoteEditor } from "@blocknote/core";
import { collectSelectedContentBlockIds } from "./selectionBlocks";

type Editor = BlockNoteEditor<any, any, any>;
type ColorProperty = "textColor" | "backgroundColor";
const colorProperties = ["textColor", "backgroundColor"] as const;

export function setBlockColor(editor: Editor, id: string, property: ColorProperty, value: string): void {
  editor.transact((tr) => {
    const mark = editor.pmSchema.marks[property];
    tr.doc.descendants((node, pos) => {
      if (node.type.name !== "blockContainer" || node.attrs.id !== id) return true;
      const content = node.firstChild;
      if (content && mark) tr.removeMark(pos + 2, pos + 2 + content.content.size, mark);
      return false;
    });
    editor.updateBlock(id, { props: { [property]: value } });
  });
}

export function materializeSelectedBlockColors(editor: Editor): void {
  editor.transact((tr) => {
    const ids = collectSelectedContentBlockIds(editor, tr);
    if (tr.selection.empty) {
      const position = tr.selection.$from;
      for (let depth = position.depth; depth > 0; depth--) {
        const node = position.node(depth);
        if (node.type.name === "blockContainer") { ids.add(node.attrs.id); break; }
      }
    }
    const ranges = tr.selection.ranges.map(({ $from, $to }) => ({ from: $from.pos, to: $to.pos }));
    tr.doc.descendants((node, pos) => {
      const role = node.type.spec.tableRole;
      const selectedCell = (role === "cell" || role === "header_cell") &&
        ranges.some(({ from, to }) => to >= pos + 1 && from < pos + node.nodeSize - 1);
      const selectedBlock = node.type.name === "blockContainer" && ids.has(node.attrs.id);
      if (!selectedBlock && !selectedCell) return true;
      const content = selectedCell ? node : node.firstChild;
      if (!content || content.type.name === "table") return true;
      const contentPos = selectedCell ? pos : pos + 1;
      const patch: Record<string, string> = {};
      for (const property of colorProperties) {
        const color = content.attrs[property];
        const mark = editor.pmSchema.marks[property];
        if (!mark || !color || color === "default") continue;
        if (content.type.name === "heading" && property === "backgroundColor") continue;
        content.descendants((child, offset) => {
          if (child.isText && !mark.isInSet(child.marks)) {
            tr.addMark(contentPos + 1 + offset, contentPos + 1 + offset + child.nodeSize, mark.create({ stringValue: color }));
          }
        });
        patch[property] = "default";
      }
      if (Object.keys(patch).length) tr.setNodeMarkup(contentPos, undefined, { ...content.attrs, ...patch });
      return true;
    });
  });
}

export function clearSelectedBlockColors(editor: Editor, blocks: any[]): void {
  editor.transact((tr) => {
    const ids = collectSelectedContentBlockIds(editor, tr);
    for (const block of blocks) ids.add(block.id);
    const ranges = tr.selection.ranges.map(({ $from, $to }) => ({ from: $from.pos, to: $to.pos }));
    tr.doc.descendants((node, pos) => {
      if (node.type.name === "blockContainer" && ids.has(node.attrs.id)) {
        const content = node.firstChild;
        if (content) {
          const patch = Object.fromEntries(colorProperties.filter((key) => key in content.attrs).map((key) => [key, "default"]));
          if (Object.keys(patch).length) tr.setNodeMarkup(pos + 1, undefined, { ...content.attrs, ...patch });
        }
      }
      const role = node.type.spec.tableRole;
      if ((role === "cell" || role === "header_cell") &&
          ranges.some(({ from, to }) => to > pos && from < pos + node.nodeSize)) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, textColor: "default", backgroundColor: "default", textAlignment: "left" });
      }
      return true;
    });
  });
}
