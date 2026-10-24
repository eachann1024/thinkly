import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey } from "prosemirror-state";

const PLUGIN_KEY = new PluginKey("goose-code-block-link-strip");

export const gooseCodeBlockLinkStripExtension = createExtension({
  key: "goose-code-block-link-strip",
  prosemirrorPlugins: [
    new Plugin({
      key: PLUGIN_KEY,
      appendTransaction(transactions, _oldState, newState) {
        if (!transactions.some((t) => t.docChanged)) return null;

        const ranges: Array<{ from: number; to: number }> = [];
        newState.doc.descendants((node, pos) => {
          if (node.type.name !== "codeBlock") return true;
          node.descendants((child, offset) => {
            if (!child.isText) return true;
            if (child.marks.length === 0) return true;
            const from = pos + 1 + offset;
            ranges.push({ from, to: from + child.nodeSize });
            return false;
          });
          return false;
        });

        if (ranges.length === 0) return null;
        const tr = newState.tr;
        for (const r of ranges) tr.removeMark(r.from, r.to);
        return tr;
      },
    }),
  ],
});
