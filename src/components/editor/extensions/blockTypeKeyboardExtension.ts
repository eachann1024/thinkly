import { createExtension, type BlockNoteEditor } from "@blocknote/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { getPlatformKind } from "@/lib/utils";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import { getProtectedTitleBlockId } from "../utils/documentTitlePolicy";
import { getBlocksToMove } from "./moveBlockExtension";

const TYPES = ["paragraph", "heading", "heading", "heading", "checkListItem", "bulletListItem", "numberedListItem", null, "codeBlock"] as const;

export function changeSelectedBlockType(editor: BlockNoteEditor<any, any, any>, digit: number, defaultCodeWrap: boolean): boolean {
  const type = TYPES[digit];
  if (!editor.isEditable || editor.prosemirrorView.composing || !type) return false;
  const title = getProtectedTitleBlockId(editor);
  const blocks = (getBlocksToMove(editor) as any[]).filter((block) => (
    block.id !== title && editor.schema.blockSchema[block.type]?.content === "inline"
  ));
  const ids = new Set(blocks.map((block) => block.id));
  const roots = blocks.filter((block) => {
    let parent = editor.getParentBlock(block);
    while (parent) {
      if (ids.has(parent.id)) return false;
      parent = editor.getParentBlock(parent);
    }
    return true;
  });
  editor.transact(() => roots.forEach((block) => {
    const props = type === "heading" ? { level: digit, isToggleable: false, collapsed: false }
      : type === "codeBlock" && block.type !== "codeBlock" ? { language: "text", wrap: defaultCodeWrap }
        : {};
    editor.updateBlock(block, { type, props });
  }));
  return true;
}

export function createGooseBlockTypeKeyboardExtension(getDefaultCodeWrap: () => boolean) {
  return createExtension(({ editor }) => ({
    key: "goose-block-type-keyboard",
    runsBefore: ["goose-heading-shortcuts", "default"],
    prosemirrorPlugins: [new Plugin({
      key: new PluginKey("goose-block-type-keyboard"),
      props: {
        handleKeyDown(view, event) {
          if (view.composing || event.isComposing || event.keyCode === 229) return false;
          if (!isPlatformPrimaryModifierEvent(event)) return false;
          const mac = getPlatformKind() === "mac";
          if (mac ? !event.altKey || event.shiftKey : !event.shiftKey || event.altKey) return false;
          const digit = event.code.match(/^Digit([0-8])$/)?.[1] ?? event.key.match(/^[0-8]$/)?.[0];
          return digit !== undefined && changeSelectedBlockType(editor, Number(digit), getDefaultCodeWrap());
        },
      },
    })],
  }));
}
