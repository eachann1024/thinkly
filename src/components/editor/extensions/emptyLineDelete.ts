import { TextSelection } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";

type ForwardDeleteEditor = {
  prosemirrorState: EditorState;
  getTextCursorPosition?: () => {
    nextBlock?: { content?: unknown };
  };
};

export function preventForwardDeleteIntoStructureBlock(
  editor: ForwardDeleteEditor,
): boolean {
  const state = editor.prosemirrorState as EditorState;
  if (!state.selection.empty || !(state.selection instanceof TextSelection)) {
    return false;
  }

  const { $from } = state.selection;
  if (
    !$from.parent.isTextblock ||
    $from.parentOffset !== $from.parent.content.size
  ) {
    return false;
  }

  const nextBlock = editor.getTextCursorPosition?.().nextBlock;
  return Boolean(nextBlock && !Array.isArray(nextBlock.content));
}

type LineDeleteEditor = {
  prosemirrorState: EditorState;
  transact: (callback: (tr: Transaction) => void) => unknown;
};

export function deleteEmptyInlineLineBackward(
  editor: LineDeleteEditor,
): boolean {
  const { selection } = editor.prosemirrorState;
  if (!(selection instanceof TextSelection) || !selection.empty) return false;
  const { $from } = selection;
  if (!$from.parent.isTextblock) return false;

  let text = "";
  $from.parent.forEach((node) => {
    text += node.isText
      ? node.text
      : node.type.name === "hardBreak"
        ? "\n"
        : "\uFFFC".repeat(node.nodeSize);
  });
  const offset = $from.parentOffset;
  const previousBreak = offset === 0 ? -1 : text.lastIndexOf("\n", offset - 1);
  const nextBreak = text.indexOf("\n", offset);
  const end = nextBreak < 0 ? text.length : nextBreak;
  if (!/^[\t ]*$/.test(text.slice(previousBreak + 1, end))) return false;
  if (previousBreak < 0 && nextBreak < 0) return false;

  const from = $from.start() + (previousBreak < 0 ? 0 : previousBreak);
  const to = $from.start() + (previousBreak < 0 ? end + 1 : end);
  editor.transact((tr) => {
    tr.delete(from, to);
    tr.setSelection(TextSelection.create(tr.doc, from));
    tr.scrollIntoView();
  });
  return true;
}

export function deleteEmptyLineBackward(editor: {
  prosemirrorState: EditorState;
  transact: (callback: (tr: Transaction) => void) => unknown;
}): boolean {
  const { selection } = editor.prosemirrorState;
  if (!(selection instanceof TextSelection) || !selection.empty) return false;
  const { $from } = selection;
  if (!$from.parent.isTextblock || $from.parent.content.size !== 0)
    return false;

  const depth = $from.depth - 1;
  if (depth < 1) return false;
  const container = $from.node(depth);
  if (container.type.name !== "blockContainer" || container.childCount !== 1) {
    return false;
  }
  const from = $from.before(depth);
  const previous = TextSelection.findFrom($from.doc.resolve(from), -1, true);
  const next =
    !previous && ["paragraph", "codeBlock"].includes($from.parent.type.name)
      ? TextSelection.findFrom(
          $from.doc.resolve(from + container.nodeSize),
          1,
          true,
        )
      : null;
  const target = previous ?? next;
  if (!target) {
    if ($from.parent.type.name === "codeBlock") {
      editor.transact((tr) => {
        tr.setNodeMarkup($from.before(), tr.doc.type.schema.nodes.paragraph);
        tr.setSelection(TextSelection.create(tr.doc, $from.start()));
      });
    }
    return true;
  }

  editor.transact((tr) => {
    tr.delete(from, from + container.nodeSize);
    tr.setSelection(TextSelection.create(tr.doc, tr.mapping.map(target.head)));
    tr.scrollIntoView();
  });
  return true;
}
