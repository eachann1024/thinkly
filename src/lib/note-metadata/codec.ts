import { isMap } from "yaml";
import {
  MAX_MARKDOWN_CHARS, NoteMetadataError, markdownDigest,
  type NoteSettings, type PreparedNoteMetadata,
} from "./contract";
import { LEGACY_SETTING_KEYS, NOTE_ID_KEY, renderFrontmatter, splitFrontmatter, validateNoteId } from "./identity";
import { validateNoteMeta, validateSettings } from "./validate";

export function validateLegacyNoteMetadata(markdown: string): void {
  const { document } = splitFrontmatter(markdown);
  if (!document.has("goose-note")) return;
  const raw = document.get("goose-note");
  let meta: unknown;
  try { meta = typeof raw === "string" ? JSON.parse(raw) : document.toJS()["goose-note"]; }
  catch { throw new NoteMetadataError("corrupt", "Invalid legacy block metadata"); }
  if (meta === null) throw new NoteMetadataError("corrupt", "Invalid legacy block metadata");
  validateNoteMeta(meta);
}

export async function prepareNoteMetadata(
  legacyMarkdown: string, noteId: string, settings: NoteSettings,
): Promise<PreparedNoteMetadata> {
  validateNoteId(noteId);
  validateSettings(settings);
  if (legacyMarkdown.length > MAX_MARKDOWN_CHARS) throw new NoteMetadataError("too-large", "Note is too large");
  const { document, tail, present } = splitFrontmatter(legacyMarkdown);
  let meta: unknown = null;
  if (document.has("goose-note")) {
    const raw = document.get("goose-note");
    try { meta = typeof raw === "string" ? JSON.parse(raw) : document.toJS()["goose-note"]; }
    catch { throw new NoteMetadataError("corrupt", "Invalid legacy block metadata"); }
    if (meta === null) throw new NoteMetadataError("corrupt", "Invalid legacy block metadata");
    validateNoteMeta(meta);
    document.delete("goose-note");
  }
  validateNoteMeta(meta);
  for (const key of LEGACY_SETTING_KEYS) document.delete(key);
  document.delete(NOTE_ID_KEY);
  const cleanMarkdown = isMap(document.contents) && document.contents.items.length
    ? renderFrontmatter(document, tail, present)
    : present ? tail.replace(/^\r?\n(?:\r?\n)?/, "") : tail;
  const header = cleanMarkdown.startsWith("---\n") ? cleanMarkdown.slice(0, cleanMarkdown.indexOf("\n---", 4) + 4) : undefined;
  return {
    noteId, cleanMarkdown, frontmatter: header,
    payload: { digest: await markdownDigest(cleanMarkdown), markdown: cleanMarkdown, meta, settings: structuredClone(settings) },
  };
}

export async function finalizePreparedMarkdown(
  prepared: PreparedNoteMetadata, diskMarkdown: string,
): Promise<PreparedNoteMetadata> {
  if (diskMarkdown.length > MAX_MARKDOWN_CHARS) throw new NoteMetadataError("too-large", "Note is too large");
  const { document } = splitFrontmatter(diskMarkdown);
  if (document.has(NOTE_ID_KEY)) throw new NoteMetadataError("identity", "Final Markdown contains an application identity");
  return {
    ...prepared, cleanMarkdown: diskMarkdown,
    payload: { ...prepared.payload, markdown: diskMarkdown, digest: await markdownDigest(diskMarkdown) },
  };
}

export function inlineSnapshotMetadata(markdown: string, meta: unknown): string {
  const { document, tail, present } = splitFrontmatter(markdown);
  document.delete(NOTE_ID_KEY);
  if (meta !== null) document.set("goose-note", JSON.stringify(meta));
  return isMap(document.contents) && document.contents.items.length
    ? renderFrontmatter(document, tail, present)
    : tail.replace(/^\r?\n(?:\r?\n)?/, "");
}
