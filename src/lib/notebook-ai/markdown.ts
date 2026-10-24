import { importMarkdownFragment } from "@/lib/export/markdown/parse";
import { restoreBlockPropsMarkers } from "@/lib/export/markdown/blockPropsMarker";
import {
  normalizePageContent,
  titleHeadingBlock,
  emptyBlock,
} from "@/components/editor/utils/blocknote-content";
import { explodeAiGeneratedBlocks } from "@/lib/ai-write/explodeAiGeneratedBlocks";
import { normalizeGeneratedStructureMarkdown } from "@/lib/ai-write/blockStructureValidation";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import type { JSONContent } from "@/types";

const BARE_TASK_PREFIX = /^(\s*)\[([ xX])\]\s+/;

const LIST_LINE = /^\s*(?:-\s+\[[ xX]\]\s+|[-*+]\s+\S|\d+\.\s+\S)/;

const TABLE_LINE = /^\s*\|/;
const QUOTE_LINE = /^\s{0,3}>/;
const HEADING_LINE = /^\s{0,3}#{1,6}\s+\S/;
const HR_LINE = /^(\s{0,3})([-*_])\s*(?:\2\s*){2,}$/;
const SETEXT_LINE = /^(?:=+|-+)\s*$/;

function fixBareTask(line: string): string {
  return line.replace(BARE_TASK_PREFIX, "$1- [$2] ");
}

type FenceState = { char: "`" | "~"; length: number } | null;

function matchFence(line: string): { char: "`" | "~"; length: number } | null {
  const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
  if (!fenceMatch) return null;
  const marker = fenceMatch[1];
  return { char: marker[0] as "`" | "~", length: marker.length };
}

function toggleFence(state: FenceState, line: string): FenceState | "keep" {
  const fence = matchFence(line);
  if (!fence) return "keep";
  if (!state) return fence;
  if (state.char === fence.char && fence.length >= state.length) return null;
  return "keep";
}

function isKeepTogetherLine(line: string): boolean {
  return (
    LIST_LINE.test(line) ||
    TABLE_LINE.test(line) ||
    QUOTE_LINE.test(line) ||
    HEADING_LINE.test(line) ||
    HR_LINE.test(line.trim()) ||
    SETEXT_LINE.test(line.trim())
  );
}

function separateParagraphLines(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let fence: FenceState = null;
  let prevParagraph = false;

  for (const raw of lines) {
    const toggled = toggleFence(fence, raw);
    if (toggled !== "keep") {
      fence = toggled;
      out.push(raw);
      prevParagraph = false;
      continue;
    }
    if (fence) {
      out.push(raw);
      prevParagraph = false;
      continue;
    }
    if (!raw.trim()) {
      out.push(raw);
      prevParagraph = false;
      continue;
    }
    if (isKeepTogetherLine(raw)) {
      out.push(raw);
      prevParagraph = false;
      continue;
    }
    if (prevParagraph) out.push("");
    out.push(raw);
    prevParagraph = true;
  }

  return out.join("\n");
}

export function normalizeAiMarkdownForDiff(markdown: string): string {
  return cleanAiMarkdown(markdown, { separateParagraphs: false });
}

function cleanAiMarkdown(
  markdown: string,
  options: { separateParagraphs: boolean },
): string {
  const structured = normalizeGeneratedStructureMarkdown(markdown);
  const lines = structured.split("\n");
  const out: string[] = [];
  let fence: FenceState = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const toggled = toggleFence(fence, raw);
    if (toggled !== "keep") {
      fence = toggled;
      out.push(raw);
      continue;
    }
    if (fence) {
      out.push(raw);
      continue;
    }

    if (!raw.trim()) {
      const prev = out[out.length - 1] ?? "";
      const next = fixBareTask(lines[i + 1] ?? "");
      if (LIST_LINE.test(prev) && LIST_LINE.test(next)) {
        continue;
      }
      out.push(raw);
      continue;
    }

    out.push(fixBareTask(raw));
  }

  const joined = out.join("\n");
  return options.separateParagraphs ? separateParagraphLines(joined) : joined;
}

export function normalizeAiMarkdown(markdown: string): string {
  return cleanAiMarkdown(markdown, { separateParagraphs: true });
}

export function parseAiMarkdownToBlocks(markdown: string): BlockNoteContent {
  const normalized = normalizeAiMarkdown(markdown ?? "").trim();
  if (!normalized) return [];
  const fragment = importMarkdownFragment(normalized);
  const restored = restoreBlockPropsMarkers((fragment ?? []) as BlockNoteContent);
  const exploded = explodeAiGeneratedBlocks(restored);
  return exploded.length > 0 ? exploded : restored;
}

export function buildAiPageContent(title: string, markdown: string): JSONContent {
  const stripped = normalizeAiMarkdown(markdown)
    .replace(/^\s*#(?!#)[^\n]*\n?/, "")
    .trim();

  const bodyBlocks: BlockNoteContent = stripped
    ? parseAiMarkdownToBlocks(stripped)
    : [emptyBlock()];
  const safeBody = bodyBlocks.length > 0 ? bodyBlocks : [emptyBlock()];

  const content: BlockNoteContent = [titleHeadingBlock(title), ...safeBody];
  return normalizePageContent(content, { ensureFirstTitle: false }) as JSONContent;
}
