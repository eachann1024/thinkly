import { createExtension } from "@blocknote/core";
import { Plugin } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { createDocumentTitlePolicyPlugin } from "../utils/documentTitlePolicy";


const INLINE_CONTENT_BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "toggleListItem",
  "quote",
  "callout",
]);

const TITLE_LEVEL = 1;

function getFirstBlock(
  doc: PMNode,
): { containerPos: number; container: PMNode; content: PMNode } | null {
  let result: { containerPos: number; container: PMNode; content: PMNode } | null =
    null;
  doc.descendants((node, pos) => {
    if (result) return false;
    if (node.type.name === "blockContainer") {
      const content = node.firstChild;
      if (content) result = { containerPos: pos, container: node, content };
      return false;
    }
    return true;
  });
  return result;
}

function firstTitleGuardPlugin(
  usesRawContentRef: { current: boolean } = { current: false },
) {
  return new Plugin({
    appendTransaction(
      transactions: readonly Transaction[],
      _oldState: EditorState,
      newState: EditorState,
    ) {
      if (!transactions.some((tr) => tr.docChanged)) return null;
      if (usesRawContentRef.current) return null;

      const first = getFirstBlock(newState.doc);
      if (!first) return null;

      const { containerPos, content } = first;
      const contentTypeName = content.type.name;
      const level = (content.attrs?.level as number | undefined) ?? null;

      if (
        contentTypeName === "heading" && level === TITLE_LEVEL &&
        content.attrs.isToggleable !== true && content.attrs.collapsed !== true
      ) return null;

      const headingType = newState.schema.nodes.heading;
      if (!headingType) return null;

      const tr = newState.tr;
      const contentPos = containerPos + 1;

      if (INLINE_CONTENT_BLOCK_TYPES.has(contentTypeName)) {
        tr.setNodeMarkup(contentPos, headingType, {
          ...content.attrs,
          level: TITLE_LEVEL,
          isToggleable: false,
          collapsed: false,
        });
        return tr.steps.length > 0 ? tr : null;
      }

      const blockContainerType = newState.schema.nodes.blockContainer;
      if (!blockContainerType) return null;
      const emptyHeading = blockContainerType.createAndFill(null, [
        headingType.create({ level: TITLE_LEVEL }),
      ]);
      if (!emptyHeading) return null;
      tr.insert(containerPos, emptyHeading);
      return tr.steps.length > 0 ? tr : null;
    },
  });
}

export function createGooseFirstTitleGuardExtension(
  usesRawContentRef: { current: boolean },
) {
  return createExtension({
    key: "goose-first-title-guard",
    prosemirrorPlugins: [
      createDocumentTitlePolicyPlugin(usesRawContentRef),
      firstTitleGuardPlugin(usesRawContentRef),
    ],
  });
}

export const gooseFirstTitleGuardExtension = createGooseFirstTitleGuardExtension({
  current: false,
});
