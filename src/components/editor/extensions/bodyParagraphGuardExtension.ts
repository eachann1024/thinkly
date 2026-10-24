import { createExtension } from "@blocknote/core";
import { Plugin } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";


const TITLE_LEVEL = 1;

function countTopLevelBlockContainers(doc: PMNode): number {
  const blockGroup = doc.firstChild;
  if (!blockGroup || blockGroup.type.name !== "blockGroup") return 0;
  let top = 0;
  blockGroup.forEach((child) => {
    if (child.type.name === "blockContainer") top += 1;
  });
  return top;
}

function getFirstTopLevelContainer(
  doc: PMNode,
): { containerPos: number; content: PMNode } | null {
  const blockGroup = doc.firstChild;
  if (!blockGroup || blockGroup.type.name !== "blockGroup") return null;
  if (blockGroup.childCount < 1) return null;
  const container = blockGroup.child(0);
  if (container.type.name !== "blockContainer") return null;
  const content = container.firstChild;
  if (!content) return null;
  return { containerPos: 1, content };
}

function bodyParagraphGuardPlugin(
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

      if (countTopLevelBlockContainers(newState.doc) !== 1) return null;

      const first = getFirstTopLevelContainer(newState.doc);
      if (!first) return null;
      if (first.content.type.name !== "heading") return null;
      const level =
        typeof first.content.attrs?.level === "number"
          ? first.content.attrs.level
          : null;
      if (level !== TITLE_LEVEL) return null;

      const paragraphType = newState.schema.nodes.paragraph;
      const blockContainerType = newState.schema.nodes.blockContainer;
      if (!paragraphType || !blockContainerType) return null;

      const emptyParagraph = blockContainerType.createAndFill(null, [
        paragraphType.create(),
      ]);
      if (!emptyParagraph) return null;

      const containerNode = newState.doc.nodeAt(first.containerPos);
      if (!containerNode) return null;
      const afterContainer = first.containerPos + containerNode.nodeSize;

      const tr = newState.tr.insert(afterContainer, emptyParagraph);
      return tr.steps.length > 0 ? tr : null;
    },
  });
}

export function createGooseBodyParagraphGuardExtension(
  usesRawContentRef: { current: boolean },
) {
  return createExtension({
    key: "goose-body-paragraph-guard",
    prosemirrorPlugins: [bodyParagraphGuardPlugin(usesRawContentRef)],
  });
}

export const gooseBodyParagraphGuardExtension =
  createGooseBodyParagraphGuardExtension({ current: false });
