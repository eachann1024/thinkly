const SEARCHABLE_PROP_KEYS = ["caption", "name", "summary", "alt"] as const;

const GENERIC_MEDIA_NAMES = new Set([
  "image.webp",
  "image.png",
  "image.jpg",
  "image.jpeg",
  "image.gif",
  "image.bmp",
  "image.svg",
  "image.avif",
  "video.mp4",
  "video.webm",
  "video.mov",
  "audio.mp3",
  "audio.m4a",
  "audio.wav",
  "download",
]);

function isStorageOrDataRef(value: string): boolean {
  return /^(?:att:|att-file:|att-video:|blob:|data:)/i.test(value);
}

function isNoisePropValue(value: string, key: string): boolean {
  if (isStorageOrDataRef(value) || /^https?:\/\//i.test(value)) return true;
  if (key === "name" && GENERIC_MEDIA_NAMES.has(value.toLowerCase()))
    return true;
  return false;
}

function extractBlockPropText(block: any): string {
  if (!block || typeof block !== "object" || Array.isArray(block)) return "";
  const source = block.props ?? block.attrs;
  if (!source || typeof source !== "object") return "";
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const key of SEARCHABLE_PROP_KEYS) {
    const value = source[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed) || isNoisePropValue(trimmed, key))
      continue;
    seen.add(trimmed);
    parts.push(trimmed);
  }
  return parts.join(" ");
}

function getBlockLanguage(block: any): string {
  const language = block?.props?.language ?? block?.attrs?.language;
  return typeof language === "string" ? language.trim().toLowerCase() : "";
}

function stripGooseFrontmatterNoise(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "---") return false;
      return !/^goose-[A-Za-z0-9_-]+\s*:/i.test(trimmed);
    })
    .join("\n")
    .trim();
}

function extractInlinePiece(inline: any): string {
  if (inline == null) return "";
  if (typeof inline === "string") return inline;
  if (typeof inline !== "object") return "";
  if (inline.type === "hardBreak") return "\n";
  if (inline.type === "link") {
    return simpleExtractText(inline.content ?? "");
  }
  if (inline.type === "pageMention") {
    const title =
      typeof inline.props?.title === "string" ? inline.props.title.trim() : "";
    return title ? (title.startsWith("@") ? title : `@${title}`) : "";
  }
  if (inline.type === "paragraph" || inline.type === "tableCell") {
    return simpleExtractText(inline);
  }
  if (typeof inline.text === "string") return inline.text;
  if (inline.content != null) return simpleExtractText(inline);
  return "";
}

function extractBlockContentText(block: any): string {
  let contentText = "";
  if (typeof block.content === "string") contentText = block.content;
  else if (Array.isArray(block.content)) {
    contentText = block.content.map(extractInlinePiece).join("");
  } else if (block.content?.rows) {
    const rows = block.content.rows as any[];
    contentText = rows
      .flatMap((row) =>
        (row.cells ?? []).map((cell: any) => simpleExtractText(cell)),
      )
      .join(" ");
  } else if (typeof block.text === "string") {
    contentText = block.text;
  }
  if (getBlockLanguage(block) === "yaml-frontmatter") {
    return stripGooseFrontmatterNoise(contentText);
  }
  return contentText;
}

export function simpleExtractText(block: any): string {
  if (block == null) return "";
  if (typeof block === "string") return block;
  if (Array.isArray(block)) {
    return block.map(extractInlinePiece).join("");
  }
  if (typeof block !== "object") return "";
  const contentText = extractBlockContentText(block);
  const propText = extractBlockPropText(block);
  if (!contentText) return propText;
  if (!propText) return contentText;
  return `${contentText} ${propText}`;
}
