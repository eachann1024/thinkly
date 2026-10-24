export type MarkdownPart = { kind: "empty" | "list" | "flow"; md: string };

/**
 * 空段是额外的空行：段与段之间本来就有一行空白，再多的空行才是空段。
 * 文件末尾的空段多留一个换行，这样补上 POSIX 结尾换行后仍数得回来。
 */
export function joinBlocks(parts: MarkdownPart[]): string {
  let text = "";
  let pending = 0;
  let started = false;
  const writeBreak = () => {
    if (!started) text += "\n".repeat(pending);
    else text += "\n".repeat(2 + pending);
    pending = 0;
  };
  for (const part of parts) {
    if (part.kind === "empty") {
      pending += 1;
      continue;
    }
    writeBreak();
    text += part.md;
    started = true;
  }
  if (pending) text += started ? "\n".repeat(pending + 1) : "\n".repeat(pending);
  return text;
}
