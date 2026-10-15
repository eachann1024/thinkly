import { parseCodeFenceInfo } from "./blockHelpers";

export function parseCodeBlock(lines: string[], startIndex: number) {
  const line = lines[startIndex];
  if (line.trim() === "$$") {
    const mathLines: string[] = [];
    let i = startIndex + 1;
    while (i < lines.length && lines[i].trim() !== "$$") {
      mathLines.push(lines[i]);
      i++;
    }
    return {
      block: { type: "codeBlock", props: { language: "math" }, content: mathLines.join("\n") },
      nextIndex: i < lines.length ? i + 1 : i,
    };
  }

  const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if (!opening || (opening[1][0] === "`" && opening[2].includes("`"))) return null;
  const fence = opening[1];
  const info = parseCodeFenceInfo(opening[2].trim());
  const closing = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \\t]*$`);
  const codeLines: string[] = [];
  let i = startIndex + 1;
  while (i < lines.length && !closing.test(lines[i])) {
    codeLines.push(lines[i]);
    i++;
  }
  return {
    block: {
      type: "codeBlock",
      props: {
        language: info.language,
        ...(info.summary ? { summary: info.summary } : {}),
        ...(info.collapsed ? { collapsed: true } : {}),
        ...(info.wrap ? { wrap: true } : {}),
      },
      content: codeLines.join("\n"),
    },
    nextIndex: i < lines.length ? i + 1 : i,
  };
}
