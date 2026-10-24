import type { MarkType, ResolvedPos } from "@tiptap/pm/model";

export type InlineCodeEdge = "start" | "end";

export type InlineCodeEdgeArrowAction =
  | "step-inward"
  | "enter"
  | "leave"
  | null;

function segmentGraphemes(text: string): string[] {
  const Segmenter = (
    Intl as typeof Intl & {
      Segmenter?: new (
        locales?: string | string[],
        options?: { granularity: "grapheme" },
      ) => { segment: (value: string) => Iterable<{ segment: string }> };
    }
  ).Segmenter;

  if (!Segmenter) {
    return Array.from(text);
  }
  const values: string[] = [];
  for (const value of new Segmenter(undefined, {
    granularity: "grapheme",
  }).segment(text)) {
    values.push(value.segment);
  }
  return values;
}

export function edgeGraphemeLength(text: string, edge: InlineCodeEdge): number {
  if (!text) return 0;
  const graphemes = segmentGraphemes(text);
  const grapheme =
    edge === "start" ? graphemes[0] : graphemes[graphemes.length - 1];
  return grapheme?.length ?? 0;
}

export function inlineCodeEdgeAt(
  $pos: ResolvedPos,
  codeType: MarkType,
): InlineCodeEdge | null {
  const before = $pos.nodeBefore;
  const after = $pos.nodeAfter;
  const beforeCode = !!before?.isText && !!codeType.isInSet(before.marks);
  const afterCode = !!after?.isText && !!codeType.isInSet(after.marks);
  if (afterCode && !beforeCode) return "start";
  if (beforeCode && !afterCode) return "end";
  return null;
}

export function inlineCodeEdgeArrowAction(
  edge: InlineCodeEdge,
  inside: boolean,
  direction: "left" | "right",
): InlineCodeEdgeArrowAction {
  const inward = edge === "start" ? "right" : "left";
  if (direction === inward) return inside ? "step-inward" : "enter";
  return inside ? "leave" : null;
}

export function shouldKeepInlineCodeDomCaret(options: {
  wantInside: boolean;
  contentContainsAnchor: boolean;
  anchorInBoundary: boolean;
  atContentInnerEdge: boolean;
  atCodeOuterEdge: boolean;
  codeContainsAnchor: boolean;
}): boolean {
  if (options.anchorInBoundary) return false;
  if (options.wantInside) {
    return options.contentContainsAnchor || options.atContentInnerEdge;
  }
  if (options.contentContainsAnchor) return false;
  if (options.codeContainsAnchor && !options.atCodeOuterEdge) return false;
  return true;
}
