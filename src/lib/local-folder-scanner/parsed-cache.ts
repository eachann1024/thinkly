import type { ParsedLocalMarkdown } from "./markdown";
import { getLocalMdSnapshot } from "@/lib/local-md-snapshot";

// Bump when parser/title interpretation changes. No Page objects are retained.
const PARSER_VERSION = 1;
const MAX_ENTRIES = 128;
const MAX_CHARACTERS = 8 * 1024 * 1024;
type Entry = {
  raw: string;
  title: string;
  scope: string;
  version: number;
  parsed: ParsedLocalMarkdown;
};
const cache = new Map<string, Entry>();
let characters = 0;

function remove(path: string): void {
  const old = cache.get(path);
  if (old) characters -= old.raw.length;
  cache.delete(path);
}

export function getParsedMarkdown(
  path: string,
  raw: string,
  title: string,
  scope: string,
): ParsedLocalMarkdown | undefined {
  const entry = cache.get(path);
  if (!entry) return;
  if (
    entry.raw !== raw ||
    entry.title !== title ||
    entry.scope !== scope ||
    entry.version !== PARSER_VERSION ||
    getLocalMdSnapshot(path) !== raw
  ) {
    remove(path);
    return;
  }
  cache.delete(path);
  cache.set(path, entry);
  return structuredClone(entry.parsed);
}

export function cacheParsedMarkdown(
  path: string,
  raw: string,
  title: string,
  scope: string,
  parsed: ParsedLocalMarkdown,
): void {
  remove(path);
  if (parsed.readState !== "ready" || raw.length > MAX_CHARACTERS) return;
  cache.set(path, {
    raw,
    title,
    scope,
    version: PARSER_VERSION,
    parsed: structuredClone(parsed),
  });
  characters += raw.length;
  while (cache.size > MAX_ENTRIES || characters > MAX_CHARACTERS)
    remove(cache.keys().next().value!);
}

/** Enumeration still decides existence; removed/hidden paths lose their parsed data. */
export function pruneParsedMarkdown(
  scope: string,
  livePaths: ReadonlySet<string>,
): void {
  for (const [path, entry] of cache) {
    if (entry.scope === scope && !livePaths.has(path)) remove(path);
  }
}
