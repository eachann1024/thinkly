const CODE_BLOCK_META_PREFIXES = ["thinkly=", "goose-note="];

export function isThematicBreakLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const leading = line.match(/^ */)?.[0].length ?? 0;
  if (leading > 3) return false;
  return /^([-*_])(?:\s*\1){2,}\s*$/.test(trimmed);
}

export function isLegacyCodeBlockMetaComment(line: string): boolean {
  return /^<!--\s*(?:thinkly|goose-note):codeblock\s+.+?\s*-->$/.test(line);
}

function normalizeCodeBlockSummary(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function parseCodeFenceInfo(infoLine: string): {
  language: string;
  summary: string;
  collapsed: boolean;
  wrap: boolean;
} {
  const tokens = infoLine.trim().split(/\s+/).filter(Boolean);
  let language = "";
  let summary = "";
  let collapsed = false;
  let wrap = false;

  for (const token of tokens) {
    const metaPrefix = CODE_BLOCK_META_PREFIXES.find((prefix) => token.startsWith(prefix));
    if (metaPrefix) {
      const encoded = token.slice(metaPrefix.length);
      if (!encoded) continue;

      try {
        const parsed = JSON.parse(decodeURIComponent(encoded));
        if (parsed && typeof parsed === "object") {
          const candidateSummary = normalizeCodeBlockSummary(
            (parsed as Record<string, unknown>).summary,
          );
          if (candidateSummary) {
            summary = candidateSummary;
          }
          if ((parsed as Record<string, unknown>).collapsed === true) {
            collapsed = true;
          }
          wrap = (parsed as Record<string, unknown>).wrap === true;
        }
      } catch {}
      continue;
    }

    if (!language) {
      language = token;
    }
  }

  return {
    language,
    summary,
    collapsed,
    wrap,
  };
}

export function parseTableBlock(
  lines: string[],
  i: number,
  parseInline: (text: string) => any[],
): { block: any; nextIndex: number } | null {
  const isTableSeparator = (value: string) => {
    const v = value.trim();
    return /^\|?(\s*:?-+:?\s*\|?)+$/.test(v) && v.includes("-");
  };

  const isEscaped = (value: string, index: number) => {
    let slashCount = 0;
    for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
      slashCount += 1;
    }
    return slashCount % 2 === 1;
  };

  const trimRowDelimiters = (value: string) => {
    let content = value.trim();
    if (content.startsWith("|")) {
      content = content.slice(1);
    }
    const lastIndex = content.length - 1;
    if (lastIndex >= 0 && content[lastIndex] === "|" && !isEscaped(content, lastIndex)) {
      content = content.slice(0, lastIndex);
    }
    return content;
  };

  const splitTableRow = (value: string) => {
    const content = trimRowDelimiters(value);
    const cells: string[] = [];
    let current = "";

    for (let index = 0; index < content.length; index += 1) {
      const char = content[index];
      const next = content[index + 1];
      if (char === "\\" && next === "|") {
        current += "|";
        index += 1;
        continue;
      }
      if (char === "|") {
        cells.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }

    cells.push(current.trim());
    return cells;
  };

  const line = lines[i];
  if (
    line.includes("|") &&
    i + 1 < lines.length &&
    isTableSeparator(lines[i + 1])
  ) {
    const headerCells = splitTableRow(line);
    let index = i + 2;

    const bodyRows: string[][] = [];
    while (index < lines.length && lines[index].trim().includes("|")) {
      if (isTableSeparator(lines[index])) {
        index++;
        continue;
      }
      bodyRows.push(splitTableRow(lines[index]));
      index++;
    }

    const toCellContent = (text: string) => parseInline(text);

    return {
      block: {
        type: "table",
        content: {
          type: "tableContent",
          headerRows: 1,
          rows: [
            { cells: headerCells.map(toCellContent) },
            ...bodyRows.map((row) => ({ cells: row.map(toCellContent) })),
          ],
        },
      },
      nextIndex: index,
    };
  }

  return null;
}
