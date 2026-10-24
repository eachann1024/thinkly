/** 列表项末尾用硬换行写下的子列表，保存时改成缩进，读旧文件时再拆回子项。 */

const LIST_LINE = /^(?:\d+\.\s+\S|[-*+]\s+\S|-\s+\[[ xX]\](?:\s|$))/;

export function splitTrailingListLines(text: string): { head: string; lists: string[] } {
  const lines = text.split("\n");
  let start = lines.length;
  for (let index = lines.length - 1; index >= 1; index -= 1) {
    if (LIST_LINE.test(lines[index].trim())) start = index;
    else break;
  }
  if (start >= lines.length) return { head: text, lists: [] };
  return {
    head: lines.slice(0, start).join("\n"),
    lists: lines.slice(start).map((line) => line.trim()),
  };
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content.replace(/<br\s*\/?>/gi, "\n");
  if (!Array.isArray(content)) return "";
  return content.map((part) => {
    if (typeof part === "string") return part.replace(/<br\s*\/?>/gi, "\n");
    if (!part || typeof part !== "object") return "";
    if ((part as { type?: string }).type === "hardBreak") return "\n";
    if (typeof (part as { text?: string }).text === "string") return (part as { text: string }).text;
    if ((part as { type?: string }).type === "link") return textOf((part as { content?: unknown }).content);
    return "";
  }).join("");
}

function parseListLine(line: string, parseInline: (text: string) => any[], expect: { n: number }): any | null {
  const task = line.match(/^-\s+\[([ xX])\](?:\s+(.*))?$/);
  if (task) {
    expect.n = 1;
    return {
      type: "checkListItem",
      props: { checked: task[1].toLowerCase() === "x" },
      content: parseInline(task[2] ?? ""),
    };
  }
  const ordered = line.match(/^(\d+)\.\s+(.*)$/);
  if (ordered) {
    const num = parseInt(ordered[1], 10);
    const item: any = { type: "numberedListItem", content: parseInline(ordered[2] ?? "") };
    if (num !== expect.n) item.props = { start: num };
    expect.n = num + 1;
    return item;
  }
  const bullet = line.match(/^[-*+]\s+(.*)$/);
  if (!bullet) return null;
  expect.n = 1;
  return { type: "bulletListItem", content: parseInline(bullet[1] ?? "") };
}

/** 旧文件把子列表写成同一行里的 `<br>`。拆成真正的嵌套列表，正文不丢。 */
export function liftTrailingListBreaks(item: any, parseInline: (text: string) => any[]): any {
  const { head, lists } = splitTrailingListLines(textOf(item?.content));
  if (!lists.length) return item;
  const expect = { n: 1 };
  const nested = lists.map((line) => parseListLine(line, parseInline, expect)).filter(Boolean);
  if (!nested.length) return item;
  return {
    ...item,
    content: parseInline(head),
    children: [...nested, ...(item.children ?? [])],
  };
}
