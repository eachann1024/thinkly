import { liftTrailingListBreaks } from "../listLines";

export function indentLevel(line: string): number {
  let count = 0;
  for (const ch of line) {
    if (ch === " ") count++;
    else if (ch === "\t") count += 2;
    else break;
  }
  return count;
}


export function parseNestedList(
  lines: string[],
  startI: number,
  baseIndent: number,
  parseInline: (t: string) => any[],
  parseMarkdown?: (markdown: string) => any[],
): { items: any[]; nextIndex: number } {
  const items: any[] = [];
  let i = startI;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;
    const lvl = indentLevel(line);
    if (lvl < baseIndent) break;
    if (lvl > baseIndent) {
      break;
    }

    const stripped = line.slice(lvl);

    const taskM = stripped.match(/^-\s+\[([ xX])\](?:\s+(.*))?$/);
    const orderedM = !taskM && stripped.match(/^(\d+)\.(?:\s+(.*)|\s*)$/);
    const bulletM = !taskM && !orderedM && stripped.match(/^[-*+](?:\s+(.*)|\s*)$/);

    if (!taskM && !orderedM && !bulletM) break;

    let item: any;
    if (taskM) {
      item = {
        type: "checkListItem",
        props: { checked: taskM[1].toLowerCase() === "x" },
        content: parseInline(taskM[2] ?? ""),
      };
    } else if (orderedM) {
      const num = parseInt(orderedM[1], 10);
      item = { type: "numberedListItem", content: parseInline(orderedM[2] ?? "") };
      const prevType = items[items.length - 1]?.type;
      if (num !== 1 && prevType !== "numberedListItem") {
        item.props = { start: num };
      }
    } else {
      item = {
        type: "bulletListItem",
        content: parseInline((bulletM as RegExpMatchArray)[1] ?? ""),
      };
    }
    i++;
    item = liftTrailingListBreaks(item, parseInline);

    const sub = collectChildren(lines, i, lvl + 1, parseInline, parseMarkdown);
    if (sub.items.length) {
      item.children = [...(item.children ?? []), ...sub.items];
      i = sub.nextIndex;
    }

    items.push(item);
  }

  return { items, nextIndex: i };
}

function collectChildren(
  lines: string[],
  startI: number,
  minIndent: number,
  parseInline: (t: string) => any[],
  parseMarkdown?: (markdown: string) => any[],
): { items: any[]; nextIndex: number } {
  const i = startI;
  if (i >= lines.length || !lines[i].trim())
    return { items: [], nextIndex: startI };
  const childIndent = indentLevel(lines[i]);
  if (childIndent < minIndent) return { items: [], nextIndex: startI };
  if (!parseMarkdown) return parseNestedList(lines, i, childIndent, parseInline);
  const body: string[] = [];
  let end = i;
  while (end < lines.length) {
    const line = lines[end];
    if (line.trim() && indentLevel(line) < childIndent) break;
    if (!line.trim()) {
      let next = end + 1;
      while (next < lines.length && !lines[next].trim()) next += 1;
      if (next >= lines.length || indentLevel(lines[next]) < childIndent) break;
    }
    body.push(line.slice(Math.min(childIndent, indentLevel(line))));
    end += 1;
  }
  return { items: parseMarkdown(body.join("\n")), nextIndex: end };
}
