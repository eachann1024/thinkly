const CODE_BLOCK_META_PREFIX = "thinkly=";

function normalizeCodeBlockSummary(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function serializeCodeFenceInfo(
  language: string,
  attrs?: Record<string, unknown>,
): string {
  const tokens: string[] = [];
  const normalizedLanguage =
    typeof language === "string" ? language.trim() : "";
  if (normalizedLanguage) {
    tokens.push(normalizedLanguage);
  }

  const summary = normalizeCodeBlockSummary(attrs?.summary);
  const collapsed = attrs?.collapsed === true;
  const metadata: Record<string, unknown> = {};

  if (summary) {
    metadata.summary = summary;
  }
  if (collapsed) {
    metadata.collapsed = true;
  }
  if (attrs?.wrap === true) {
    metadata.wrap = true;
  }

  if (Object.keys(metadata).length > 0) {
    tokens.push(
      `${CODE_BLOCK_META_PREFIX}${encodeURIComponent(JSON.stringify(metadata))}`,
    );
  }

  return tokens.join(" ");
}

/** 代码中本来就可以包含 Markdown 围栏，外层必须比内容里的连续标记更长。 */
export function serializeFencedCode(text: string, language: string, attrs?: Record<string, unknown>): string {
  const info = serializeCodeFenceInfo(language, attrs);
  const char = info.includes("`") ? "~" : "`";
  const runs = text.match(char === "`" ? /`+/g : /~+/g) ?? [];
  const length = Math.max(3, ...runs.map((run) => run.length + 1));
  const fence = char.repeat(length);
  return `${fence}${info}\n${text}\n${fence}`;
}
