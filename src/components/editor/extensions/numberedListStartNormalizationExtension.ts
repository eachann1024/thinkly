import { createExtension } from "@blocknote/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";

const PLUGIN_KEY = new PluginKey("goose-numbered-list-start-normalization");

function findRedundantStartPositions(doc: PMNode): number[] {
  const positions: number[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== "blockGroup") return true;

    let previousWasNumbered = false;
    node.forEach((container, offset) => {
      const content =
        container.type.name === "blockContainer" ? container.firstChild : null;
      const isNumbered = content?.type.name === "numberedListItem";

      if (isNumbered && previousWasNumbered && content?.attrs.start != null) {
        positions.push(pos + 1 + offset + 1);
      }
      previousWasNumbered = isNumbered;
    });

    return true;
  });

  return positions;
}

function numberedListStartNormalizationPlugin(usesRawContentRef: {
  current: boolean;
}) {
  return new Plugin({
    key: PLUGIN_KEY,
    appendTransaction(
      transactions: readonly Transaction[],
      _oldState: EditorState,
      newState: EditorState,
    ) {
      if (!transactions.some((tr) => tr.docChanged)) return null;
      if (usesRawContentRef.current) return null;

      const positions = findRedundantStartPositions(newState.doc);
      if (positions.length === 0) return null;

      const tr = newState.tr;
      for (const pos of positions) {
        const node = tr.doc.nodeAt(pos);
        if (!node || node.type.name !== "numberedListItem") continue;
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          start: undefined,
        });
      }
      return tr.steps.length > 0 ? tr : null;
    },
  });
}

export function createGooseNumberedListStartNormalizationExtension(usesRawContentRef: {
  current: boolean;
}) {
  return createExtension({
    key: "goose-numbered-list-start-normalization",
    prosemirrorPlugins: [
      numberedListStartNormalizationPlugin(usesRawContentRef),
    ],
  });
}
