import { normalizeColumnLayout } from "@/components/editor/blocks/columns/columnModel";
import { NOTE_MARK_PATTERN } from "../persistedNames";

const OPEN = new RegExp(`^<!--\\s*${NOTE_MARK_PATTERN}:columns(?:\\s+widths="([\\d.,\\s]+)")?\\s*-->$`, "i");
const CLOSE = new RegExp(`^<!--\\s*\\/${NOTE_MARK_PATTERN}:columns\\s*-->$`, "i");
const COLUMN = new RegExp(`^<!--\\s*${NOTE_MARK_PATTERN}:column\\s*-->$`, "i");
const END_COLUMN = new RegExp(`^<!--\\s*\\/${NOTE_MARK_PATTERN}:column\\s*-->$`, "i");

/** 配对布局与每栏边界；围栏中的示例标记是文本，不参与结构扫描。 */
export function parseColumnsBlock(lines: string[], start: number, parseMarkdown: (markdown: string) => any[]) {
  const opening = lines[start].trim().match(OPEN);
  if (!opening) return null;
  const sections: any[] = [];
  let body: string[] | null = null;
  let depth = 1;
  let fence: { char: string; length: number } | undefined;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (fence) {
      body?.push(line);
      if (new RegExp(`^\\s*${fence.char}{${fence.length},}\\s*$`).test(line)) fence = undefined;
      continue;
    }
    const marker = trimmed.match(/^(`{3,}|~{3,})/);
    if (marker) {
      if (!body) return null;
      fence = { char: marker[1][0], length: marker[1].length };
      body.push(line);
      continue;
    }
    if (OPEN.test(trimmed)) { depth += 1; body?.push(line); continue; }
    if (CLOSE.test(trimmed)) {
      depth -= 1;
      if (depth > 0) { body?.push(line); continue; }
      if (body || !sections.length) return null;
      return {
        block: normalizeColumnLayout({ type: "columnLayout", props: { widths: opening[1] } }, sections),
        nextIndex: index + 1,
      };
    }
    if (depth === 1 && COLUMN.test(trimmed)) {
      if (body) return null;
      body = [];
      continue;
    }
    if (depth === 1 && END_COLUMN.test(trimmed)) {
      if (!body) return null;
      sections.push({ type: "columnSection", children: parseMarkdown(body.join("\n")) });
      body = null;
      continue;
    }
    if (body) body.push(line);
    else if (trimmed) return null;
  }
  // 缺失结束标记时原文交还主解析器，绝不把半截数据写成有效分栏。
  return null;
}
