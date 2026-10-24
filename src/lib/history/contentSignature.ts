import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { parseLocalFrontmatterBlob } from "@/lib/local-frontmatter";

const defaultProps: Record<string, unknown> = {
  backgroundColor: "default",
  textColor: "default",
  textAlignment: "left",
};
const blockDefaults: Record<string, Record<string, unknown>> = {
  heading: { level: 1, collapsed: false, isToggleable: false },
  toggleListItem: { collapsed: false },
  codeBlock: { wrap: false, collapsed: false, summary: "" },
  table: { sequenceColumn: false },
};

function normalizeContent(value: unknown, parentKey = "", defaults = defaultProps): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeContent(item));
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    if (key === "id" || key === "updatedAt" || key === "selection") continue;
    if (parentKey === "props" && Object.hasOwn(defaults, key) && source[key] === defaults[key]) continue;
    const normalized = normalizeContent(source[key], key,
      key === "props" ? { ...defaultProps, ...blockDefaults[String(source.type)] } : defaultProps);
    if (key === "children" && Array.isArray(normalized) && normalized.length === 0) continue;
    if ((key === "props" || key === "styles") && normalized && typeof normalized === "object" && Object.keys(normalized).length === 0) continue;
    result[key] = normalized;
  }
  return result;
}

export function getHistoryContentSignature(content: BlockNoteContent): string {
  try {
    return JSON.stringify(normalizeContent(content ?? null));
  } catch {
    return "__goose-note-unserializable-history-content__";
  }
}

export function getHistoryVisibleSignature(
  content: BlockNoteContent,
  localFrontmatter?: string,
): string {
  const settings = parseLocalFrontmatterBlob(localFrontmatter).settings;
  return JSON.stringify({
    content: getHistoryContentSignature(content),
    settings,
  });
}
