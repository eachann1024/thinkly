import { normalizeAiMarkdownForDiff } from "@/lib/notebook-ai/markdown";
import type { BatchPlanOperationInput } from "./types";

export type SearchReplaceFromEdit = Extract<
  BatchPlanOperationInput,
  { type: "search_replace" }
>;

const MAX_HUNKS = 8;
const MAX_CHANGED_RATIO = 0.85;
const MIN_OLD_STRING_LEN = 1;

function splitParagraphs(markdown: string): string[] {
  const trimmed = markdown.trim();
  if (!trimmed) return [];
  return trimmed.split(/\n\n+/);
}

function buildLcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array<number>(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (a[i - 1] === b[j - 1]) dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      else dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  return dp;
}

interface DiffOp {
  kind: "equal" | "delete" | "insert";
  oldIndex?: number;
  newIndex?: number;
}

function alignByLcs(oldParas: string[], newParas: string[]): DiffOp[] {
  const dp = buildLcsTable(oldParas, newParas);
  const reverse: DiffOp[] = [];
  let i = oldParas.length;
  let j = newParas.length;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      oldParas[i - 1] === newParas[j - 1] &&
      dp[i]![j] === dp[i - 1]![j - 1]! + 1
    ) {
      reverse.push({ kind: "equal", oldIndex: i - 1, newIndex: j - 1 });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      reverse.push({ kind: "insert", newIndex: j - 1 });
      j -= 1;
    } else {
      reverse.push({ kind: "delete", oldIndex: i - 1 });
      i -= 1;
    }
  }
  reverse.reverse();
  return reverse;
}

interface Hunk {
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
}

function collectHunks(ops: DiffOp[]): Hunk[] {
  const hunks: Hunk[] = [];
  let oldPos = 0;
  let newPos = 0;
  let i = 0;
  while (i < ops.length) {
    if (ops[i]!.kind === "equal") {
      oldPos += 1;
      newPos += 1;
      i += 1;
      continue;
    }
    const oldStart = oldPos;
    const newStart = newPos;
    while (i < ops.length && ops[i]!.kind !== "equal") {
      const op = ops[i]!;
      if (op.kind === "delete") oldPos += 1;
      else if (op.kind === "insert") newPos += 1;
      i += 1;
    }
    hunks.push({
      oldStart,
      oldEnd: oldPos,
      newStart,
      newEnd: newPos,
    });
  }
  return hunks;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  while (from <= haystack.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx < 0) break;
    count += 1;
    from = idx + Math.max(needle.length, 1);
  }
  return count;
}

function joinParas(paras: string[], start: number, end: number): string {
  if (start >= end) return "";
  return paras.slice(start, end).join("\n\n");
}

function extractOldSpan(
  haystack: string,
  paras: string[],
  start: number,
  end: number,
): string | null {
  if (start >= end) return "";
  if (start < 0 || end > paras.length) return null;
  let cursor = 0;
  let spanStart = 0;
  let spanEnd = 0;
  for (let p = 0; p < end; p += 1) {
    const para = paras[p]!;
    const idx = haystack.indexOf(para, cursor);
    if (idx < 0) return null;
    if (p === start) spanStart = idx;
    if (p === end - 1) spanEnd = idx + para.length;
    cursor = idx + para.length;
  }
  return haystack.slice(spanStart, spanEnd);
}

export function tryConvertEditToSearchReplace(params: {
  pageId: string;
  oldMarkdown: string;
  newMarkdown: string;
  baseOperationId: string;
}): SearchReplaceFromEdit[] | null {
  const oldMd = normalizeAiMarkdownForDiff(params.oldMarkdown ?? "");
  const newMd = normalizeAiMarkdownForDiff(params.newMarkdown ?? "");
  const oldNorm = oldMd.trim();
  const newNorm = newMd.trim();

  if (!oldNorm) return null;
  if (oldNorm === newNorm) return null;

  const oldParas = splitParagraphs(oldNorm);
  const newParas = splitParagraphs(newNorm);
  if (oldParas.length === 0) return null;

  const ops = alignByLcs(oldParas, newParas);
  const hunks = collectHunks(ops);
  if (hunks.length === 0) return null;
  if (hunks.length > MAX_HUNKS) return null;

  let changedChars = 0;
  for (const hunk of hunks) {
    for (let p = hunk.oldStart; p < hunk.oldEnd; p += 1) {
      changedChars += oldParas[p]?.length ?? 0;
      if (p + 1 < hunk.oldEnd) changedChars += 2;
    }
  }
  const ratio = changedChars / Math.max(oldNorm.length, 1);
  if (ratio > MAX_CHANGED_RATIO) return null;

  const equalOldIndices = new Set<number>();
  for (const op of ops) {
    if (op.kind === "equal" && op.oldIndex != null) {
      equalOldIndices.add(op.oldIndex);
    }
  }

  const haystack = oldNorm;
  const results: SearchReplaceFromEdit[] = [];

  for (let hi = 0; hi < hunks.length; hi += 1) {
    const hunk = hunks[hi]!;
    const extractedOld = extractOldSpan(
      haystack,
      oldParas,
      hunk.oldStart,
      hunk.oldEnd,
    );
    if (extractedOld === null) return null;
    let oldString = extractedOld;
    let newString = joinParas(newParas, hunk.newStart, hunk.newEnd);

    if (!oldString) {
      let anchorIndex = -1;
      for (let p = hunk.oldStart - 1; p >= 0; p -= 1) {
        if (equalOldIndices.has(p)) {
          anchorIndex = p;
          break;
        }
      }
      if (anchorIndex < 0) {
        for (let p = hunk.oldStart; p < oldParas.length; p += 1) {
          if (equalOldIndices.has(p)) {
            anchorIndex = p;
            break;
          }
        }
      }
      if (anchorIndex < 0) return null;
      const anchorSpan = extractOldSpan(
        haystack,
        oldParas,
        anchorIndex,
        anchorIndex + 1,
      );
      if (!anchorSpan) return null;
      if (anchorIndex < hunk.oldStart) {
        oldString = anchorSpan;
        newString = newString ? `${anchorSpan}\n\n${newString}` : anchorSpan;
      } else {
        oldString = anchorSpan;
        newString = newString ? `${newString}\n\n${anchorSpan}` : anchorSpan;
      }
    }

    if (!oldString || oldString.length < MIN_OLD_STRING_LEN) return null;

    const occurrences = countOccurrences(haystack, oldString);
    if (occurrences !== 1) return null;

    results.push({
      type: "search_replace",
      operationId: `${params.baseOperationId}-sr-${hi + 1}`,
      pageId: params.pageId,
      oldString,
      newString,
    });
  }

  if (results.length === 0) return null;
  return results;
}
