import type { JSONContent } from "@/types";
import { jsonContentToMarkdown } from "@/lib/export/markdown/serialize";
import { inheritPresentationFromSource } from "../inheritPresentation";
import { normalizePageContent } from "@/components/editor/utils/blocknote-content";
import {
  getTopLevelBlocks,
  cloneBlocks,
  parseFragment,
  reattachPreservedBlockIds,
  alignBlocksByMarkdownFingerprint,
} from "./surgicalBlocks";
import {
  buildSegments,
  joinSegments,
  findAllOccurrences,
  findWhitespaceFlexible,
  mapCharRangeToBlocks,
  locateInRegion,
} from "./surgicalMatching";
export { alignBlocksByMarkdownFingerprint } from "./surgicalBlocks";

export interface SurgicalSearchReplaceSuccess {
  ok: true;
  content: JSONContent;
  replacedCount: number;
  touchedBlockCount: number;
}

export interface SurgicalSearchReplaceFailure {
  ok: false;
  error: string;
  currentMarkdownPreview?: string;
}

export type SurgicalSearchReplaceResult =
  | SurgicalSearchReplaceSuccess
  | SurgicalSearchReplaceFailure;

export interface FullEditMergeResult {
  content: JSONContent;
  preservedBlockCount: number;
  replacedBlockCount: number;
}

function applyOneMatch(
  blocks: any[],
  find: string,
  newString: string,
  matchStart: number,
  matchLength: number,
): { touched: number } | null {
  const segments = buildSegments(blocks);
  const range = mapCharRangeToBlocks(
    segments,
    matchStart,
    matchStart + matchLength,
  );
  if (!range) return null;

  const { startBlock, endBlock } = range;
  const regionBlocks = blocks.slice(startBlock, endBlock + 1);
  const regionMd = jsonContentToMarkdown(regionBlocks as any);
  if (!regionMd) return null;

  const located = locateInRegion(regionMd, find);
  if (!located) return null;

  const nextRegionMd =
    regionMd.slice(0, located.localStart) +
    newString +
    regionMd.slice(located.localStart + located.localLen);

  const replacement = inheritPresentationFromSource(
    regionBlocks,
    parseFragment(nextRegionMd),
  );
  const beforeCount = endBlock - startBlock + 1;
  blocks.splice(startBlock, beforeCount, ...replacement);
  return { touched: beforeCount };
}

export function applySearchReplacePreservingBlocks(
  content: JSONContent,
  oldString: string,
  newString: string,
  options?: { replaceAll?: boolean },
): SurgicalSearchReplaceResult {
  const find = oldString;
  if (!find) {
    return { ok: false, error: "search_replace 的 oldString 不能为空" };
  }

  const blocks = cloneBlocks(getTopLevelBlocks(content));
  if (blocks.length === 0) {
    return { ok: false, error: "页面为空，无法局部替换" };
  }

  const replaceAll = options?.replaceAll === true;
  let replacedCount = 0;
  let touchedBlockCount = 0;

  const previewOf = (md: string) =>
    md.length > 400 ? `${md.slice(0, 400)}…` : md;

  let guard = 0;
  while (guard < 64) {
    guard += 1;
    const segments = buildSegments(blocks);
    const fullMd = joinSegments(segments);

    const exactPositions = findAllOccurrences(fullMd, find);
    let matches: Array<{ start: number; length: number }>;
    if (exactPositions.length > 0) {
      matches = exactPositions.map((start) => ({
        start,
        length: find.length,
      }));
    } else {
      const flex = findWhitespaceFlexible(fullMd, find);
      if (!flex) {
        if (replacedCount === 0) {
          return {
            ok: false,
            error:
              "未在页面中找到 oldString 的精确匹配。请先 readPage，复制原文片段作为 oldString。",
            currentMarkdownPreview: previewOf(fullMd),
          };
        }
        break;
      }
      matches = [{ start: flex.index, length: flex.matchedLength }];
    }

    if (!replaceAll) {
      matches = [matches[0]!];
    }

    matches.sort((a, b) => b.start - a.start);
    let appliedThisRound = 0;
    for (const match of matches) {
      const result = applyOneMatch(
        blocks,
        find,
        newString,
        match.start,
        match.length,
      );
      if (!result) continue;
      replacedCount += 1;
      touchedBlockCount += result.touched;
      appliedThisRound += 1;
      break;
    }

    if (appliedThisRound === 0) {
      if (replacedCount === 0) {
        return {
          ok: false,
          error:
            "未能将 oldString 映射到可替换的块范围。请缩小片段或重新 readPage 后重试。",
          currentMarkdownPreview: previewOf(fullMd),
        };
      }
      break;
    }

    if (!replaceAll) break;
  }

  if (replacedCount === 0) {
    const fullMd = joinSegments(buildSegments(blocks));
    return {
      ok: false,
      error:
        "未能将 oldString 映射到可替换的块范围。请缩小片段或重新 readPage 后重试。",
      currentMarkdownPreview: previewOf(fullMd),
    };
  }

  const normalized = normalizePageContent(blocks as any, {
    ensureFirstTitle: false,
  }) as any[];
  const nextContent = reattachPreservedBlockIds(
    blocks,
    getTopLevelBlocks(normalized),
  ) as JSONContent;

  return {
    ok: true,
    content: nextContent,
    replacedCount,
    touchedBlockCount,
  };
}

export function mergeFullEditPreservingUnchangedBlocks(
  originalContent: JSONContent,
  newMarkdown: string,
  options?: { ensureFirstTitle?: boolean },
): FullEditMergeResult {
  const before = getTopLevelBlocks(originalContent);
  const parsed = parseFragment(newMarkdown);
  const ensureFirstTitle = options?.ensureFirstTitle !== false;

  if (before.length === 0 || parsed.length === 0) {
    const content = normalizePageContent(
      parsed.length ? (parsed as any) : (before as any),
      { ensureFirstTitle },
    ) as JSONContent;
    return {
      content,
      preservedBlockCount: 0,
      replacedBlockCount: getTopLevelBlocks(content).length,
    };
  }

  const { merged, preservedCount, replacedCount } =
    alignBlocksByMarkdownFingerprint(before, parsed);

  const normalized = normalizePageContent(merged as any, {
    ensureFirstTitle,
  }) as any[];
  const content = reattachPreservedBlockIds(
    merged,
    getTopLevelBlocks(normalized),
  ) as JSONContent;

  return {
    content,
    preservedBlockCount: preservedCount,
    replacedBlockCount: replacedCount,
  };
}
