export type MarkdownPart = { kind: "empty" | "list" | "flow"; md: string };

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
