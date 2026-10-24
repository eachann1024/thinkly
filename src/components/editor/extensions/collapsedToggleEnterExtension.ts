import { createExtension } from "@blocknote/core";
import { Plugin, TextSelection } from "prosemirror-state";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import {
  findParentBlock,
  isToggleBlock,
  readToggleCollapsed,
  type ToggleBlock,
} from "../core/toggleBlocks";
export { findParentBlock, isToggleBlock, type ToggleBlock } from "../core/toggleBlocks";

type InlineItem = {
  type: string;
  text?: string;
  content?: InlineItem[];
  [key: string]: unknown;
};

function splitInlineContent(items: InlineItem[], offset: number) {
  const before: InlineItem[] = [];
  const after: InlineItem[] = [];
  let remaining = offset;
  const lengthOf = (item: InlineItem): number => {
    if (typeof item.text === "string") return item.text.length;
    if (Array.isArray(item.content)) return item.content.reduce((sum, child) => sum + lengthOf(child), 0);
    return 1;
  };
  for (const item of items) {
    const length = lengthOf(item);
    if (remaining >= length) {
      before.push(item);
      remaining -= length;
    } else if (remaining <= 0) {
      after.push(item);
    } else if (typeof item.text === "string") {
      before.push({ ...item, text: item.text.slice(0, remaining) });
      after.push({ ...item, text: item.text.slice(remaining) });
      remaining = 0;
    } else if (Array.isArray(item.content)) {
      const inner = splitInlineContent(item.content, remaining);
      if (inner.before.length) before.push({ ...item, content: inner.before });
      if (inner.after.length) after.push({ ...item, content: inner.after });
      remaining = 0;
    } else {
      after.push(item);
      remaining = 0;
    }
  }
  return { before, after };
}

function handleEmptyToggleChild(editor: any, block: any): boolean {
  if (block.type !== "paragraph" || block.content.length || block.children.length) return false;
  const parent = findParentBlock(editor.document, block.id) as any;
  if (!parent || !isToggleBlock(parent)) return false;
  const siblings = parent.children as any[];
  const index = siblings.findIndex((child) => child.id === block.id);
  if (index < 0) return false;
  editor.transact(() => {
    if (index < siblings.length - 1) {
      const [inserted] = editor.insertBlocks([{ type: "paragraph" }], block, "after");
      editor.setTextCursorPosition(inserted, "start");
    } else {
      editor.removeBlocks([block]);
      const [inserted] = editor.insertBlocks([block], parent, "after");
      editor.setTextCursorPosition(inserted, "start");
    }
  });
  return true;
}

export const gooseCollapsedToggleEnterExtension = createExtension({
  key: "goose-collapsed-toggle-enter",
  prosemirrorPlugins: [new Plugin({
    props: {
      handleKeyDown(view, event) {
        if (!view.editable || view.composing || event.isComposing || event.keyCode === 229 ||
          event.key !== "Enter" || !isPlatformPrimaryModifierEvent(event) || event.altKey || event.shiftKey) return false;
        const { selection } = view.state;
        if (!(selection instanceof TextSelection) || !selection.$from.sameParent(selection.$to) ||
          selection.$from.parent.type.name !== "checkListItem") return false;
        const content = selection.$from.parent;
        view.dispatch(view.state.tr.setNodeMarkup(selection.$from.before(), undefined, {
          ...content.attrs, checked: !content.attrs.checked,
        }));
        return true;
      },
    },
  })],
  keyboardShortcuts: {
    "Mod-Enter": ({ editor }) => {
      if (!editor.isEditable || editor.prosemirrorView.composing) return false;
      const block = editor.getTextCursorPosition().block;
      if (!isToggleBlock(block)) return false;
      editor.updateBlock(block, { props: { collapsed: !readToggleCollapsed(block) } });
      return true;
    },
    Enter: ({ editor }) => {
      const { selection } = editor.prosemirrorState;
      if (!selection.empty) return false;
      const block = editor.getTextCursorPosition().block;
      if (!Array.isArray(block.content)) return false;
      if (handleEmptyToggleChild(editor, block)) return true;
      if (!isToggleBlock(block)) return false;

      if (block.content.length === 0) {
        if (block.children.length) {
          editor.transact(() => {
            editor.updateBlock(block, { props: { collapsed: false } });
            editor.setTextCursorPosition(block.children[0], "start");
          });
        } else {
          editor.updateBlock(block, { type: "paragraph", props: {} });
          editor.setTextCursorPosition(block, "start");
        }
        return true;
      }

      const { before, after } = splitInlineContent(block.content as InlineItem[], selection.$from.parentOffset);
      editor.transact(() => {
        if (selection.$from.parentOffset === 0) {
          editor.insertBlocks([{ type: "paragraph" }], block, "before");
          editor.setTextCursorPosition(block, "start");
          return;
        }
        editor.updateBlock(block, { content: before as any });
        if (readToggleCollapsed(block)) {
          const [inserted] = editor.insertBlocks([{ type: "paragraph", content: after } as any], block, "after");
          editor.setTextCursorPosition(inserted, "start");
        } else if (block.children.length) {
          const [inserted] = editor.insertBlocks([{ type: "paragraph", content: after } as any], block.children[0], "before");
          editor.setTextCursorPosition(inserted, "start");
        } else {
          const updated = editor.updateBlock(block, { children: [{ type: "paragraph", content: after } as any] });
          editor.setTextCursorPosition(updated.children[0], "start");
        }
      });
      return true;
    },
  },
});
