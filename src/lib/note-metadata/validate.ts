import type { NoteMeta } from "../export/markdown/noteMeta";
import { restorePersistedBlockProps } from "../export/markdown/blockPropsProperties";
import {
  MAX_MARKDOWN_CHARS, MAX_META_ENTRIES, MAX_SIDECAR_CHARS, NoteMetadataError,
  type NoteMetadataEnvelope, type NoteMetadataSnapshot, type NoteSettings,
} from "./contract";
import { readIdentity, validateNoteId } from "./identity";

function fail(message: string): never { throw new NoteMetadataError("corrupt", message); }
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const safeKeys = (value: Record<string, unknown>, allowed: string[]) => {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`Unsupported metadata field: ${key}`);
};
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= MAX_META_ENTRIES;
const path = (value: unknown): value is string => typeof value === "string" && value.length < 1024 && /^(?:\d+(?:\.\d+)*)?$/.test(value);

export function validateSettings(value: unknown): asserts value is NoteSettings {
  if (!object(value)) fail("Invalid note settings");
  safeKeys(value, ["fontFamily", "pageLayout", "isLocked", "isPinned", "isFavorite"]);
  if (!["default", "serif", "mono"].includes(String(value.fontFamily)) ||
    value.pageLayout !== undefined && value.pageLayout !== "standard" && value.pageLayout !== "full" ||
    ["isLocked", "isPinned", "isFavorite"].some(key => typeof value[key] !== "boolean")) fail("Invalid note settings");
}

export function validateNoteMeta(value: unknown): asserts value is NoteMeta | null {
  if (value === null) return;
  if (!object(value)) fail("Invalid block metadata");
  if (value.v !== 1) throw new NoteMetadataError("unsupported", "Unsupported block metadata version");
  safeKeys(value, ["v", "blocks", "columns", "nests"]);
  if (value.blocks !== undefined) {
    if (!object(value.blocks) || Object.keys(value.blocks).length > MAX_META_ENTRIES) fail("Invalid metadata blocks");
    for (const [key, patch] of Object.entries(value.blocks)) {
      if (!path(key) || !key || !object(patch)) fail("Invalid metadata block path");
      safeKeys(patch, ["props", "image", "file", "media", "code", "calloutIcon", "sequence"]);
      for (const [kind, item] of Object.entries(patch)) {
        if (kind === "calloutIcon") { if (typeof item !== "string" || item.length > 256) fail("Invalid icon"); continue; }
        if (kind === "sequence") { if (item !== true) fail("Invalid sequence"); continue; }
        if (!object(item)) fail("Invalid block patch");
        const allowed = kind === "props" ? ["textAlignment", "textColor", "backgroundColor"]
          : kind === "code" ? ["summary", "collapsed", "wrap"]
          : kind === "image" ? ["name", "caption", "alt", "previewWidth", "textAlignment", "backgroundColor", "showPreview", "captionSource", "legacyResize"]
          : kind === "file" ? ["caption", "backgroundColor"]
          : ["name", "caption", "backgroundColor", "showPreview", "textAlignment", "previewWidth"];
        safeKeys(item, allowed);
        for (const [prop, propValue] of Object.entries(item)) {
          if (["collapsed", "wrap", "showPreview", "legacyResize"].includes(prop)) {
            if (typeof propValue !== "boolean") fail("Invalid boolean property");
          } else if (prop === "previewWidth") {
            if (typeof propValue !== "number" || !Number.isFinite(propValue) || propValue <= 0 || propValue > 1_000_000) fail("Invalid media width");
          } else if (typeof propValue !== "string" || propValue.length > 1024 * 1024) fail("Invalid text property");
        }
        const styles = Object.keys(item).filter(key => ["textAlignment", "textColor", "backgroundColor"].includes(key));
        if (styles.some(key => !(key in restorePersistedBlockProps(item)))) fail("Invalid block style");
        if ("captionSource" in item && !["user", "generated"].includes(String(item.captionSource))) fail("Invalid caption source");
      }
    }
  }
  let structuralBudget = 0;
  for (const kind of ["columns", "nests"] as const) {
    const entries = value[kind];
    if (entries === undefined) continue;
    if (!Array.isArray(entries) || entries.length > MAX_META_ENTRIES) fail("Invalid structural metadata");
    for (const entry of entries) {
      if (!object(entry) || !path(entry.path) || !integer(entry.at)) fail("Invalid structural location");
      safeKeys(entry, kind === "columns" ? ["path", "at", "widths", "counts"] : ["path", "at", "count"]);
      if (kind === "nests") {
        if (!integer(entry.count)) fail("Invalid nested count");
        structuralBudget += entry.count;
      }
      else if (typeof entry.widths !== "string" || entry.widths.length > 4096 || !/^[\d.,\s]*$/.test(entry.widths) ||
        !Array.isArray(entry.counts) || entry.counts.length > 1000 || entry.counts.some(count => !integer(count)) ||
        entry.counts.reduce((sum: number, count: number) => sum + count, 0) > MAX_META_ENTRIES) fail("Invalid columns");
      else structuralBudget += entry.counts.reduce((sum: number, count: number) => sum + count, 0);
      if (structuralBudget > MAX_META_ENTRIES) fail("Structural metadata exceeds processing budget");
    }
  }
}

export function validateSnapshot(value: unknown, noteId: string): asserts value is NoteMetadataSnapshot {
  if (!object(value)) fail("Invalid metadata snapshot");
  safeKeys(value, ["digest", "markdown", "meta", "settings"]);
  if (typeof value.digest !== "string" || !/^[a-f0-9]{64}$/.test(value.digest) || typeof value.markdown !== "string") fail("Invalid metadata digest");
  if (value.markdown.length > MAX_MARKDOWN_CHARS) throw new NoteMetadataError("too-large", "Note is too large");
  if (readIdentity(value.markdown) !== noteId) fail("Metadata baseline identity differs");
  validateSettings(value.settings);
  validateNoteMeta(value.meta);
}

export function parseEnvelope(raw: string, expectedId: string): NoteMetadataEnvelope {
  if (raw.length > MAX_SIDECAR_CHARS) throw new NoteMetadataError("too-large", "Metadata is too large");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail("Invalid metadata JSON"); }
  if (!object(value)) return fail("Invalid metadata envelope");
  if (value.version !== 1) throw new NoteMetadataError("unsupported", "Unsupported note metadata version");
  safeKeys(value, ["version", "noteId", "revision", "current", "previous", "legacyBaseline"]);
  validateNoteId(value.noteId);
  if (value.noteId !== expectedId || typeof value.revision !== "string" || !/^[a-f0-9-]{36}$/.test(value.revision)) fail("Invalid metadata identity or revision");
  validateSnapshot(value.current, expectedId);
  if (value.previous !== undefined) validateSnapshot(value.previous, expectedId);
  if (value.legacyBaseline !== undefined && (typeof value.legacyBaseline !== "string" ||
    value.legacyBaseline.length > MAX_MARKDOWN_CHARS || readIdentity(value.legacyBaseline) !== undefined)) fail("Invalid legacy baseline");
  return value as NoteMetadataEnvelope;
}
