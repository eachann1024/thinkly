import { normalizeAiMarkdown } from "./markdown";
import { inheritPresentationFromSource } from "./inheritPresentation";
import {
  serializeBlocksToMarkdown,
  parseMarkdownToBlocks,
} from "./inlineMarkdownCodec";
import messages from "./inlineMarkdownApply.messages.yaml";
import { createTranslator } from "@/i18n";
const t = createTranslator(messages);

export {
  serializeBlocksToMarkdown,
  parseMarkdownToBlocks,
} from "./inlineMarkdownCodec";

export type InlineEditMode = "selection" | "cursor";

export interface InlineEditTarget {
  sourceBlockIds: string[];
  oldMarkdown: string;
  mode: InlineEditMode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InlineMarkdownEditor = {
  document?: unknown[];
  getSelection?: () => { blocks?: Array<{ id?: string }> } | undefined;
  getTextCursorPosition: () => { block: { id?: string } };
  getBlock?: (id: string) => unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocksToMarkdownLossy?: (blocks?: any[]) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tryParseMarkdownToBlocks?: (markdown: string) => any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transact: (callback: any) => unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replaceBlocks: (
    sourceBlockIds: string[],
    replacementBlocks: any[],
  ) => unknown;
  undo?: () => boolean;
};

export interface InlineBlockSnapshot {
  blocks: unknown[];
  sourceBlockIds: string[];
}

function asBlocksWithIds(
  blocks: Array<{ id?: string }> | undefined,
): Array<{ id: string }> {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter(
    (block): block is { id: string } =>
      !!block && typeof block.id === "string" && block.id.length > 0,
  );
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function toReplacementBlocks(blocks: unknown[]): unknown[] {
  return blocks.map((block) => {
    if (!block || typeof block !== "object") return block;
    const { id: _id, ...rest } = block as Record<string, unknown>;
    if (Array.isArray(rest.children)) {
      rest.children = toReplacementBlocks(rest.children);
    }
    return rest;
  });
}

export function snapshotBlocks(
  editor: InlineMarkdownEditor,
  sourceBlockIds: string[],
): InlineBlockSnapshot {
  const blocks: unknown[] = [];
  const foundIds: string[] = [];
  for (const id of sourceBlockIds) {
    const live =
      typeof editor.getBlock === "function" ? editor.getBlock(id) : null;
    if (!live) continue;
    blocks.push(cloneValue(live));
    foundIds.push(id);
  }
  if (blocks.length === 0) {
    throw new Error(t("theTargetBlockIsNoLongerInThe"));
  }
  return { blocks, sourceBlockIds: foundIds };
}

export function restoreBlocks(
  editor: InlineMarkdownEditor,
  snapshot: InlineBlockSnapshot,
  newBlockIds: string[],
): void {
  if (!snapshot.blocks.length) return;
  const idsToRemove =
    newBlockIds.length > 0 ? newBlockIds : snapshot.sourceBlockIds;
  editor.transact(() => {
    editor.replaceBlocks(idsToRemove, snapshot.blocks as never);
  });
}

export function serializeInlineEditTarget(
  editor: InlineMarkdownEditor,
): InlineEditTarget {
  const selected = asBlocksWithIds(editor.getSelection?.()?.blocks);
  if (selected.length > 0) {
    const fullBlocks = selected.map((block) => {
      const live =
        typeof editor.getBlock === "function"
          ? editor.getBlock(block.id)
          : null;
      return live ?? block;
    });
    return {
      sourceBlockIds: selected.map((b) => b.id),
      oldMarkdown: serializeBlocksToMarkdown(editor, fullBlocks),
      mode: "selection",
    };
  }

  const cursorBlock = editor.getTextCursorPosition().block;
  const cursorId =
    cursorBlock && typeof cursorBlock.id === "string" ? cursorBlock.id : "";
  if (!cursorId) {
    throw new Error(t("theCurrentBlockCouldNotBeLocatedPlace"));
  }
  const live =
    typeof editor.getBlock === "function"
      ? editor.getBlock(cursorId)
      : cursorBlock;
  return {
    sourceBlockIds: [cursorId],
    oldMarkdown: serializeBlocksToMarkdown(editor, [live ?? cursorBlock]),
    mode: "cursor",
  };
}

export interface ApplyMarkdownToInlineTargetOptions {
  sourceBlockIds: string[];
}

export interface ApplyMarkdownToInlineTargetResult {
  replacedCount: number;
  blockCount: number;
  newBlockIds: string[];
}

export function applyMarkdownToInlineTarget(
  editor: InlineMarkdownEditor,
  newMarkdown: string,
  options: ApplyMarkdownToInlineTargetOptions,
): ApplyMarkdownToInlineTargetResult {
  const requestedIds = (options.sourceBlockIds ?? []).filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  const sourceBlockIds =
    typeof editor.getBlock === "function"
      ? requestedIds.filter((id) => Boolean(editor.getBlock?.(id)))
      : requestedIds;
  if (sourceBlockIds.length === 0) {
    throw new Error(
      requestedIds.length === 0
        ? t("noTargetBlockWasProvidedForReplacement")
        : t("theTargetBlockIsNoLongerInThe"),
    );
  }

  const normalized = normalizeAiMarkdown(newMarkdown ?? "").trim();
  if (!normalized) {
    throw new Error(t("aiDidNotReturnAnyContentThatCould"));
  }

  const parsed = parseMarkdownToBlocks(editor, normalized);
  const sourceBlocks = sourceBlockIds
    .map((id) =>
      typeof editor.getBlock === "function" ? editor.getBlock(id) : null,
    )
    .filter((block) => !!block);
  const replacementBlocks = toReplacementBlocks(
    inheritPresentationFromSource(sourceBlocks, parsed),
  );
  if (replacementBlocks.length === 0) {
    throw new Error(t("theAiResponseCouldNotBeParsedInto"));
  }

  const firstSourceId = sourceBlockIds[0];
  const docBefore = Array.isArray(editor.document)
    ? (editor.document as Array<{ id?: string }>)
    : [];
  const startIndex = docBefore.findIndex((b) => b?.id === firstSourceId);

  editor.transact(() => {
    editor.replaceBlocks(sourceBlockIds, replacementBlocks);
  });

  const docAfter = Array.isArray(editor.document)
    ? (editor.document as Array<{ id?: string }>)
    : [];
  const newBlockIds: string[] = [];
  if (startIndex >= 0) {
    for (let i = 0; i < replacementBlocks.length; i++) {
      const block = docAfter[startIndex + i];
      if (block && typeof block.id === "string") {
        newBlockIds.push(block.id);
      }
    }
  } else {
    const sourceSet = new Set(sourceBlockIds);
    for (const block of docAfter) {
      if (block?.id && !sourceSet.has(block.id)) {
      }
    }
  }

  return {
    replacedCount: sourceBlockIds.length,
    blockCount: replacementBlocks.length,
    newBlockIds:
      newBlockIds.length === replacementBlocks.length
        ? newBlockIds
        :
          collectNewBlockIds(
            docBefore,
            docAfter,
            sourceBlockIds,
            replacementBlocks.length,
          ),
  };
}

function collectNewBlockIds(
  before: Array<{ id?: string }>,
  after: Array<{ id?: string }>,
  sourceBlockIds: string[],
  expectedCount: number,
): string[] {
  const beforeIds = new Set(
    before.map((b) => b?.id).filter((id): id is string => !!id),
  );
  const sourceSet = new Set(sourceBlockIds);
  const added = after
    .map((b) => b?.id)
    .filter(
      (id): id is string => !!id && !beforeIds.has(id) && !sourceSet.has(id),
    );
  if (added.length === expectedCount) return added;

  const firstIdx = after.findIndex((b) => b?.id === sourceBlockIds[0]);
  if (firstIdx >= 0) {
    return after
      .slice(firstIdx, firstIdx + expectedCount)
      .map((b) => b?.id)
      .filter((id): id is string => !!id);
  }
  return added.slice(0, expectedCount);
}
