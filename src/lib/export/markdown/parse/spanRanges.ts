import { unified } from "unified";
import remarkParse from "remark-parse";

const parser = unified().use(remarkParse);
const spanPattern = () => /<span\b(?:"[^"]*"|'[^']*'|[^'">])*>|<\/span\s*>/gi;

function protectedRanges(source: string): [number, number][] {
  const ranges: [number, number][] = [];
  const visit = (node: any) => {
    if (node.type === "code" || node.type === "inlineCode") {
      ranges.push([node.position.start.offset, node.position.end.offset]);
    } else node.children?.forEach(visit);
  };
  visit(parser.parse(source.replace(spanPattern(), (tag) => "x".repeat(tag.length))));
  const yaml = source.match(/^---\n[\s\S]*?\n---(?:\n|$)/);
  if (yaml) ranges.unshift([0, yaml[0].length]);
  return ranges;
}

export function findClosingSpan(source: string, from: number): { start: number; end: number } | null {
  const pattern = spanPattern();
  const protected_ = source.includes("`") ? protectedRanges(source) : [];
  pattern.lastIndex = from;
  let depth = 1;
  for (let match; (match = pattern.exec(source));) {
    if (protected_.some(([from, to]) => match.index >= from && match.index < to)) continue;
    depth += /^<\//.test(match[0]) ? -1 : 1;
    if (depth === 0) return { start: match.index, end: pattern.lastIndex };
  }
  return null;
}

export function normalizeMultilineSpans(source: string): string {
  if (!/[\r\n]/.test(source) || !/<span\b/i.test(source)) return source;
  source = source.replace(/\r\n?/g, "\n");
  const protected_ = protectedRanges(source);
  const stack: { start: number; end: number; tag: string }[] = [];
  const events = new Map<number, { end: number; tag: string; close: boolean }>();
  for (const match of source.matchAll(spanPattern())) {
    const start = match.index;
    if (protected_.some(([from, to]) => start >= from && start < to)) continue;
    const end = start + match[0].length;
    if (!/^<\//.test(match[0])) stack.push({ start, end, tag: match[0] });
    else {
      const open = stack.pop();
      if (open && source.slice(open.end, start).includes("\n")) {
        events.set(open.start, { end: open.end, tag: open.tag, close: false });
        events.set(start, { end, tag: match[0], close: true });
      }
    }
  }
  if (!events.size) return source;
  const active: string[] = [];
  let offset = 0;
  return source.split("\n").map((line) => {
    const prefix = line.match(/^[ \t]*(?:>[ \t]*)*(?:#{1,6}[ \t]+|[-*+][ \t]+(?:\[[ xX]\][ \t]+)?|\d+\.[ \t]+)?/)![0];
    const protectedLine = protected_.some(([from, to]) => offset >= from && offset < to);
    let result = prefix + (line.trim() && !protectedLine ? active.join("") : "");
    for (let index = prefix.length; index < line.length;) {
      const event = events.get(offset + index);
      if (!event) { result += line[index++]; continue; }
      if (event.close) active.pop();
      else active.push(event.tag);
      result += event.tag;
      index = event.end - offset;
    }
    if (line.trim() && !protectedLine) result += "</span>".repeat(active.length);
    offset += line.length + 1;
    return result;
  }).join("\n");
}
