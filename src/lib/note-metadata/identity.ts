import { isMap, parseDocument, type Document } from "yaml";
import { NoteMetadataError } from "./contract";

export const NOTE_ID_KEY = "goose-id";
export const LEGACY_SETTING_KEYS = ["goose-layout", "goose-font", "goose-locked", "goose-pinned", "goose-favorite"];

export function validateNoteId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 4096 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new NoteMetadataError("identity", "Invalid note identity");
  }
}

export function splitFrontmatter(markdown: string): { document: Document; tail: string; present: boolean } {
  const match = markdown.match(/^(?:\uFEFF)?---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?=\r?\n|$)/);
  if (!match && /^(?:\uFEFF)?---[^\S\r\n]*(?:\r?\n|$)/.test(markdown)) {
    throw new NoteMetadataError("corrupt", "Unclosed YAML frontmatter");
  }
  const document = parseDocument(match?.[1] ?? "");
  if (document.errors.length || document.contents && !isMap(document.contents)) {
    throw new NoteMetadataError("corrupt", "Invalid YAML frontmatter");
  }
  if (!document.contents) document.contents = parseDocument("{}").contents;
  return { document, tail: match ? markdown.slice(match[0].length) : markdown, present: Boolean(match) };
}

export function renderFrontmatter(document: Document, tail: string, hadFrontmatter: boolean): string {
  const yaml = document.toString().replace(/\n$/, "");
  return `---\n${yaml}\n---${hadFrontmatter ? tail : `\n\n${tail}`}`;
}

export function readIdentity(markdown: string): string | undefined {
  const { document } = splitFrontmatter(markdown);
  if (!document.has(NOTE_ID_KEY)) return undefined;
  const value = document.get(NOTE_ID_KEY);
  validateNoteId(value);
  return value;
}

export function withoutIdentity(markdown: string): string {
  const { document, tail, present } = splitFrontmatter(markdown);
  if (!document.has(NOTE_ID_KEY)) return markdown;
  document.delete(NOTE_ID_KEY);
  return isMap(document.contents) && document.contents.items.length
    ? renderFrontmatter(document, tail, present)
    : tail.replace(/^\r?\n(?:\r?\n)?/, "");
}
