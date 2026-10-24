import { BlockNoteEditor } from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";
import { clearSelectionFormatting } from "@/components/editor/toolbars/formatting/formattingActions";
import { createChecker } from "./lib/check";

const { check, failed } = createChecker();

function editorWith(content: any[]) {
  return BlockNoteEditor.create({ initialContent: content });
}

function selectAllText(editor: BlockNoteEditor<any, any, any>) {
  const { doc } = editor.prosemirrorState;
  let from = 0;
  let to = 0;
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    if (!from) from = pos;
    to = pos + node.text.length;
    return false;
  });
  editor.transact((tr) => {
    tr.setSelection(TextSelection.create(tr.doc, from, to));
  });
}

function markNames(editor: BlockNoteEditor<any, any, any>): string[] {
  const names = new Set<string>();
  editor.prosemirrorState.doc.descendants((node) => {
    if (!node.isText) return true;
    for (const mark of node.marks) names.add(mark.type.name);
    return false;
  });
  return [...names].sort();
}

const styled = editorWith([{
  type: "paragraph",
  props: { textAlignment: "center" },
  content: [{
    type: "text",
    text: "格式",
    styles: { bold: true, italic: true, textColor: "red", backgroundColor: "yellow" },
  }],
}]);
selectAllText(styled);
clearSelectionFormatting(styled);
check("行内样式和颜色被清掉", markNames(styled).join(",") === "", markNames(styled));
check("对齐回到左", styled.document[0]?.props?.textAlignment === "left", styled.document[0]?.props);
check("文字还在", styled.document[0]?.content?.[0]?.text === "格式");

const linked = editorWith([{
  type: "paragraph",
  content: [{ type: "text", text: "链接", styles: { bold: true } }],
}]);
const link = linked.pmSchema.marks.link?.create({ href: "https://example.com" });
linked.transact((tr) => {
  tr.doc.descendants((node, pos) => {
    if (node.isText && link) tr.addMark(pos, pos + node.nodeSize, link);
  });
});
selectAllText(linked);
clearSelectionFormatting(linked);
check("链接不被清除格式去掉", markNames(linked).join(",") === "link", markNames(linked));

export default function run() {
  return failed;
}
