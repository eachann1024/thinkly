import { createExtension } from "@blocknote/core";
import { NodeSelection, TextSelection } from "prosemirror-state";

const VOID_BLOCK_TYPES = new Set([
  "image",
  "imageResize",
  "video",
  "audio",
  "file",
  "divider",
]);

function isVoidBlockType(type: string | undefined | null): boolean {
  return Boolean(type && VOID_BLOCK_TYPES.has(type));
}

export const gooseMediaBlockEnterExtension = createExtension({
  key: "goose-media-block-enter",
  keyboardShortcuts: {
    Enter: ({ editor }) => {
      const state = editor.prosemirrorState;
      const { selection } = state;

      if (selection instanceof NodeSelection) {
        const node = selection.node;
        const typeName = node.type.name;
        if (!isVoidBlockType(typeName) && typeName !== "blockContainer") {
          const childType = node.firstChild?.type.name;
          if (!isVoidBlockType(childType)) return false;
        }

        try {
          const block = editor.getTextCursorPosition().block;
          if (!isVoidBlockType(block.type)) {
            return insertParagraphAfterSelection(editor, selection);
          }
          const [inserted] = editor.insertBlocks(
            [{ type: "paragraph", content: "" }],
            block,
            "after",
          );
          if (inserted) editor.setTextCursorPosition(inserted, "start");
          return true;
        } catch {
          return insertParagraphAfterSelection(editor, selection);
        }
      }

      try {
        const block = editor.getTextCursorPosition().block;
        if (!isVoidBlockType(block.type)) return false;
        const [inserted] = editor.insertBlocks(
          [{ type: "paragraph", content: "" }],
          block,
          "after",
        );
        if (inserted) editor.setTextCursorPosition(inserted, "start");
        return true;
      } catch {
        return false;
      }
    },
  },
});

function insertParagraphAfterSelection(
  editor: {
    prosemirrorView: {
      state: { schema: { nodes: Record<string, any> }; tr: any; doc: any };
      dispatch: (tr: any) => void;
    };
  },
  selection: NodeSelection,
): boolean {
  const view = editor.prosemirrorView;
  const paragraph = view.state.schema.nodes.paragraph;
  const blockContainer = view.state.schema.nodes.blockContainer;
  if (!paragraph || !blockContainer) return false;

  const insertPos = selection.$to.after();
  const newBlock = blockContainer.createAndFill(null, [paragraph.create()]);
  if (!newBlock) return false;

  const tr = view.state.tr.insert(insertPos, newBlock);
  const cursorPos = insertPos + 2;
  try {
    tr.setSelection(TextSelection.create(tr.doc, cursorPos));
  } catch {
  }
  view.dispatch(tr.scrollIntoView());
  return true;
}
