const commonDefaults: Record<string, unknown> = {
  backgroundColor: "default", textColor: "default", textAlignment: "left",
};
const blockDefaults: Record<string, Record<string, unknown>> = {
  heading: { level: 1, collapsed: false, isToggleable: false },
  toggleListItem: { collapsed: false },
  codeBlock: { wrap: false, collapsed: false, summary: "" },
  table: { sequenceColumn: false },
};
const inlineBlocks = new Set([
  "paragraph", "heading", "quote", "bulletListItem", "numberedListItem",
  "checkListItem", "toggleListItem", "callout", "codeBlock", "tableCell",
]);
type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function normalizeInline(value: unknown): unknown {
  const parts = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
  const result: unknown[] = [];
  for (const part of parts) {
    const item = normalize(typeof part === "string" ? { type: "text", text: part } : part);
    if (record(item) && item.type === "text" && typeof item.text === "string" &&
        Object.keys(item).every((key) => key === "type" || key === "text" || key === "styles")) {
      if (item.text === "") continue;
      const previous = result[result.length - 1];
      if (record(previous) && previous.type === "text" && typeof previous.text === "string" &&
          Object.keys(previous).every((key) => key === "type" || key === "text" || key === "styles") &&
          JSON.stringify(previous.styles) === JSON.stringify(item.styles)) {
        previous.text += item.text;
      } else result.push(item);
    } else result.push(item);
  }
  return result;
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (!record(value)) return value;
  const result: RecordValue = {};
  const defaults = { ...commonDefaults, ...blockDefaults[String(value.type)] };
  for (const key of Object.keys(value).sort()) {
    if (key === "id") continue;
    let next = value[key];
    if (key === "props" && record(next)) {
      next = Object.fromEntries(Object.entries(next).filter(([name, prop]) =>
        !Object.hasOwn(defaults, name) || prop !== defaults[name],
      ));
    }
    next = key === "content" && (inlineBlocks.has(String(value.type)) || value.type === "link") &&
      (typeof next === "string" || Array.isArray(next)) ? normalizeInline(next) : normalize(next);
    if ((key === "props" || key === "styles") && record(next) && Object.keys(next).length === 0) continue;
    if (key === "children" && Array.isArray(next) && next.length === 0) continue;
    result[key] = next;
  }
  if (inlineBlocks.has(String(value.type)) && result.content === undefined) result.content = [];
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

export function getLocalRecoveryContentSignature(content: unknown): string | null {
  try { return JSON.stringify(normalize(content ?? null)); }
  catch { return null; }
}

export function normalizeLocalRecoveryBaseSignature(signature: string): string | null {
  try { return getLocalRecoveryContentSignature(JSON.parse(signature)); }
  catch { return signature; }
}
