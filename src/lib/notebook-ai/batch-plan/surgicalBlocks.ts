import type { JSONContent } from "@/types";
import { jsonContentToMarkdown } from "@/lib/export/markdown/serialize";
import { importMarkdownFragment } from "@/lib/export/markdown/parse";
import { restoreBlockPropsMarkers } from "@/lib/export/markdown/blockPropsMarker";
import { explodeAiGeneratedBlocks } from "@/lib/ai-write/explodeAiGeneratedBlocks";
import { inheritPresentationFromSource } from "../inheritPresentation";

export function getTopLevelBlocks(content: JSONContent): any[] {
  if (Array.isArray(content)) return content as any[];
  if (content && typeof content === "object") {
    const nested = (content as { content?: unknown }).content;
    if (Array.isArray(nested)) return nested as any[];
  }
  return [];
}

export function cloneBlocks(blocks: any[]): any[] {
  if (typeof structuredClone === "function") return structuredClone(blocks);
  return JSON.parse(JSON.stringify(blocks)) as any[];
}

function stripBlockIds(blocks: any[]): any[] {
  return blocks.map((block) => {
    if (!block || typeof block !== "object") return block;
    const { id: _omit, ...rest } = block as Record<string, unknown>;
    return rest;
  });
}

function blockMarkdownFingerprint(block: any): string {
  return jsonContentToMarkdown([block] as any);
}

export function alignBlocksByMarkdownFingerprint(
  original: any[],
  candidate: any[],
): { merged: any[]; preservedCount: number; replacedCount: number } {
  const n = original.length;
  const m = candidate.length;
  if (m === 0) {
    return { merged: [], preservedCount: 0, replacedCount: 0 };
  }
  if (n === 0) {
    return {
      merged: candidate.slice(),
      preservedCount: 0,
      replacedCount: m,
    };
  }

  const a = original.map(blockMarkdownFingerprint);
  const b = candidate.map(blockMarkdownFingerprint);

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  const matches: Array<{ oi: number; ci: number }> = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1] && dp[i]![j] === dp[i - 1]![j - 1]! + 1) {
      matches.push({ oi: i - 1, ci: j - 1 });
      i -= 1;
      j -= 1;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  matches.reverse();

  const merged: any[] = [];
  let prevOi = -1;
  let prevCi = -1;
  for (const match of matches) {
    const origGap = original.slice(prevOi + 1, match.oi);
    const candGap = candidate.slice(prevCi + 1, match.ci);
    merged.push(...inheritPresentationFromSource(origGap, candGap));
    merged.push(original[match.oi]);
    prevOi = match.oi;
    prevCi = match.ci;
  }
  merged.push(
    ...inheritPresentationFromSource(
      original.slice(prevOi + 1),
      candidate.slice(prevCi + 1),
    ),
  );

  const preservedCount = matches.length;
  return {
    merged,
    preservedCount,
    replacedCount: m - preservedCount,
  };
}

export function parseFragment(markdown: string): any[] {
  const trimmed = markdown.trim();
  if (!trimmed) return [];
  const fragment = importMarkdownFragment(trimmed);
  if (!fragment || !Array.isArray(fragment) || fragment.length === 0) {
    return [];
  }
  const restored = restoreBlockPropsMarkers(fragment as any);
  return stripBlockIds(explodeAiGeneratedBlocks(restored as any[]) as any[]);
}

export function reattachPreservedBlockIds(
  source: any[],
  normalized: any[],
): any[] {
  if (!Array.isArray(normalized) || normalized.length === 0) return normalized;
  const n = source.length;
  const m = normalized.length;
  if (n === 0) return normalized;

  const a = source.map(blockMarkdownFingerprint);
  const b = normalized.map(blockMarkdownFingerprint);

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  const matches: Array<{ oi: number; ci: number }> = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1] && dp[i]![j] === dp[i - 1]![j - 1]! + 1) {
      matches.push({ oi: i - 1, ci: j - 1 });
      i -= 1;
      j -= 1;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  const out = normalized.map((b) =>
    b && typeof b === "object" ? { ...b } : b,
  );
  for (const match of matches) {
    const srcId = source[match.oi]?.id;
    if (srcId != null && out[match.ci] && out[match.ci].id == null) {
      out[match.ci] = { ...out[match.ci], id: srcId };
    }
  }
  return out;
}
