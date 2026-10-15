import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { handleColumnKey } from "../blocks/columns/columnKeyboard";
import { columnStructurePlugin } from "../blocks/columns/columnStructure";

export const gooseColumnLayoutExtension = createExtension(({ editor }) => ({
  key: "goose-column-layout",
  runsBefore: ["goose-tab-behavior", "goose-cross-block-delete", "goose-empty-block-backspace", "goose-block-selection", "default"],
  prosemirrorPlugins: [
    new Plugin({
      key: new PluginKey("goose-column-keyboard"),
      props: { handleKeyDown: (_view, event) => handleColumnKey(editor, event) },
    }),
    columnStructurePlugin(),
  ],
}));
