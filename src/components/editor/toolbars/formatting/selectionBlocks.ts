import type { BlockNoteEditor } from "@blocknote/core";

export function resolveFormattingToolbarAiBlockId(
  editor: BlockNoteEditor<any, any, any>,
): string | null {
  try {
    const cursorBlock = editor.getTextCursorPosition()?.block;
    if (cursorBlock?.id) return cursorBlock.id;
  } catch {
  }

  try {
    const selected = editor.getSelection()?.blocks;
    const first = selected?.[0];
    if (first?.id) return first.id;
  } catch {
  }

  try {
    const { selection, doc } = editor.prosemirrorState;
    const $pos = selection.$from;
    for (let d = $pos.depth; d > 0; d -= 1) {
      const node = $pos.node(d);
      if (
        node.type.name === "blockContainer" &&
        typeof node.attrs?.id === "string"
      ) {
        return node.attrs.id;
      }
    }
    for (let d = $pos.depth; d > 0; d -= 1) {
      const node = $pos.node(d);
      if (typeof node.attrs?.id === "string" && node.attrs.id) {
        return node.attrs.id;
      }
    }
    void doc;
  } catch {
  }

  return null;
}
export function collectSelectedContentBlockIds(
  editor: BlockNoteEditor<any, any, any>,
): Set<string> {
  const ids = new Set<string>();
  const { selection, doc } = editor.prosemirrorState;
  doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
    if (node.type?.name !== "blockContainer") return true;
    const id = node.attrs?.id;
    if (typeof id !== "string") return true;
    const content = node.firstChild;
    if (!content) return true;

    const contentFrom = pos + 2;
    const contentSize = content.content.size;
    const covered =
      contentSize > 0
        ? Math.min(selection.to, contentFrom + contentSize) >
          Math.max(selection.from, contentFrom)
        : selection.from <= pos && selection.to >= pos + node.nodeSize;
    if (covered) ids.add(id);
    return true;
  });
  return ids;
}

export function dropBlocksWithoutSelectedContent(
  editor: BlockNoteEditor<any, any, any>,
  blocks: any[],
): any[] {
  if (blocks.length <= 1) return blocks;

  let covered: Set<string>;
  try {
    covered = collectSelectedContentBlockIds(editor);
  } catch {
    return blocks;
  }
  if (covered.size === 0) return blocks;

  const filtered = blocks.filter((block: any) => covered.has(block?.id));
  return filtered.length > 0 ? filtered : blocks;
}

export function getSelectedBlocksSafe(
  editor: BlockNoteEditor<any, any, any>,
): any[] {
  try {
    const selected = editor.getSelection()?.blocks;
    if (selected && selected.length > 0) {
      return dropBlocksWithoutSelectedContent(editor, selected);
    }
  } catch {
  }

  try {
    const cursorBlock = editor.getTextCursorPosition()?.block;
    if (cursorBlock) return [cursorBlock];
  } catch {
  }

  try {
    const { selection, doc } = editor.prosemirrorState;
    const ids = new Set<string>();
    doc.nodesBetween(selection.from, selection.to, (node: any) => {
      if (
        node.type?.name === "blockContainer" &&
        typeof node.attrs?.id === "string"
      ) {
        ids.add(node.attrs.id);
      }
      return true;
    });
    if (ids.size === 0) {
      for (let d = selection.$from.depth; d > 0; d -= 1) {
        const node = selection.$from.node(d);
        if (
          node.type?.name === "blockContainer" &&
          typeof node.attrs?.id === "string"
        ) {
          ids.add(node.attrs.id);
          break;
        }
      }
    }
    if (ids.size === 0) return [];
    return dropBlocksWithoutSelectedContent(
      editor,
      editor.document.filter((block: any) => ids.has(block.id)),
    );
  } catch {
    return [];
  }
}
