import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import type { NoteSettings } from "@/lib/note-metadata/contract";
import { getHistorySettings } from "./settings";

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

const contentSignatures = new WeakMap<object, string>();

export function getHistoryContentSignature(content: BlockNoteContent): string {
  const cacheable = content !== null && typeof content === "object";
  const cached = cacheable ? contentSignatures.get(content) : undefined;
  if (cached !== undefined) return cached;
  let signature: string;
  try {
    signature = JSON.stringify(normalizeContent(content ?? null));
  } catch {
    signature = "__goose-note-unserializable-history-content__";
  }
  if (cacheable) contentSignatures.set(content, signature);
  return signature;
}

export function getHistoryVisibleSignature(
  content: BlockNoteContent,
  localFrontmatter?: string,
  explicitSettings?: NoteSettings,
): string {
  const settings = getHistorySettings(explicitSettings, localFrontmatter);
  return JSON.stringify({
    content: getHistoryContentSignature(content),
    settings,
  });
}
