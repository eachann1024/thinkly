import type { BlockNoteEditor } from "@blocknote/core";
import { isToggleBlock } from "./toggleBlocks";

export type SectionFoldBlock = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: SectionFoldBlock[];
};

export function isCollapsedProp(value: unknown): boolean {
  return value === true || value === "true";
}

export function getHeadingLevel(block: SectionFoldBlock): number {
  if (block.type !== "heading") return 0;
  const level = block.props?.level;
  if (typeof level === "number" && level > 0) return level;
  const parsed = Number(level);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function collectDescendantIds(
  blocks: SectionFoldBlock[] | undefined,
  into: Set<string> | string[],
): void {
  if (!blocks?.length) return;
  for (const child of blocks) {
    if (into instanceof Set) into.add(child.id);
    else into.push(child.id);
    collectDescendantIds(child.children, into);
  }
}

export function isFoldableHeadingBlock(
  block: { id?: string; type?: string } | null | undefined,
  firstBlockId: string | undefined,
): boolean {
  if (block?.type !== "heading" || !block.id) return false;
  if (!firstBlockId) return true;
  return block.id !== firstBlockId;
}

export function isSectionFoldHeadingBlock(
  block: SectionFoldBlock,
  firstBlockId: string | undefined,
): boolean {
  return isFoldableHeadingBlock(block, firstBlockId) && !isToggleBlock(block);
}

export function collectSectionBlockIds(
  blocks: SectionFoldBlock[],
  headingId: string,
): string[] {
  const headingIndex = blocks.findIndex((block) => block.id === headingId);
  if (headingIndex < 0) return [];

  const headingLevel = getHeadingLevel(blocks[headingIndex]);
  const hiddenIds: string[] = [];

  for (let index = headingIndex + 1; index < blocks.length; index += 1) {
    const sibling = blocks[index];
    if (
      sibling.type === "heading" &&
      getHeadingLevel(sibling) <= headingLevel
    ) {
      break;
    }
    hiddenIds.push(sibling.id);
  }

  return hiddenIds;
}

export function getSectionInsertAnchorId(
  blocks: SectionFoldBlock[],
  headingId: string,
): string {
  const ids = collectSectionBlockIds(blocks, headingId);
  return ids.length > 0 ? ids[ids.length - 1] : headingId;
}

export function captureFoldSnapshot(
  blocks: SectionFoldBlock[],
  headingId: string,
): string[] {
  return collectSectionBlockIds(blocks, headingId);
}

export function updateFoldSnapshots(
  snapshots: Map<string, string[]>,
  prevDocument: SectionFoldBlock[] | null,
  nextDocument: SectionFoldBlock[],
  firstBlockId: string | undefined,
): Map<string, string[]> {
  const nextIds = new Set<string>();
  collectDescendantIds(nextDocument, nextIds);

  const prevCollapsed = new Map<string, boolean>();
  if (prevDocument) {
    const scanPrev = (blocks: SectionFoldBlock[]) => {
      for (const block of blocks) {
        if (block.type === "heading" && block.id) {
          prevCollapsed.set(block.id, isCollapsedProp(block.props?.collapsed));
        }
        if (block.children?.length) scanPrev(block.children);
      }
    };
    scanPrev(prevDocument);
  }

  const next = new Map<string, string[]>();
  const walk = (blocks: SectionFoldBlock[]) => {
    for (const block of blocks) {
      if (
        block.type === "heading" &&
        isCollapsedProp(block.props?.collapsed) &&
        isSectionFoldHeadingBlock(block, firstBlockId)
      ) {
        const keep =
          prevDocument !== null && prevCollapsed.get(block.id) === true
            ? (snapshots.get(block.id) ?? captureFoldSnapshot(blocks, block.id))
            : captureFoldSnapshot(blocks, block.id);
        next.set(
          block.id,
          keep.filter((id) => nextIds.has(id)),
        );
      }
      if (block.children?.length) walk(block.children);
    }
  };
  walk(nextDocument);
  return next;
}

export function collectAllHiddenSectionBlockIds(
  document: SectionFoldBlock[],
  firstBlockId: string | undefined,
): Set<string> {
  const hidden = new Set<string>();

  const walk = (blocks: SectionFoldBlock[]) => {
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      if (
        block.type === "heading" &&
        isCollapsedProp(block.props?.collapsed) &&
        isSectionFoldHeadingBlock(block, firstBlockId)
      ) {
        collectSectionBlockIds(blocks, block.id).forEach((id) => hidden.add(id));
        collectDescendantIds(block.children, hidden);
      }
      if (block.children?.length) {
        walk(block.children);
      }
    }
  };

  walk(document);
  return hidden;
}

export function findCollapsedHeadingsHidingBlock(
  document: SectionFoldBlock[],
  targetBlockId: string,
  firstBlockId: string | undefined,
): string[] {
  const toExpand: string[] = [];

  const walk = (blocks: SectionFoldBlock[]) => {
    for (const block of blocks) {
      if (
        (block.type === "heading" || isToggleBlock(block)) &&
        isCollapsedProp(block.props?.collapsed) &&
        (isToggleBlock(block) || isSectionFoldHeadingBlock(block, firstBlockId))
      ) {
        const sectionIds = isToggleBlock(block) ? [] : collectSectionBlockIds(blocks, block.id);
        const nested = new Set<string>();
        collectDescendantIds(block.children, nested);
        if (sectionIds.includes(targetBlockId) || nested.has(targetBlockId)) {
          toExpand.push(block.id);
        }
      }
      if (block.children?.length) {
        walk(block.children);
      }
    }
  };

  walk(document);
  return toExpand;
}

export function readHeadingCollapsed(
  block: { props?: Record<string, unknown> } | null | undefined,
): boolean {
  return isCollapsedProp(block?.props?.collapsed);
}

export function toggleHeadingCollapsed(
  editor: BlockNoteEditor<any, any, any>,
  headingId: string,
): void {
  const block = editor.getBlock(headingId);
  if (!block || block.type !== "heading") return;
  const collapsed = readHeadingCollapsed(block);
  const hiddenIds = new Set<string>();
  if (!collapsed) {
    const collect = (blocks: SectionFoldBlock[]) => {
      for (const heading of blocks) {
        if (heading.id === headingId) {
          const sectionIds = new Set(isToggleBlock(heading) ? [] : collectSectionBlockIds(blocks, headingId));
          collectDescendantIds(
            blocks.filter((item) => sectionIds.has(item.id)),
            hiddenIds,
          );
          collectDescendantIds(heading.children, hiddenIds);
          return;
        }
        if (heading.children?.length) collect(heading.children);
      }
    };
    collect(editor.document);
  }

  editor.transact((tr) => {
    let selectionWillHide = false;
    if (hiddenIds.size > 0) {
      tr.doc.nodesBetween(tr.selection.from, tr.selection.to, (node) => {
        if (hiddenIds.has(String(node.attrs.id))) selectionWillHide = true;
      });
    }
    if (selectionWillHide) editor.setTextCursorPosition(headingId, "end");
    editor.updateBlock(block, {
      props: { collapsed: !collapsed },
    });
  });
}
