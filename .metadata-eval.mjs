var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/note-metadata/contract.ts
var contract_exports = {};
__export(contract_exports, {
  MAX_MARKDOWN_CHARS: () => MAX_MARKDOWN_CHARS,
  MAX_META_ENTRIES: () => MAX_META_ENTRIES,
  MAX_SIDECAR_CHARS: () => MAX_SIDECAR_CHARS,
  NoteMetadataError: () => NoteMetadataError,
  markdownDigest: () => markdownDigest
});
async function markdownDigest(markdown) {
  const bytes = new TextEncoder().encode(markdown);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}
var NoteMetadataError, MAX_MARKDOWN_CHARS, MAX_SIDECAR_CHARS, MAX_META_ENTRIES;
var init_contract = __esm({
  "src/lib/note-metadata/contract.ts"() {
    NoteMetadataError = class extends Error {
      code;
      cause;
      constructor(code, message, cause) {
        super(message);
        this.name = "NoteMetadataError";
        this.code = code;
        this.cause = cause;
      }
    };
    MAX_MARKDOWN_CHARS = 16 * 1024 * 1024;
    MAX_SIDECAR_CHARS = 40 * 1024 * 1024;
    MAX_META_ENTRIES = 1e5;
  }
});

// src/lib/note-metadata/identity.ts
import { isMap, parseDocument } from "yaml";
function validateNoteId(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 4096 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new NoteMetadataError("identity", "Invalid note identity");
  }
}
function splitFrontmatter(markdown) {
  const match = markdown.match(/^(?:\uFEFF)?---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?=\r?\n|$)/);
  if (!match && /^(?:\uFEFF)?---[^\S\r\n]*(?:\r?\n|$)/.test(markdown)) {
    throw new NoteMetadataError("corrupt", "Unclosed YAML frontmatter");
  }
  const document2 = parseDocument(match?.[1] ?? "");
  if (document2.errors.length || document2.contents && !isMap(document2.contents)) {
    throw new NoteMetadataError("corrupt", "Invalid YAML frontmatter");
  }
  if (!document2.contents) document2.contents = parseDocument("{}").contents;
  return { document: document2, tail: match ? markdown.slice(match[0].length) : markdown, present: Boolean(match) };
}
function renderFrontmatter(document2, tail, hadFrontmatter) {
  const yaml = document2.toString().replace(/\n$/, "");
  return `---
${yaml}
---${hadFrontmatter ? tail : `

${tail}`}`;
}
function readIdentity(markdown) {
  const { document: document2 } = splitFrontmatter(markdown);
  if (!document2.has(NOTE_ID_KEY)) return void 0;
  const value = document2.get(NOTE_ID_KEY);
  validateNoteId(value);
  return value;
}
var NOTE_ID_KEY, LEGACY_SETTING_KEYS;
var init_identity = __esm({
  "src/lib/note-metadata/identity.ts"() {
    init_contract();
    NOTE_ID_KEY = "goose-id";
    LEGACY_SETTING_KEYS = ["goose-layout", "goose-font", "goose-locked", "goose-pinned", "goose-favorite"];
  }
});

// src/lib/export/markdown/blockPropsProperties.ts
function sanitizeCssColor(value) {
  if (typeof value !== "string") return void 0;
  const color = value.trim();
  return KNOWN_COLORS.has(color) || SAFE_CSS_COLOR.test(color) ? color : void 0;
}
function persistedStyleColor(value, property) {
  const color = sanitizeCssColor(value);
  if (!color || /^(?:default|inherit|initial|unset|revert|revert-layer)$/i.test(color)) return void 0;
  if (property === "textColor" && /^currentcolor$/i.test(color)) return void 0;
  if (property === "backgroundColor" && /^transparent$/i.test(color)) return void 0;
  return color;
}
function restorePersistedBlockProps(props) {
  const metadata = {};
  if (props.textAlignment === "left" || props.textAlignment === "center" || props.textAlignment === "right") {
    metadata.textAlignment = props.textAlignment;
  }
  const textColor = sanitizeCssColor(props.textColor);
  if (textColor) metadata.textColor = textColor;
  const backgroundColor = sanitizeCssColor(props.backgroundColor);
  if (backgroundColor) metadata.backgroundColor = backgroundColor;
  return metadata;
}
var KNOWN_COLORS, SAFE_CSS_COLOR, INLINE_BLOCK_TYPES;
var init_blockPropsProperties = __esm({
  "src/lib/export/markdown/blockPropsProperties.ts"() {
    KNOWN_COLORS = /* @__PURE__ */ new Set([
      "default",
      "gray",
      "brown",
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "purple",
      "pink"
    ]);
    SAFE_CSS_COLOR = /^(?:#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\([0-9.%\s,/-]+\)|var\(--[A-Za-z0-9_-]+\)|[A-Za-z]{1,32})$/;
    INLINE_BLOCK_TYPES = /* @__PURE__ */ new Set([
      "paragraph",
      "heading",
      "bulletListItem",
      "numberedListItem",
      "checkListItem",
      "quote",
      "callout"
    ]);
  }
});

// src/lib/note-metadata/validate.ts
function fail(message) {
  throw new NoteMetadataError("corrupt", message);
}
function validateSettings(value) {
  if (!object(value)) fail("Invalid note settings");
  safeKeys(value, ["fontFamily", "pageLayout", "isLocked", "isPinned", "isFavorite"]);
  if (!["default", "serif", "mono"].includes(String(value.fontFamily)) || value.pageLayout !== void 0 && value.pageLayout !== "standard" && value.pageLayout !== "full" || ["isLocked", "isPinned", "isFavorite"].some((key) => typeof value[key] !== "boolean")) fail("Invalid note settings");
}
function validateNoteMeta(value) {
  if (value === null) return;
  if (!object(value)) fail("Invalid block metadata");
  if (value.v !== 1) throw new NoteMetadataError("unsupported", "Unsupported block metadata version");
  safeKeys(value, ["v", "blocks", "columns", "nests"]);
  if (value.blocks !== void 0) {
    if (!object(value.blocks) || Object.keys(value.blocks).length > MAX_META_ENTRIES) fail("Invalid metadata blocks");
    for (const [key, patch] of Object.entries(value.blocks)) {
      if (!path(key) || !key || !object(patch)) fail("Invalid metadata block path");
      safeKeys(patch, ["props", "image", "file", "media", "code", "calloutIcon", "sequence"]);
      for (const [kind, item] of Object.entries(patch)) {
        if (kind === "calloutIcon") {
          if (typeof item !== "string" || item.length > 256) fail("Invalid icon");
          continue;
        }
        if (kind === "sequence") {
          if (item !== true) fail("Invalid sequence");
          continue;
        }
        if (!object(item)) fail("Invalid block patch");
        const allowed = kind === "props" ? ["textAlignment", "textColor", "backgroundColor"] : kind === "code" ? ["summary", "collapsed", "wrap"] : kind === "image" ? ["name", "caption", "alt", "previewWidth", "textAlignment", "backgroundColor", "showPreview", "captionSource", "legacyResize"] : kind === "file" ? ["caption", "backgroundColor"] : ["name", "caption", "backgroundColor", "showPreview", "textAlignment", "previewWidth"];
        safeKeys(item, allowed);
        for (const [prop, propValue] of Object.entries(item)) {
          if (["collapsed", "wrap", "showPreview", "legacyResize"].includes(prop)) {
            if (typeof propValue !== "boolean") fail("Invalid boolean property");
          } else if (prop === "previewWidth") {
            if (typeof propValue !== "number" || !Number.isFinite(propValue) || propValue <= 0 || propValue > 1e6) fail("Invalid media width");
          } else if (typeof propValue !== "string" || propValue.length > 1024 * 1024) fail("Invalid text property");
        }
        const styles = Object.keys(item).filter((key2) => ["textAlignment", "textColor", "backgroundColor"].includes(key2));
        if (styles.some((key2) => !(key2 in restorePersistedBlockProps(item)))) fail("Invalid block style");
        if ("captionSource" in item && !["user", "generated"].includes(String(item.captionSource))) fail("Invalid caption source");
      }
    }
  }
  let structuralBudget = 0;
  for (const kind of ["columns", "nests"]) {
    const entries = value[kind];
    if (entries === void 0) continue;
    if (!Array.isArray(entries) || entries.length > MAX_META_ENTRIES) fail("Invalid structural metadata");
    for (const entry of entries) {
      if (!object(entry) || !path(entry.path) || !integer(entry.at)) fail("Invalid structural location");
      safeKeys(entry, kind === "columns" ? ["path", "at", "widths", "counts"] : ["path", "at", "count"]);
      if (kind === "nests") {
        if (!integer(entry.count)) fail("Invalid nested count");
        structuralBudget += entry.count;
      } else if (typeof entry.widths !== "string" || entry.widths.length > 4096 || !/^[\d.,\s]*$/.test(entry.widths) || !Array.isArray(entry.counts) || entry.counts.length > 1e3 || entry.counts.some((count) => !integer(count)) || entry.counts.reduce((sum, count) => sum + count, 0) > MAX_META_ENTRIES) fail("Invalid columns");
      else structuralBudget += entry.counts.reduce((sum, count) => sum + count, 0);
      if (structuralBudget > MAX_META_ENTRIES) fail("Structural metadata exceeds processing budget");
    }
  }
}
function validateSnapshot(value, noteId) {
  if (!object(value)) fail("Invalid metadata snapshot");
  safeKeys(value, ["digest", "markdown", "meta", "settings"]);
  if (typeof value.digest !== "string" || !/^[a-f0-9]{64}$/.test(value.digest) || typeof value.markdown !== "string") fail("Invalid metadata digest");
  if (value.markdown.length > MAX_MARKDOWN_CHARS) throw new NoteMetadataError("too-large", "Note is too large");
  const embeddedId = readIdentity(value.markdown);
  if (embeddedId && embeddedId !== noteId) fail("Metadata baseline identity differs");
  validateSettings(value.settings);
  validateNoteMeta(value.meta);
}
function parseEnvelope(raw, expectedId) {
  if (raw.length > MAX_SIDECAR_CHARS) throw new NoteMetadataError("too-large", "Metadata is too large");
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return fail("Invalid metadata JSON");
  }
  if (!object(value)) return fail("Invalid metadata envelope");
  if (value.version !== 1) throw new NoteMetadataError("unsupported", "Unsupported note metadata version");
  safeKeys(value, ["version", "noteId", "revision", "current", "previous", "legacyBaseline", "relativePath", "recovery", "deleted", "previousRelativePath"]);
  validateNoteId(value.noteId);
  if (value.noteId !== expectedId || typeof value.revision !== "string" || !/^[a-f0-9-]{36}$/.test(value.revision)) fail("Invalid metadata identity or revision");
  if (value.deleted !== void 0 && typeof value.deleted !== "boolean") fail("Invalid deletion state");
  for (const key of ["relativePath", "previousRelativePath"]) {
    const relative = value[key];
    if (relative !== void 0 && (typeof relative !== "string" || !relative || relative.startsWith("/") || relative.includes("\\") || relative.split("/").some((part) => part === ".." || part === ".") || /[\u0000-\u001f]/.test(relative))) fail("Invalid relative path");
  }
  if (value.recovery !== void 0) validateSnapshot(value.recovery, expectedId);
  validateSnapshot(value.current, expectedId);
  if (value.previous !== void 0) validateSnapshot(value.previous, expectedId);
  if (value.legacyBaseline !== void 0 && (typeof value.legacyBaseline !== "string" || value.legacyBaseline.length > MAX_MARKDOWN_CHARS || readIdentity(value.legacyBaseline) !== void 0 && readIdentity(value.legacyBaseline) !== expectedId)) fail("Invalid legacy baseline");
  return value;
}
var object, safeKeys, integer, path;
var init_validate = __esm({
  "src/lib/note-metadata/validate.ts"() {
    init_blockPropsProperties();
    init_contract();
    init_identity();
    object = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
    safeKeys = (value, allowed) => {
      for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`Unsupported metadata field: ${key}`);
    };
    integer = (value) => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= MAX_META_ENTRIES;
    path = (value) => typeof value === "string" && value.length < 1024 && /^(?:\d+(?:\.\d+)*)?$/.test(value);
  }
});

// src/lib/note-metadata/codec.ts
import { isMap as isMap2 } from "yaml";
async function prepareNoteMetadata(legacyMarkdown, noteId, settings2) {
  validateNoteId(noteId);
  validateSettings(settings2);
  if (legacyMarkdown.length > MAX_MARKDOWN_CHARS) throw new NoteMetadataError("too-large", "Note is too large");
  const { document: document2, tail, present } = splitFrontmatter(legacyMarkdown);
  let meta = null;
  if (document2.has("goose-note")) {
    const raw = document2.get("goose-note");
    try {
      meta = typeof raw === "string" ? JSON.parse(raw) : document2.toJS()["goose-note"];
    } catch {
      throw new NoteMetadataError("corrupt", "Invalid legacy block metadata");
    }
    if (meta === null) throw new NoteMetadataError("corrupt", "Invalid legacy block metadata");
    validateNoteMeta(meta);
    document2.delete("goose-note");
  }
  validateNoteMeta(meta);
  for (const key of LEGACY_SETTING_KEYS) document2.delete(key);
  document2.delete(NOTE_ID_KEY);
  const cleanMarkdown = isMap2(document2.contents) && document2.contents.items.length ? renderFrontmatter(document2, tail, present) : present ? tail.replace(/^\r?\n(?:\r?\n)?/, "") : tail;
  const header = cleanMarkdown.startsWith("---\n") ? cleanMarkdown.slice(0, cleanMarkdown.indexOf("\n---", 4) + 4) : void 0;
  return {
    noteId,
    cleanMarkdown,
    frontmatter: header,
    payload: { digest: await markdownDigest(cleanMarkdown), markdown: cleanMarkdown, meta, settings: structuredClone(settings2) }
  };
}
function inlineSnapshotMetadata(markdown, meta) {
  const { document: document2, tail, present } = splitFrontmatter(markdown);
  document2.delete(NOTE_ID_KEY);
  if (meta !== null) document2.set("goose-note", JSON.stringify(meta));
  return isMap2(document2.contents) && document2.contents.items.length ? renderFrontmatter(document2, tail, present) : tail.replace(/^\r?\n(?:\r?\n)?/, "");
}
var init_codec = __esm({
  "src/lib/note-metadata/codec.ts"() {
    init_contract();
    init_identity();
    init_validate();
  }
});

// src/lib/note-metadata/storage.ts
function metadataEnvelopeText(envelope) {
  const raw = rawEnvelopes.get(envelope);
  if (raw === void 0) throw new NoteMetadataError("corrupt", "Metadata read fingerprint is missing");
  return raw;
}
async function metadataRevision(envelope) {
  return `${envelope.revision}:${await markdownDigest(metadataEnvelopeText(envelope))}`;
}
async function metadataPath(root2, noteId) {
  validateNoteId(noteId);
  const base = root2.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!base || base.split("/").some((segment) => segment === "..") || /[\u0000-\u001f]/.test(base)) {
    throw new NoteMetadataError("unsafe-path", "Invalid notebook metadata root");
  }
  return `${base}/.goose/metadata/${await markdownDigest(noteId)}.json`;
}
async function assertMetadataBoundary(fs2, root2, file) {
  if (!fs2.realpathAsync) return;
  const resolve = async (target) => {
    try {
      return await fs2.realpathAsync(target);
    } catch (error) {
      throw new NoteMetadataError("io-error", "Cannot resolve metadata boundary", error);
    }
  };
  const canonical = (value) => value.replace(/\\/g, "/").replace(/\/+$/, "");
  const logicalRoot = canonical(root2);
  const resolvedRoot = canonical(await resolve(root2) ?? root2);
  for (const target of [file.slice(0, file.lastIndexOf("/metadata/")), file.slice(0, file.lastIndexOf("/")), file]) {
    const real = await resolve(target);
    const resolved = real === target && canonical(target).startsWith(`${logicalRoot}/`) ? `${resolvedRoot}${canonical(target).slice(logicalRoot.length)}` : real && canonical(real);
    if (resolved && !resolved.startsWith(`${resolvedRoot}/`)) {
      throw new NoteMetadataError("unsafe-path", "Metadata resolves outside the notebook");
    }
  }
}
async function readMetadataEnvelope(fs2, root2, noteId) {
  const file = await metadataPath(root2, noteId);
  await assertMetadataBoundary(fs2, root2, file);
  let raw;
  try {
    if (fs2.readFileStatAsync) {
      const result = await fs2.readFileStatAsync(file);
      if (!result.ok) {
        if (missing(result.error)) return null;
        throw new NoteMetadataError("io-error", result.error || "Cannot read note metadata");
      }
      raw = result.content ?? null;
    } else if (fs2.readFileAsync) raw = await fs2.readFileAsync(file);
    else throw new NoteMetadataError("io-error", "Metadata read API unavailable");
  } catch (error) {
    if (missing(error)) return null;
    if (error instanceof NoteMetadataError) throw error;
    throw new NoteMetadataError("io-error", "Cannot read note metadata", error);
  }
  if (raw === null) throw new NoteMetadataError("io-error", "Metadata read returned no content");
  const envelope = parseEnvelope(raw, noteId);
  rawEnvelopes.set(envelope, raw);
  for (const snapshot2 of [envelope.current, envelope.previous, envelope.recovery]) {
    if (snapshot2 && await markdownDigest(snapshot2.markdown) !== snapshot2.digest) {
      throw new NoteMetadataError("corrupt", "Metadata baseline checksum differs");
    }
  }
  return envelope;
}
async function stageMetadata(fs2, root2, currentDiskMarkdown, next, expectedRevision) {
  const file = await metadataPath(root2, next.noteId);
  const previousTask = locks.get(file) ?? Promise.resolve();
  const task = previousTask.catch(() => void 0).then(async () => {
    validateSnapshot(next.payload, next.noteId);
    if (next.cleanMarkdown !== next.payload.markdown || await markdownDigest(next.cleanMarkdown) !== next.payload.digest) {
      throw new NoteMetadataError("corrupt", "Prepared metadata does not match Markdown");
    }
    const existing = await readMetadataEnvelope(fs2, root2, next.noteId);
    const existingRevision = existing ? await metadataRevision(existing) : null;
    if (expectedRevision !== void 0 && existingRevision !== expectedRevision) {
      throw new NoteMetadataError("conflict", "Note metadata changed before saving");
    }
    let previous;
    let legacyBaseline;
    if (existing && currentDiskMarkdown !== null) {
      const digest = await markdownDigest(currentDiskMarkdown);
      previous = [existing.current, existing.previous].find((snapshot2) => snapshot2?.digest === digest);
      if (!previous) {
        const normalized = currentDiskMarkdown.replace(/\r\n/g, "\n");
        const compatible = [existing.current, existing.previous].find((snapshot2) => snapshot2?.markdown.replace(/\r\n/g, "\n") === normalized);
        if (compatible) previous = { ...compatible, markdown: currentDiskMarkdown, digest };
      }
      if (!previous && existing.legacyBaseline === currentDiskMarkdown) legacyBaseline = currentDiskMarkdown;
      if (!previous && legacyBaseline === void 0) legacyBaseline = currentDiskMarkdown;
    } else if (!existing && currentDiskMarkdown !== null && readIdentity(currentDiskMarkdown) && readIdentity(currentDiskMarkdown) !== next.noteId) {
      throw new NoteMetadataError("identity", "Legacy note identity differs");
    } else if (!existing && currentDiskMarkdown !== null) legacyBaseline = currentDiskMarkdown;
    else if (existing && currentDiskMarkdown === null && expectedRevision !== existingRevision) {
      throw new NoteMetadataError("conflict", "Existing metadata cannot be adopted by a new note");
    }
    const samePayload = existing && existing.current.digest === next.payload.digest && JSON.stringify(existing.current.meta) === JSON.stringify(next.payload.meta) && JSON.stringify(existing.current.settings) === JSON.stringify(next.payload.settings);
    if (samePayload && !existing.deleted && existing.relativePath === next.relativePath) {
      const raw2 = metadataEnvelopeText(existing);
      const unchanged = fs2.compareAndSwapFileAsync ? await fs2.compareAndSwapFileAsync(file, raw2, raw2) : await readMetadataEnvelope(fs2, root2, next.noteId).then((current) => current !== null && metadataEnvelopeText(current) === raw2);
      if (!unchanged) throw new NoteMetadataError("conflict", "Note metadata changed during saving");
      return { revision: existingRevision, path: file };
    }
    const revision = crypto.randomUUID();
    const envelope = {
      version: 1,
      noteId: next.noteId,
      revision,
      current: next.payload,
      ...next.relativePath ? { relativePath: next.relativePath } : {},
      ...existing?.relativePath && existing.relativePath !== next.relativePath ? { previousRelativePath: existing.relativePath } : existing?.previousRelativePath ? { previousRelativePath: existing.previousRelativePath } : {},
      ...existing && (existing.recovery || !previous && legacyBaseline !== void 0) ? { recovery: existing.recovery ?? existing.current } : {},
      ...previous && previous.digest !== next.payload.digest ? { previous } : {},
      ...legacyBaseline !== void 0 ? { legacyBaseline } : {}
    };
    const raw = JSON.stringify(envelope);
    rawEnvelopes.set(envelope, raw);
    if (raw.length > MAX_SIDECAR_CHARS) throw new NoteMetadataError("too-large", "Metadata is too large");
    if (!fs2.mkdir || !fs2.compareAndSwapFileAsync && (!fs2.createFileAsync || !fs2.rename)) throw new NoteMetadataError("io-error", "Atomic metadata API unavailable");
    const dir = file.slice(0, file.lastIndexOf("/"));
    if (!await fs2.mkdir(dir)) throw new NoteMetadataError("io-error", "Cannot create metadata directory");
    await assertMetadataBoundary(fs2, root2, file);
    if (fs2.compareAndSwapFileAsync) {
      if (!await fs2.compareAndSwapFileAsync(file, existing ? rawEnvelopes.get(existing) : null, raw)) {
        throw new NoteMetadataError("conflict", "Note metadata changed during saving");
      }
      return { revision: await metadataRevision(envelope), path: file };
    }
    const temporary = `${file}.${revision}.tmp`;
    let committed = false;
    try {
      if (!await fs2.createFileAsync(temporary, raw)) throw new NoteMetadataError("io-error", "Cannot stage note metadata");
      const beforeCommit = await readMetadataEnvelope(fs2, root2, next.noteId);
      if ((beforeCommit ? rawEnvelopes.get(beforeCommit) : null) !== (existing ? rawEnvelopes.get(existing) : null)) {
        throw new NoteMetadataError("conflict", "Note metadata changed during saving");
      }
      if (!await fs2.rename(temporary, file)) throw new NoteMetadataError("io-error", "Cannot commit note metadata");
      committed = true;
    } finally {
      if (!committed) {
        try {
          await fs2.deleteFile?.(temporary);
        } catch {
        }
      }
    }
    return { revision: await metadataRevision(envelope), path: file };
  });
  locks.set(file, task);
  try {
    return await task;
  } catch (error) {
    if (error instanceof NoteMetadataError) throw error;
    throw new NoteMetadataError("io-error", "Cannot save note metadata", error);
  } finally {
    if (locks.get(file) === task) locks.delete(file);
  }
}
var locks, rawEnvelopes, missing;
var init_storage = __esm({
  "src/lib/note-metadata/storage.ts"() {
    init_contract();
    init_identity();
    init_validate();
    locks = /* @__PURE__ */ new Map();
    rawEnvelopes = /* @__PURE__ */ new WeakMap();
    missing = (error) => /\bENOENT\b/.test(error instanceof Error ? error.message : String(error));
  }
});

// src/lib/canonicalLocalPath.ts
function normalizeLocalPathSlashes(path2) {
  const slashes = path2.replace(/\\/g, "/");
  const prefix = slashes.startsWith("//") ? "/" : "";
  return prefix + slashes.replace(/\/+/g, "/");
}
function stripSystemVolumesDataPrefix(path2) {
  const normalized = normalizeLocalPathSlashes(path2);
  const lower = normalized.toLowerCase();
  if (lower === SYSTEM_VOLUMES_DATA) {
    return "/";
  }
  const prefix = `${SYSTEM_VOLUMES_DATA}/`;
  if (lower.startsWith(prefix)) {
    return normalized.slice(prefix.length - 1);
  }
  return normalized;
}
function canonicalLocalPath(path2) {
  return stripSystemVolumesDataPrefix(normalizeLocalPathSlashes(path2.trim()));
}
function comparisonLocalPath(path2, caseInsensitive) {
  const canonical = canonicalLocalPath(path2);
  return caseInsensitive ? canonical.toLowerCase() : canonical;
}
function localPathsAreCaseInsensitive() {
  if (typeof process !== "undefined" && typeof process.platform === "string") {
    return process.platform === "win32" || process.platform === "darwin";
  }
  if (typeof navigator !== "undefined") {
    return /Win/i.test(navigator.platform) || /Mac/i.test(navigator.platform);
  }
  return false;
}
function canonicalRelativePath(basePath, filePath, caseInsensitive = localPathsAreCaseInsensitive()) {
  const base = comparisonLocalPath(basePath, caseInsensitive).replace(/\/$/, "");
  const file = comparisonLocalPath(filePath, caseInsensitive);
  if (file === base) return "";
  const prefix = `${base}/`;
  if (!file.startsWith(prefix)) return null;
  const canonicalFile = canonicalLocalPath(filePath);
  const canonicalBase = canonicalLocalPath(basePath).replace(/\/$/, "");
  return canonicalFile.slice(canonicalBase.length + 1);
}
var SYSTEM_VOLUMES_DATA;
var init_canonicalLocalPath = __esm({
  "src/lib/canonicalLocalPath.ts"() {
    SYSTEM_VOLUMES_DATA = "/system/volumes/data";
  }
});

// src/lib/note-metadata/lookup.ts
async function notebookMetadata(fs2, root2) {
  const dir = `${root2}/.goose/metadata`;
  let entries;
  try {
    entries = fs2.readDirAsync ? await fs2.readDirAsync(dir) : fs2.readDir?.(dir) ?? [];
  } catch (error) {
    if (/ENOENT/.test(String(error))) return [];
    throw error;
  }
  const result = [];
  for (const entry of entries) {
    if (!/^[a-f0-9]{64}\.json$/.test(entry.name)) continue;
    try {
      const raw = await fs2.readFileAsync?.(`${dir}/${entry.name}`);
      if (!raw) continue;
      const id = JSON.parse(raw).noteId;
      if (typeof id !== "string" || `${await markdownDigest(id)}.json` !== entry.name) continue;
      const envelope = await readMetadataEnvelope(fs2, root2, id);
      if (envelope) result.push(envelope);
    } catch {
    }
  }
  return result;
}
function contentAffinity(before, after) {
  const tokens = (value) => {
    const body = value.replace(/^(?:\uFEFF)?---[^\S\r\n]*\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "").trim().toLowerCase();
    const words = body.match(/[\p{L}\p{N}]+/gu) ?? [];
    const grams = Array.from(body).flatMap((_, at, chars) => at + 3 <= chars.length ? [chars.slice(at, at + 3).join("")] : []);
    return /* @__PURE__ */ new Set([...words, ...grams]);
  };
  const a = tokens(before), b = tokens(after);
  if (!a.size || !b.size) return before === after ? 1 : 0;
  return [...a].filter((token) => b.has(token)).length / Math.max(a.size, b.size);
}
async function findNoteMetadata(fs2, root2, markdown, filePath, catalog) {
  const embedded = readIdentity(markdown);
  if (embedded) return readMetadataEnvelope(fs2, root2, embedded);
  if (!filePath) return null;
  const relative = canonicalRelativePath(root2, filePath);
  if (!relative) return null;
  const envelopes = await (catalog ?? notebookMetadata(fs2, root2));
  const exact = envelopes.filter((value) => value.relativePath === relative);
  if (!exact.length) {
    for (const envelope of envelopes) {
      if (envelope.previousRelativePath !== relative || !envelope.relativePath || !fs2.existsAsync) continue;
      if (!await fs2.existsAsync(`${root2}/${envelope.relativePath}`)) exact.push(envelope);
    }
  }
  if (exact.length === 1 && [exact[0].current, exact[0].previous].some((snapshot2) => snapshot2 && (snapshot2.markdown === markdown || !exact[0].deleted))) return exact[0];
  if (exact.length > 1) return null;
  const digest = await markdownDigest(markdown);
  const candidates = [];
  const contextual = [];
  for (const envelope of envelopes) {
    if (!envelope.relativePath || envelope.relativePath === relative || envelope.deleted) continue;
    const oldPath = `${root2}/${envelope.relativePath}`;
    const exists = fs2.existsAsync ? await fs2.existsAsync(oldPath) : true;
    if (exists) continue;
    if ([envelope.current, envelope.previous].some((snapshot2) => snapshot2 && snapshot2.digest === digest)) candidates.push(envelope);
    else if (contentAffinity(envelope.current.markdown, markdown) >= 0.5) contextual.push(envelope);
  }
  return candidates.length === 1 ? candidates[0] : candidates.length === 0 && contextual.length === 1 ? contextual[0] : null;
}
var init_lookup = __esm({
  "src/lib/note-metadata/lookup.ts"() {
    init_canonicalLocalPath();
    init_contract();
    init_identity();
    init_storage();
  }
});

// src/lib/export/markdown/listLines.ts
function splitTrailingListLines(text) {
  const lines = text.split("\n");
  let start = lines.length;
  for (let index = lines.length - 1; index >= 1; index -= 1) {
    if (LIST_LINE.test(lines[index].trim())) start = index;
    else break;
  }
  if (start >= lines.length) return { head: text, lists: [] };
  return {
    head: lines.slice(0, start).join("\n"),
    lists: lines.slice(start).map((line) => line.trim())
  };
}
function textOf(content) {
  if (typeof content === "string") return content.replace(/<br\s*\/?>/gi, "\n");
  if (!Array.isArray(content)) return "";
  return content.map((part) => {
    if (typeof part === "string") return part.replace(/<br\s*\/?>/gi, "\n");
    if (!part || typeof part !== "object") return "";
    if (part.type === "hardBreak") return "\n";
    if (typeof part.text === "string") return part.text;
    if (part.type === "link") return textOf(part.content);
    return "";
  }).join("");
}
function parseListLine(line, parseInline, expect) {
  const task = line.match(/^-\s+\[([ xX])\](?:\s+(.*))?$/);
  if (task) {
    expect.n = 1;
    return {
      type: "checkListItem",
      props: { checked: task[1].toLowerCase() === "x" },
      content: parseInline(task[2] ?? "")
    };
  }
  const ordered = line.match(/^(\d+)\.\s+(.*)$/);
  if (ordered) {
    const num = parseInt(ordered[1], 10);
    const item = { type: "numberedListItem", content: parseInline(ordered[2] ?? "") };
    if (num !== expect.n) item.props = { start: num };
    expect.n = num + 1;
    return item;
  }
  const bullet = line.match(/^[-*+]\s+(.*)$/);
  if (!bullet) return null;
  expect.n = 1;
  return { type: "bulletListItem", content: parseInline(bullet[1] ?? "") };
}
function liftTrailingListBreaks(item, parseInline) {
  const { head, lists } = splitTrailingListLines(textOf(item?.content));
  if (!lists.length) return item;
  const expect = { n: 1 };
  const nested = lists.map((line) => parseListLine(line, parseInline, expect)).filter(Boolean);
  if (!nested.length) return item;
  return {
    ...item,
    content: parseInline(head),
    children: [...nested, ...item.children ?? []]
  };
}
var LIST_LINE;
var init_listLines = __esm({
  "src/lib/export/markdown/listLines.ts"() {
    LIST_LINE = /^(?:\d+\.\s+\S|[-*+]\s+\S|-\s+\[[ xX]\](?:\s|$))/;
  }
});

// src/lib/export/markdown/parse/nestedList.ts
function indentLevel(line) {
  let count = 0;
  for (const ch of line) {
    if (ch === " ") count++;
    else if (ch === "	") count += 2;
    else break;
  }
  return count;
}
function parseNestedList(lines, startI, baseIndent, parseInline, parseMarkdown) {
  const items = [];
  let i = startI;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;
    const lvl = indentLevel(line);
    if (lvl < baseIndent) break;
    if (lvl > baseIndent) {
      break;
    }
    const stripped = line.slice(lvl);
    const taskM = stripped.match(/^-\s+\[([ xX])\](?:\s+(.*))?$/);
    const orderedM = !taskM && stripped.match(/^(\d+)\.(?:\s+(.*)|\s*)$/);
    const bulletM = !taskM && !orderedM && stripped.match(/^[-*+](?:\s+(.*)|\s*)$/);
    if (!taskM && !orderedM && !bulletM) break;
    let item;
    if (taskM) {
      item = {
        type: "checkListItem",
        props: { checked: taskM[1].toLowerCase() === "x" },
        content: parseInline(taskM[2] ?? "")
      };
    } else if (orderedM) {
      const num = parseInt(orderedM[1], 10);
      item = { type: "numberedListItem", content: parseInline(orderedM[2] ?? "") };
      const prevType = items[items.length - 1]?.type;
      if (num !== 1 && prevType !== "numberedListItem") {
        item.props = { start: num };
      }
    } else {
      item = {
        type: "bulletListItem",
        content: parseInline(bulletM[1] ?? "")
      };
    }
    i++;
    item = liftTrailingListBreaks(item, parseInline);
    const sub = collectChildren(lines, i, lvl + 1, parseInline, parseMarkdown);
    if (sub.items.length) {
      item.children = [...item.children ?? [], ...sub.items];
      i = sub.nextIndex;
    }
    items.push(item);
  }
  return { items, nextIndex: i };
}
function collectChildren(lines, startI, minIndent, parseInline, parseMarkdown) {
  const i = startI;
  if (i >= lines.length || !lines[i].trim())
    return { items: [], nextIndex: startI };
  const childIndent = indentLevel(lines[i]);
  if (childIndent < minIndent) return { items: [], nextIndex: startI };
  if (!parseMarkdown) return parseNestedList(lines, i, childIndent, parseInline);
  const body = [];
  let end = i;
  while (end < lines.length) {
    const line = lines[end];
    if (line.trim() && indentLevel(line) < childIndent) break;
    if (!line.trim()) {
      let next = end + 1;
      while (next < lines.length && !lines[next].trim()) next += 1;
      if (next >= lines.length || indentLevel(lines[next]) < childIndent) break;
    }
    body.push(line.slice(Math.min(childIndent, indentLevel(line))));
    end += 1;
  }
  return { items: parseMarkdown(body.join("\n")), nextIndex: end };
}
var init_nestedList = __esm({
  "src/lib/export/markdown/parse/nestedList.ts"() {
    init_listLines();
  }
});

// src/lib/export/markdown/persistedNames.ts
function noteComment(body) {
  return `<!-- ${NOTE_MARK}:${body} -->`;
}
function noteCommentClose(body) {
  return `<!-- /${NOTE_MARK}:${body} -->`;
}
function dataAttr(name) {
  return `data-${NOTE_MARK}-${name}`;
}
function readDataAttr(element, name) {
  return element.getAttribute(dataAttr(name)) ?? element.getAttribute(`data-goose-${name}`);
}
var NOTE_MARK, NOTE_MARK_PATTERN;
var init_persistedNames = __esm({
  "src/lib/export/markdown/persistedNames.ts"() {
    NOTE_MARK = "thinkly";
    NOTE_MARK_PATTERN = "(?:thinkly|goose-note)";
  }
});

// src/lib/export/markdown/parse/audio.ts
function parseAudioBlock(lines, start) {
  const line = lines[start].trim();
  if (!/^<(audio|video)\s+src="[^"]*"[^>]*>\s*<\/\1>$/i.test(line)) return null;
  const element = new DOMParser().parseFromString(line, "text/html").querySelector("audio, video");
  if (!element) return null;
  const type = element.tagName.toLowerCase();
  const width = Number(element.getAttribute("width"));
  const alignment = element.getAttribute("data-text-alignment");
  return {
    block: { type, props: {
      url: element.getAttribute("src") || "",
      name: readDataAttr(element, "name") || "",
      caption: readDataAttr(element, "caption") || "",
      showPreview: readDataAttr(element, "show-preview") !== "false",
      backgroundColor: sanitizeCssColor(element.getAttribute("data-background-color")) || "default",
      ...type === "video" && Number.isFinite(width) && width > 0 ? { previewWidth: width } : {},
      ...type === "video" && alignment && ["left", "center", "right"].includes(alignment) ? { textAlignment: alignment } : {}
    } },
    nextIndex: start + 1
  };
}
var init_audio = __esm({
  "src/lib/export/markdown/parse/audio.ts"() {
    init_persistedNames();
    init_blockPropsProperties();
  }
});

// src/lib/legacyColumns.ts
function flattenLegacyColumns(blocks) {
  if (!Array.isArray(blocks)) return blocks;
  let result;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (!block || typeof block !== "object") {
      result?.push(block);
      continue;
    }
    if (block.type === "columnLayout" || block.type === "columnSection") {
      result ??= blocks.slice(0, index);
      const children = flattenLegacyColumns(Array.isArray(block.children) ? block.children : []);
      for (const child of children) result.push(child);
      continue;
    }
    let flattenedBlock = block;
    if (block.type === "bulletList" || block.type === "orderedList") {
      const content = block.content;
      if (Array.isArray(content)) {
        const flattenedContent = flattenLegacyColumns(content);
        if (flattenedContent !== content) flattenedBlock = { ...flattenedBlock, content: flattenedContent };
      }
    }
    const childrenValue = block.children;
    if (Array.isArray(childrenValue)) {
      const children = flattenLegacyColumns(childrenValue);
      if (children !== childrenValue) {
        flattenedBlock = { ...flattenedBlock, children };
      }
    }
    if (flattenedBlock !== block) {
      result ??= blocks.slice(0, index);
      result.push(flattenedBlock);
    } else result?.push(block);
  }
  return result ?? blocks;
}
var init_legacyColumns = __esm({
  "src/lib/legacyColumns.ts"() {
  }
});

// src/lib/export/markdown/parse/columnsBlock.ts
function parseColumnsBlock(lines, start, parseMarkdown) {
  const opening = lines[start].trim().match(OPEN);
  if (!opening) return null;
  const sections = [];
  let body = null;
  let depth = 1;
  let fence;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (fence) {
      body?.push(line);
      if (new RegExp(`^\\s*${fence.char}{${fence.length},}\\s*$`).test(line)) fence = void 0;
      continue;
    }
    const marker = trimmed.match(/^(`{3,}|~{3,})/);
    if (marker) {
      if (!body) return null;
      fence = { char: marker[1][0], length: marker[1].length };
      body.push(line);
      continue;
    }
    if (OPEN.test(trimmed)) {
      depth += 1;
      body?.push(line);
      continue;
    }
    if (CLOSE.test(trimmed)) {
      depth -= 1;
      if (depth > 0) {
        body?.push(line);
        continue;
      }
      if (body || !sections.length) return null;
      return {
        blocks: flattenLegacyColumns(sections),
        nextIndex: index + 1
      };
    }
    if (depth === 1 && COLUMN.test(trimmed)) {
      if (body) return null;
      body = [];
      continue;
    }
    if (depth === 1 && END_COLUMN.test(trimmed)) {
      if (!body) return null;
      sections.push({ type: "columnSection", children: parseMarkdown(body.join("\n")) });
      body = null;
      continue;
    }
    if (body) body.push(line);
    else if (trimmed) return null;
  }
  return null;
}
var OPEN, CLOSE, COLUMN, END_COLUMN;
var init_columnsBlock = __esm({
  "src/lib/export/markdown/parse/columnsBlock.ts"() {
    init_legacyColumns();
    init_persistedNames();
    OPEN = new RegExp(`^<!--\\s*${NOTE_MARK_PATTERN}:columns(?:\\s+widths="([\\d.,\\s]+)")?\\s*-->$`, "i");
    CLOSE = new RegExp(`^<!--\\s*\\/${NOTE_MARK_PATTERN}:columns\\s*-->$`, "i");
    COLUMN = new RegExp(`^<!--\\s*${NOTE_MARK_PATTERN}:column\\s*-->$`, "i");
    END_COLUMN = new RegExp(`^<!--\\s*\\/${NOTE_MARK_PATTERN}:column\\s*-->$`, "i");
  }
});

// src/styles/text-colors.json
var text_colors_default;
var init_text_colors = __esm({
  "src/styles/text-colors.json"() {
    text_colors_default = {
      light: {
        primary: "#1f1e1d",
        secondary: "#5e5d59",
        disabled: "#8a8983",
        placeholder: "#85847e",
        danger: "#b42318",
        warning: "#855600",
        success: "#086b42",
        info: "#245bb2",
        onDark: "#ffffff",
        onLight: "#000000",
        onDarkSecondary: "#d3dce8",
        documentText: {
          gray: "$secondary",
          brown: "#64473a",
          red: "$danger",
          orange: "#974e08",
          yellow: "$warning",
          green: "$success",
          blue: "$info",
          purple: "#6940a5",
          pink: "#ad1a72"
        }
      },
      dark: {
        primary: "#f0efec",
        secondary: "#c3c2b7",
        disabled: "#8f8e88",
        placeholder: "#9a9992",
        danger: "#ffb4ab",
        warning: "#f3d17c",
        success: "#8ce0b1",
        info: "#a8c8ff",
        onDark: "#ffffff",
        onLight: "#000000",
        onDarkSecondary: "#d1d1d1",
        documentText: {
          gray: "$secondary",
          brown: "#e7c1ad",
          red: "$danger",
          orange: "#ffc38f",
          yellow: "$warning",
          green: "$success",
          blue: "$info",
          purple: "#d0baf8",
          pink: "#f1b6d7"
        }
      }
    };
  }
});

// src/lib/textColors.ts
function documentTextColors(theme) {
  const roles = TEXT_COLORS[theme];
  return Object.fromEntries(
    Object.entries(roles.documentText).map(([name, value]) => [
      name,
      value.startsWith("$") ? roles[value.slice(1)] : value
    ])
  );
}
var TEXT_COLORS;
var init_textColors = __esm({
  "src/lib/textColors.ts"() {
    init_text_colors();
    TEXT_COLORS = text_colors_default;
  }
});

// src/lib/export/markdown/localBlockPropsWrappers.ts
var LOCAL_WRAPPABLE_BLOCK_TYPES, LOCAL_TEXT_COLOR_CSS;
var init_localBlockPropsWrappers = __esm({
  "src/lib/export/markdown/localBlockPropsWrappers.ts"() {
    init_persistedNames();
    init_textColors();
    init_blockPropsProperties();
    LOCAL_WRAPPABLE_BLOCK_TYPES = /* @__PURE__ */ new Set(
      [...INLINE_BLOCK_TYPES]
    );
    LOCAL_TEXT_COLOR_CSS = documentTextColors("light");
  }
});

// src/lib/export/markdown/blockPropsMarker.ts
var BLOCK_PROPS_MARKER, LEGACY_BLOCK_PROPS_MARKER;
var init_blockPropsMarker = __esm({
  "src/lib/export/markdown/blockPropsMarker.ts"() {
    init_persistedNames();
    init_blockPropsProperties();
    init_blockPropsProperties();
    init_localBlockPropsWrappers();
    BLOCK_PROPS_MARKER = new RegExp(`^<!--[ \\t]*${NOTE_MARK_PATTERN}:block-props=([^\\s]+)[ \\t]*-->`, "i");
    LEGACY_BLOCK_PROPS_MARKER = new RegExp(`^<!--[ \\t]*${NOTE_MARK_PATTERN}:native-block-props=([^\\s]+)[ \\t]*-->`, "i");
  }
});

// src/lib/export/markdown/parse/spanRanges.ts
import { unified } from "unified";
import remarkParse from "remark-parse";
function protectedRanges(source) {
  const ranges = [];
  const visit = (node) => {
    if (node.type === "code" || node.type === "inlineCode") {
      ranges.push([node.position.start.offset, node.position.end.offset]);
    } else node.children?.forEach(visit);
  };
  visit(parser.parse(source.replace(spanPattern(), (tag) => "x".repeat(tag.length))));
  const yaml = source.match(/^---\n[\s\S]*?\n---(?:\n|$)/);
  if (yaml) ranges.unshift([0, yaml[0].length]);
  return ranges;
}
function findClosingSpan(source, from) {
  const pattern = spanPattern();
  const protected_ = source.includes("`") ? protectedRanges(source) : [];
  pattern.lastIndex = from;
  let depth = 1;
  for (let match; match = pattern.exec(source); ) {
    if (protected_.some(([from2, to]) => match.index >= from2 && match.index < to)) continue;
    depth += /^<\//.test(match[0]) ? -1 : 1;
    if (depth === 0) return { start: match.index, end: pattern.lastIndex };
  }
  return null;
}
function normalizeMultilineSpans(source) {
  if (!/[\r\n]/.test(source) || !/<span\b/i.test(source)) return source;
  source = source.replace(/\r\n?/g, "\n");
  const protected_ = protectedRanges(source);
  const stack = [];
  const events = /* @__PURE__ */ new Map();
  for (const match of source.matchAll(spanPattern())) {
    const start = match.index;
    if (protected_.some(([from, to]) => start >= from && start < to)) continue;
    const end = start + match[0].length;
    if (!/^<\//.test(match[0])) stack.push({ start, end, tag: match[0] });
    else {
      const open = stack.pop();
      if (open && source.slice(open.end, start).includes("\n")) {
        events.set(open.start, { end: open.end, tag: open.tag, close: false });
        events.set(start, { end, tag: match[0], close: true });
      }
    }
  }
  if (!events.size) return source;
  const active = [];
  let offset = 0;
  return source.split("\n").map((line) => {
    const prefix = line.match(/^[ \t]*(?:>[ \t]*)*(?:#{1,6}[ \t]+|[-*+][ \t]+(?:\[[ xX]\][ \t]+)?|\d+\.[ \t]+)?/)[0];
    const protectedLine = protected_.some(([from, to]) => offset >= from && offset < to);
    let result = prefix + (line.trim() && !protectedLine ? active.join("") : "");
    for (let index = prefix.length; index < line.length; ) {
      const event = events.get(offset + index);
      if (!event) {
        result += line[index++];
        continue;
      }
      if (event.close) active.pop();
      else active.push(event.tag);
      result += event.tag;
      index = event.end - offset;
    }
    if (line.trim() && !protectedLine) result += "</span>".repeat(active.length);
    offset += line.length + 1;
    return result;
  }).join("\n");
}
var parser, spanPattern;
var init_spanRanges = __esm({
  "src/lib/export/markdown/parse/spanRanges.ts"() {
    parser = unified().use(remarkParse);
    spanPattern = () => /<span\b(?:"[^"]*"|'[^']*'|[^'">])*>|<\/span\s*>/gi;
  }
});

// src/lib/wikiLink.ts
function stripWikiMarkdownExtension(path2) {
  return path2.replace(/\.(md|markdown)$/i, "");
}
function normalizeWikiPath(value) {
  return stripWikiMarkdownExtension(value.trim().replace(/\\/g, "/")).replace(
    /^\.\//,
    ""
  );
}
function lastUnescapedPipeIndex(value) {
  for (let i = value.length - 1; i >= 0; i--) {
    if (value[i] !== "|") continue;
    let slashes = 0;
    for (let j = i - 1; j >= 0 && value[j] === "\\"; j--) slashes += 1;
    if (slashes % 2 !== 0) continue;
    return i;
  }
  return -1;
}
function unescapeWikiText(value) {
  return value.replace(/\\([\\[\]|])/g, "$1");
}
function cutHeadingOrBlock(target) {
  const hash = target.indexOf("#");
  const caret = target.indexOf("^");
  let end = target.length;
  if (hash >= 0) end = Math.min(end, hash);
  if (caret >= 0) end = Math.min(end, caret);
  return target.slice(0, end).trim();
}
function isWikiMediaTarget(target) {
  const base = target.split("/").pop() || target;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return false;
  const ext = base.slice(dot + 1).toLowerCase();
  return WIKI_MEDIA_EXTENSIONS.has(ext);
}
function parseWikiLinkInner(inner) {
  const trimmed = inner.trim();
  if (!trimmed) return null;
  const pipe = lastUnescapedPipeIndex(trimmed);
  const targetPart = (pipe === -1 ? trimmed : trimmed.slice(0, pipe)).trim();
  const alias = unescapeWikiText((pipe === -1 ? "" : trimmed.slice(pipe + 1)).trim());
  const target = normalizeWikiPath(unescapeWikiText(cutHeadingOrBlock(targetPart)));
  if (!target || isWikiMediaTarget(target)) return null;
  return { target, alias };
}
function wikiLinkDisplayTitle(parsed) {
  if (parsed.alias) return parsed.alias;
  const base = parsed.target.split("/").pop() || parsed.target;
  return base || parsed.target;
}
var WIKI_MEDIA_EXTENSIONS;
var init_wikiLink = __esm({
  "src/lib/wikiLink.ts"() {
    WIKI_MEDIA_EXTENSIONS = /* @__PURE__ */ new Set([
      "png",
      "jpg",
      "jpeg",
      "gif",
      "webp",
      "svg",
      "bmp",
      "ico",
      "avif",
      "mp3",
      "wav",
      "ogg",
      "m4a",
      "mp4",
      "webm",
      "mov",
      "mkv",
      "pdf",
      "zip"
    ]);
  }
});

// src/components/editor/inline/pageMention.ts
function readString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function sanitizePageMentionProps(value) {
  if (!value || typeof value !== "object") return null;
  const source = value;
  const nested = source.props && typeof source.props === "object" ? source.props : source;
  const pageId = readString(nested.pageId).trim();
  const wikiTarget = readString(nested.wikiTarget).trim();
  if (!pageId && !wikiTarget) return null;
  const title = readString(nested.title).trim() || EMPTY_MENTION.title;
  return {
    pageId,
    workspaceId: readString(nested.workspaceId).trim(),
    title,
    notebookName: readString(nested.notebookName).trim(),
    wikiTarget
  };
}
function parsePageMentionHref(href) {
  const trimmed = href.trim();
  if (!trimmed.toLowerCase().startsWith(PAGE_MENTION_HREF_SCHEME)) return null;
  const rest = trimmed.slice(PAGE_MENTION_HREF_SCHEME.length).replace(/^\/\//, "");
  const queryIndex = rest.indexOf("?");
  const encodedId = (queryIndex === -1 ? rest : rest.slice(0, queryIndex)).trim();
  let pageId;
  try {
    pageId = decodeURIComponent(encodedId);
  } catch {
    return null;
  }
  let workspaceId = "";
  let wikiTarget = "";
  if (queryIndex !== -1) {
    const params = new URLSearchParams(rest.slice(queryIndex + 1));
    workspaceId = params.get("nb")?.trim() || "";
    wikiTarget = params.get("target")?.trim() || "";
  }
  return pageId || wikiTarget ? { pageId, workspaceId, wikiTarget } : null;
}
function pageMentionFromMarkdownLink(text, href) {
  const parsed = parsePageMentionHref(href);
  if (!parsed) return null;
  const stripped = text.trim().replace(/^@/, "");
  return {
    pageId: parsed.pageId,
    workspaceId: parsed.workspaceId,
    title: stripped || EMPTY_MENTION.title,
    notebookName: "",
    wikiTarget: parsed.wikiTarget
  };
}
function pageMentionFromWikiLink(inner) {
  const parsed = parseWikiLinkInner(inner);
  if (!parsed) return null;
  const title = wikiLinkDisplayTitle(parsed);
  return {
    pageId: "",
    workspaceId: "",
    title: title || EMPTY_MENTION.title,
    notebookName: "",
    wikiTarget: parsed.target
  };
}
var PAGE_MENTION_HREF_SCHEME, EMPTY_MENTION;
var init_pageMention = __esm({
  "src/components/editor/inline/pageMention.ts"() {
    init_wikiLink();
    PAGE_MENTION_HREF_SCHEME = "goose-page:";
    EMPTY_MENTION = {
      pageId: "",
      workspaceId: "",
      title: "\u672A\u547D\u540D",
      notebookName: "",
      wikiTarget: ""
    };
  }
});

// src/lib/export/markdown/parse/inline.ts
function applyStyles(nodes, extra) {
  return nodes.map((node) => {
    if (typeof node === "string") {
      return { type: "text", text: node, styles: { ...extra } };
    }
    if (node?.type === "text") {
      return { ...node, styles: { ...extra, ...node.styles || {} } };
    }
    if (node?.type === "link") return { ...node, content: applyStyles(node.content, extra) };
    return node;
  });
}
function toLinkContent(nodes) {
  return nodes.flatMap((node) => {
    if (typeof node === "string") {
      return [{ type: "text", text: node, styles: {} }];
    }
    if (node?.type === "text") {
      return [{ ...node, styles: node.styles || {} }];
    }
    if (node?.type === "hardBreak") return [{ type: "text", text: "\n", styles: {} }];
    if (node?.type === "link" && Array.isArray(node.content)) {
      return toLinkContent(node.content);
    }
    return [];
  });
}
function parseSpanColorStyles(style) {
  const styles = {};
  const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  const textColor = sanitizeCssColor(colorMatch?.[1]);
  if (textColor) {
    styles.textColor = textColor;
  }
  const bgMatch = style.match(/(?:^|;)\s*background-color\s*:\s*([^;]+)/i);
  const backgroundColor = sanitizeCssColor(bgMatch?.[1]);
  if (backgroundColor) {
    styles.backgroundColor = backgroundColor;
  }
  return styles;
}
function parseInlineMarkdownChunk(text) {
  const result = [];
  if (!text) return result;
  const regex = /(\$((?:\\\$|[^\$])+?)\$|<u>([\s\S]+?)<\/u>|<span\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/span\s*>|==(.+?)==|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`|\[\[((?:\\.|[^\]\\\n])+?)\]\]|\[((?:\\.|[^\]\\])+)\]\(([^)]+)\))/gi;
  let lastIndex = 0;
  let match;
  const breakRegex = /<br\s*\/?>/gi;
  function pushPlain(t) {
    if (!t) return;
    result.push(t);
  }
  while (true) {
    match = regex.exec(text);
    breakRegex.lastIndex = lastIndex;
    const breakMatch = breakRegex.exec(text);
    if (breakMatch && (!match || breakMatch.index < match.index)) {
      if (breakMatch.index > lastIndex) {
        pushPlain(text.slice(lastIndex, breakMatch.index));
      }
      result.push({ type: "hardBreak" });
      lastIndex = breakMatch.index + breakMatch[0].length;
      regex.lastIndex = lastIndex;
      continue;
    }
    if (!match) break;
    if (match[4] !== void 0) {
      const opening = match[4].length + 6;
      const closing = findClosingSpan(text, match.index + opening);
      if (closing) {
        match[5] = text.slice(match.index + opening, closing.start);
        match[0] = text.slice(match.index, closing.end);
        regex.lastIndex = closing.end;
      }
    }
    if (match.index > lastIndex) {
      pushPlain(text.slice(lastIndex, match.index));
    }
    if (match[2] !== void 0) {
      pushPlain(`$${match[2]}$`);
    } else if (match[3] !== void 0) {
      result.push(...applyStyles(parseInlineMarkdown(match[3]), { underline: true }));
    } else if (match[4] !== void 0 && match[5] !== void 0) {
      const styleAttribute = match[4].match(
        /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i
      );
      if (styleAttribute) {
        const styles = parseSpanColorStyles(
          styleAttribute[1] ?? styleAttribute[2] ?? ""
        );
        result.push(...applyStyles(parseInlineMarkdown(match[5]), styles));
      } else {
        result.push(...parseInlineMarkdown(match[5]));
      }
    } else if (match[6] !== void 0) {
      result.push(...applyStyles(parseInlineMarkdown(match[6]), { backgroundColor: "yellow" }));
    } else if (match[7] !== void 0) {
      result.push(...applyStyles(parseInlineMarkdown(match[7]), { bold: true }));
    } else if (match[8] !== void 0) {
      result.push(...applyStyles(parseInlineMarkdown(match[8]), { italic: true }));
    } else if (match[9] !== void 0) {
      result.push(...applyStyles(parseInlineMarkdown(match[9]), { strike: true }));
    } else if (match[10] !== void 0) {
      result.push({ type: "text", text: match[10], styles: { code: true } });
    } else if (match[11] !== void 0) {
      const mention = pageMentionFromWikiLink(match[11]);
      if (mention) {
        result.push({
          type: "pageMention",
          props: mention
        });
      } else {
        pushPlain(match[0]);
      }
    } else if (match[12] !== void 0 && match[13] !== void 0) {
      const label = match[12].replace(/\\([\\[\]])/g, "$1");
      const mention = pageMentionFromMarkdownLink(label, match[13]);
      if (mention) {
        result.push({
          type: "pageMention",
          props: mention
        });
      } else {
        result.push({
          type: "link",
          href: match[13],
          content: toLinkContent(parseInlineMarkdown(match[12]))
        });
      }
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    pushPlain(text.slice(lastIndex));
  }
  return result;
}
function parseInlineMarkdown(text) {
  return parseInlineMarkdownChunk(text);
}
var init_inline = __esm({
  "src/lib/export/markdown/parse/inline.ts"() {
    init_blockPropsMarker();
    init_spanRanges();
    init_pageMention();
  }
});

// src/lib/export/markdown/parse/detailsBlock.ts
function decodeSummary(text) {
  return text.replace(/<br\s*\/?\s*>/gi, "\n").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}
function parseDetailsBlock(lines, start, parseMarkdown) {
  const opening = lines[start].match(/^\s*<details\b([^>]*)>/i);
  if (!opening) return null;
  let depth = 1;
  let fence = null;
  const body = [];
  for (let index = start; index < lines.length; index += 1) {
    const line = index === start ? lines[index].slice(opening[0].length) : lines[index];
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (new RegExp(`^\\s*${fence.char}{${fence.length},}\\s*$`).test(line)) fence = null;
      body.push(line);
      continue;
    }
    if (marker) {
      fence = { char: marker[1][0], length: marker[1].length };
      body.push(line);
      continue;
    }
    const tags = line.matchAll(/<\/?details\b[^>]*>/gi);
    for (const tag of tags) {
      depth += /^<\//.test(tag[0]) ? -1 : 1;
      if (depth !== 0) continue;
      if (line.slice((tag.index ?? 0) + tag[0].length).trim()) return null;
      body.push(line.slice(0, tag.index));
      const inner = body.join("\n");
      const summary = inner.match(/^\s*<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
      if (!summary) return null;
      const heading = summary[1].trim().match(/^<h([1-3])\b[^>]*>([\s\S]*)<\/h\1>$/i);
      const children = parseMarkdown(inner.slice(summary[0].length).trim());
      return {
        blocks: [{
          type: heading ? "heading" : "paragraph",
          ...heading ? { props: { level: Number(heading[1]) } } : {},
          content: parseInlineMarkdown(decodeSummary(heading ? heading[2] : summary[1]))
        }, ...children],
        nextIndex: index + 1
      };
    }
    body.push(line);
  }
  return null;
}
var init_detailsBlock = __esm({
  "src/lib/export/markdown/parse/detailsBlock.ts"() {
    init_inline();
  }
});

// src/lib/export/markdown/parse/htmlBlocks.ts
function decodeHtmlAttribute(value) {
  return value.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
function parseHtmlBlock(lines, startIndex, parseMarkdown) {
  const structured = parseColumnsBlock(lines, startIndex, parseMarkdown) ?? parseAudioBlock(lines, startIndex);
  if (structured) return structured;
  const content = [];
  let i = startIndex;
  const line = lines[i];
  const trimmedLine = line.trim();
  const videoLineMatch = trimmedLine.match(
    /^<video\s+src="([^"]*)"[^>]*>\s*<\/video>$/i
  );
  if (videoLineMatch) {
    content.push({
      type: "video",
      props: { url: decodeHtmlAttribute(videoLineMatch[1]) }
    });
    i++;
    return { block: content[0], nextIndex: i };
  }
  const details = parseDetailsBlock(lines, startIndex, parseMarkdown);
  if (details) return details;
  return null;
}
var init_htmlBlocks = __esm({
  "src/lib/export/markdown/parse/htmlBlocks.ts"() {
    init_audio();
    init_columnsBlock();
    init_detailsBlock();
  }
});

// src/lib/export/markdown/serialize/inline.ts
var init_inline2 = __esm({
  "src/lib/export/markdown/serialize/inline.ts"() {
    init_blockPropsProperties();
    init_pageMention();
  }
});

// src/lib/export/markdown/tableHtml.ts
function sanitizeTableHref(value) {
  const href = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!href) return "";
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(href);
  if (!match) return href;
  const scheme = match[1].toLowerCase();
  if (scheme === "http" || scheme === "https" || scheme === "mailto" || scheme === MENTION_SCHEME) return href;
  return null;
}
function tableColorStyle(props) {
  const styles = [];
  const text = persistedStyleColor(props.textColor, "textColor");
  const background = persistedStyleColor(props.backgroundColor, "backgroundColor");
  if (text && text !== "default") styles.push(`color:${documentTextColors("light")[text] ?? text}`);
  if (background && background !== "default") styles.push(`background-color:${backgrounds[background] ?? background}`);
  if (["center", "right"].includes(String(props.textAlignment))) styles.push(`text-align:${props.textAlignment}`);
  return styles.join(";");
}
function parseTableInlineHtml(node, styles = {}) {
  if (node.nodeType === 3) return node.textContent ? [{ type: "text", text: node.textContent, styles }] : [];
  if (node.nodeType !== 1) return [];
  const element = node;
  const tag = element.tagName.toLowerCase();
  if (["script", "style", "iframe", "object"].includes(tag)) return [];
  if (tag === "br") return [{ type: "text", text: "\n", styles }];
  const extra = { ...styles };
  const mark = { strong: "bold", b: "bold", em: "italic", i: "italic", u: "underline", del: "strike", s: "strike", code: "code" }[tag];
  if (mark) extra[mark] = true;
  for (const property of ["textColor", "backgroundColor"]) {
    const color = sanitizeCssColor(readDataAttr(element, property === "textColor" ? "text-color" : "background-color"));
    if (color) extra[property] = color;
  }
  const mention = readDataAttr(element, "page-mention");
  if (mention) {
    try {
      const props = sanitizePageMentionProps(JSON.parse(decodeURIComponent(mention)));
      if (props) return [{ type: "pageMention", props: { ...props, title: (element.textContent || "").trim().replace(/^@/, "") || props.title } }];
    } catch {
    }
  }
  const children = Array.from(element.childNodes).flatMap((child) => parseTableInlineHtml(child, extra));
  if (tag === "a") {
    const href = element.getAttribute("href") || "";
    const props = pageMentionFromMarkdownLink(element.textContent || "", href);
    if (props) return [{ type: "pageMention", props }];
    const safe = sanitizeTableHref(href);
    const text = children.filter((child) => child.type === "text");
    if (safe == null) return text;
    return [{ type: "link", href: safe, content: text }];
  }
  return children;
}
var backgrounds, MENTION_SCHEME;
var init_tableHtml = __esm({
  "src/lib/export/markdown/tableHtml.ts"() {
    init_textColors();
    init_blockPropsProperties();
    init_pageMention();
    init_persistedNames();
    init_inline2();
    backgrounds = {
      gray: "#ebeced",
      brown: "#e9e5e3",
      red: "#fbe4e4",
      orange: "#f6e9d9",
      yellow: "#fbf3db",
      green: "#ddedea",
      blue: "#ddebf1",
      purple: "#eae4f2",
      pink: "#f4dfeb"
    };
    MENTION_SCHEME = PAGE_MENTION_HREF_SCHEME.replace(/:$/, "").toLowerCase();
  }
});

// src/lib/export/markdown/parse/tableSafety.ts
function isLosslessTableDocument(document2, table) {
  if (document2.head.childNodes.length || Array.from(document2.body.childNodes).some((node) => node !== table && (node.nodeType !== 3 || node.textContent?.trim()))) return false;
  if (table.querySelector("table") || !table.rows.length) return false;
  const elements = [table, ...Array.from(table.querySelectorAll("*"))];
  for (const element of elements) {
    const tag = element.tagName.toLowerCase();
    const allowed = ATTRIBUTES[tag];
    if (!allowed || Array.from(element.attributes).some((attribute) => !allowed.includes(attribute.name))) return false;
    if (tag === "a") {
      const href = element.getAttribute("href");
      if (href && sanitizeTableHref(href) == null) return false;
    }
    if (Array.from(element.childNodes).some((node) => node.nodeType !== 1 && node.nodeType !== 3)) return false;
    if (element.hasAttribute("style")) {
      if (tag === "col") {
        if (!/^width:\s*\d+(?:\.\d+)?px;?$/.test(element.getAttribute("style") || "")) return false;
      } else {
        const expected = tableColorStyle({
          textColor: readDataAttr(element, "text-color"),
          backgroundColor: readDataAttr(element, "background-color"),
          textAlignment: readDataAttr(element, "text-alignment")
        });
        const legacyLeft = readDataAttr(element, "text-alignment") === "left" ? `${expected ? expected + ";" : ""}text-align:left` : expected;
        if (element.getAttribute("style") !== expected && element.getAttribute("style") !== legacyLeft) return false;
      }
    }
  }
  const rows = Array.from(table.rows);
  const occupied = rows.map(() => []);
  let width = 0;
  for (let row = 0; row < rows.length; row += 1) {
    let column = 0;
    for (const cell of Array.from(rows[row].cells)) {
      while (occupied[row][column]) column += 1;
      if (!cell.rowSpan || cell.rowSpan + row > rows.length || column + cell.colSpan > 1e4) return false;
      for (let y = row; y < row + cell.rowSpan; y += 1) {
        for (let x = column; x < column + cell.colSpan; x += 1) {
          if (occupied[y][x]) return false;
          occupied[y][x] = true;
        }
      }
      column += cell.colSpan;
    }
    width = Math.max(width, occupied[row].length);
  }
  const columns = table.querySelectorAll(":scope > colgroup > col").length;
  if (columns && columns !== width) return false;
  return width > 0 && occupied.every((row) => row.length === width && Array.from({ length: width }, (_, index) => row[index]).every(Boolean));
}
var COLOR_ATTRS, ALIGN_ATTRS, ATTRIBUTES;
var init_tableSafety = __esm({
  "src/lib/export/markdown/parse/tableSafety.ts"() {
    init_persistedNames();
    init_tableHtml();
    COLOR_ATTRS = ["data-thinkly-text-color", "data-goose-text-color", "data-thinkly-background-color", "data-goose-background-color"];
    ALIGN_ATTRS = ["data-thinkly-text-alignment", "data-goose-text-alignment"];
    ATTRIBUTES = {
      table: ["data-thinkly-table", "data-goose-table", "data-header-rows", "data-header-cols", ...COLOR_ATTRS, "style"],
      colgroup: [],
      col: ["style"],
      tbody: [],
      tr: [],
      td: ["colspan", "rowspan", ...COLOR_ATTRS, ...ALIGN_ATTRS, "style"],
      th: ["colspan", "rowspan", ...COLOR_ATTRS, ...ALIGN_ATTRS, "style"],
      a: ["href", "target", "rel", "data-thinkly-page-mention", "data-goose-page-mention"],
      span: [...COLOR_ATTRS, "style"],
      strong: [],
      b: [],
      em: [],
      i: [],
      u: [],
      del: [],
      s: [],
      code: [],
      br: []
    };
  }
});

// src/lib/export/markdown/parse/table.ts
function parseTableHtmlBlock(lines, start) {
  if (!/^<table\s+data-(?:thinkly|goose)-table="v1"(?:\s|>)/i.test(lines[start].trim())) return null;
  let end = start;
  while (end < lines.length && !/<\/table>\s*$/i.test(lines[end].trim())) end += 1;
  if (end >= lines.length) return null;
  const source = lines.slice(start, end + 1).join("\n");
  const document2 = new globalThis.DOMParser().parseFromString(source, "text/html");
  const table = document2.querySelector("table");
  if (!table || !isLosslessTableDocument(document2, table)) return { block: { type: "codeBlock", props: { language: "thinkly-raw-block" }, content: source }, nextIndex: end + 1 };
  const count = (value, max) => Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
  const rows = Array.from(table.rows).map((row) => ({
    cells: Array.from(row.cells).map((cell) => {
      const props2 = { colspan: cell.colSpan, rowspan: cell.rowSpan };
      const textColor2 = sanitizeCssColor(readDataAttr(cell, "text-color"));
      const backgroundColor = sanitizeCssColor(readDataAttr(cell, "background-color"));
      const textAlignment = readDataAttr(cell, "text-alignment");
      if (textColor2) props2.textColor = textColor2;
      if (backgroundColor) props2.backgroundColor = backgroundColor;
      if (["center", "right"].includes(textAlignment || "")) props2.textAlignment = textAlignment;
      return { type: "tableCell", props: props2, content: parseTableInlineHtml(cell) };
    })
  }));
  const columns = Array.from(table.querySelectorAll(":scope > colgroup > col"));
  const columnWidths = columns.map((column) => {
    const width = Number(column.style.width.replace(/px$/, ""));
    return width > 0 && Number.isFinite(width) ? width : void 0;
  });
  const textColor = sanitizeCssColor(readDataAttr(table, "text-color"));
  const sequenceColumn = readDataAttr(table, "sequence-column") === "true";
  const props = {
    ...textColor ? { textColor } : {},
    ...sequenceColumn ? { sequenceColumn: true } : {}
  };
  return {
    block: {
      type: "table",
      ...Object.keys(props).length ? { props } : {},
      content: {
        type: "tableContent",
        rows,
        ...columnWidths.length ? { columnWidths } : {},
        headerRows: count(table.getAttribute("data-header-rows"), rows.length),
        headerCols: count(table.getAttribute("data-header-cols"), 1e4)
      }
    },
    nextIndex: end + 1
  };
}
var init_table = __esm({
  "src/lib/export/markdown/parse/table.ts"() {
    init_persistedNames();
    init_blockPropsProperties();
    init_tableHtml();
    init_tableSafety();
  }
});

// src/lib/export/markdown/parse/blockHelpers.ts
function isThematicBreakLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const leading = line.match(/^ */)?.[0].length ?? 0;
  if (leading > 3) return false;
  return /^([-*_])(?:\s*\1){2,}\s*$/.test(trimmed);
}
function isLegacyCodeBlockMetaComment(line) {
  return /^<!--\s*(?:thinkly|goose-note):codeblock\s+.+?\s*-->$/.test(line);
}
function normalizeCodeBlockSummary(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").trim();
}
function parseCodeFenceInfo(infoLine) {
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
            parsed.summary
          );
          if (candidateSummary) {
            summary = candidateSummary;
          }
          if (parsed.collapsed === true) {
            collapsed = true;
          }
          wrap = parsed.wrap === true;
        }
      } catch {
      }
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
    wrap
  };
}
function parseTableBlock(lines, i, parseInline) {
  const isTableSeparator = (value) => {
    const v = value.trim();
    return /^\|?(\s*:?-+:?\s*\|?)+$/.test(v) && v.includes("-");
  };
  const isEscaped = (value, index) => {
    let slashCount = 0;
    for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
      slashCount += 1;
    }
    return slashCount % 2 === 1;
  };
  const trimRowDelimiters = (value) => {
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
  const splitTableRow = (value) => {
    const content = trimRowDelimiters(value);
    const cells = [];
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
  if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
    const headerCells = splitTableRow(line);
    let index = i + 2;
    const bodyRows = [];
    while (index < lines.length && lines[index].trim().includes("|")) {
      if (isTableSeparator(lines[index])) {
        index++;
        continue;
      }
      bodyRows.push(splitTableRow(lines[index]));
      index++;
    }
    const toCellContent = (text) => parseInline(text);
    return {
      block: {
        type: "table",
        content: {
          type: "tableContent",
          headerRows: 1,
          rows: [
            { cells: headerCells.map(toCellContent) },
            ...bodyRows.map((row) => ({ cells: row.map(toCellContent) }))
          ]
        }
      },
      nextIndex: index
    };
  }
  return null;
}
var CODE_BLOCK_META_PREFIXES;
var init_blockHelpers = __esm({
  "src/lib/export/markdown/parse/blockHelpers.ts"() {
    CODE_BLOCK_META_PREFIXES = ["thinkly=", "goose-note="];
  }
});

// src/lib/export/markdown/parse/codeBlocks.ts
function parseCodeBlock(lines, startIndex) {
  const line = lines[startIndex];
  if (line.trim() === "$$") {
    const mathLines = [];
    let i2 = startIndex + 1;
    while (i2 < lines.length && lines[i2].trim() !== "$$") {
      mathLines.push(lines[i2]);
      i2++;
    }
    return {
      block: { type: "codeBlock", props: { language: "math" }, content: mathLines.join("\n") },
      nextIndex: i2 < lines.length ? i2 + 1 : i2
    };
  }
  const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if (!opening || opening[1][0] === "`" && opening[2].includes("`")) return null;
  const fence = opening[1];
  const info = parseCodeFenceInfo(opening[2].trim());
  const closing = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \\t]*$`);
  const codeLines = [];
  let i = startIndex + 1;
  while (i < lines.length && !closing.test(lines[i])) {
    codeLines.push(lines[i]);
    i++;
  }
  return {
    block: {
      type: "codeBlock",
      props: {
        language: info.language,
        ...info.summary ? { summary: info.summary } : {},
        ...info.collapsed ? { collapsed: true } : {},
        ...info.wrap ? { wrap: true } : {}
      },
      content: codeLines.join("\n")
    },
    nextIndex: i < lines.length ? i + 1 : i
  };
}
var init_codeBlocks = __esm({
  "src/lib/export/markdown/parse/codeBlocks.ts"() {
    init_blockHelpers();
  }
});

// src/lib/export/markdown/parse/mediaBlocks.ts
function parseFileBlock(lines, startIndex) {
  const match = lines[startIndex].trim().match(
    /^\[📎\s+((?:\\.|[^\]])*)\]\((?:<([^>]+)>|([^)]*))\)(?:\{goose-file=([^}]+)\})?$/
  );
  if (!match) return null;
  const props = {
    name: match[1].replace(/\\([\\\]])/g, "$1").trim(),
    url: match[2] ?? match[3]
  };
  try {
    const metadata = JSON.parse(decodeURIComponent(match[4] || ""));
    if (metadata?.v === 1) {
      if (typeof metadata.name === "string") props.name = metadata.name;
      if (typeof metadata.caption === "string") props.caption = metadata.caption;
      const backgroundColor = sanitizeCssColor(metadata.backgroundColor);
      if (backgroundColor) props.backgroundColor = backgroundColor;
    }
  } catch {
  }
  return { block: { type: "file", props }, nextIndex: startIndex + 1 };
}
function parseImageBlock(lines, startIndex) {
  const content = [];
  let i = startIndex;
  const line = lines[i];
  const trimmedLine = line.trim();
  const imgMatch = trimmedLine.match(
    /^!\[((?:\\.|[^\]])*)\]\((?:<([^>]+)>|([^)]*))\)(?:\{([^}]+)\})?$/
  );
  if (imgMatch) {
    const metaRaw = imgMatch[4] || "";
    const metaMap = /* @__PURE__ */ new Map();
    metaRaw.split(/\s+/).map((chunk) => chunk.trim()).filter(Boolean).forEach((chunk) => {
      const [key, value] = chunk.split("=");
      if (key && value) metaMap.set(key, value);
    });
    const width = metaMap.get("width");
    const widthValue = width ? Number(width) : void 0;
    const align = metaMap.get("align");
    const alt = imgMatch[1].replace(/\\([\\\]])/g, "$1");
    const url = imgMatch[2] ?? imgMatch[3];
    let imageMetadata;
    try {
      const parsed = JSON.parse(decodeURIComponent(metaMap.get("goose-image") || ""));
      if (parsed?.v === 1) imageMetadata = parsed;
    } catch {
    }
    content.push({
      type: "image",
      props: {
        url,
        ...alt ? { name: alt } : {},
        ...imageMetadata ? {
          alt: typeof imageMetadata.alt === "string" ? imageMetadata.alt : alt,
          name: typeof imageMetadata.name === "string" ? imageMetadata.name : "",
          ...sanitizeCssColor(imageMetadata.backgroundColor) ? { backgroundColor: sanitizeCssColor(imageMetadata.backgroundColor) } : {},
          showPreview: imageMetadata.showPreview !== false
        } : {},
        ...Number.isFinite(widthValue) && Number(widthValue) > 0 ? { previewWidth: widthValue } : {},
        ...align && ["center", "right"].includes(align) ? { textAlignment: align } : {}
      }
    });
    i++;
    return { block: content[0], nextIndex: i };
  }
  return null;
}
var init_mediaBlocks = __esm({
  "src/lib/export/markdown/parse/mediaBlocks.ts"() {
    init_blockPropsProperties();
  }
});

// src/i18n/contract.ts
function normalizePreference(value) {
  return value === "zh-Hans" || value === "en" || value === "ja" ? value : "system";
}
function normalizeSystemLocale(value) {
  if (typeof value !== "string") return void 0;
  const tag = value.trim().replace(/[.@].*$/, "").replaceAll("_", "-");
  if (!tag || /^(C|POSIX)$/i.test(tag)) return void 0;
  try {
    return new Intl.Locale(tag).toString();
  } catch {
    return void 0;
  }
}
function matchLocale(value) {
  const tag = normalizeSystemLocale(value);
  if (!tag) return void 0;
  const locale = new Intl.Locale(tag);
  if (locale.language === "en") return "en";
  if (locale.language === "ja") return "ja";
  if (locale.language !== "zh") return void 0;
  if (locale.script === "Hans") return "zh-Hans";
  if (locale.script) return void 0;
  if (!locale.region || ["CN", "SG"].includes(locale.region)) return "zh-Hans";
  return void 0;
}
function resolveLocale(preference, languages) {
  const normalized = normalizePreference(preference);
  if (normalized !== "system") return normalized;
  for (const language of languages) {
    const match = matchLocale(language);
    if (match) return match;
  }
  return "en";
}
var init_contract2 = __esm({
  "src/i18n/contract.ts"() {
  }
});

// src/i18n/types.ts
var init_types = __esm({
  "src/i18n/types.ts"() {
  }
});

// src/i18n/runtime.ts
import { createInstance } from "i18next";
function bridge() {
  return typeof window === "undefined" ? void 0 : window.gooseLanguage;
}
function initialSnapshot() {
  const desktop = bridge()?.initialSnapshot;
  if (desktop) return desktop;
  const languages = typeof navigator === "undefined" ? [] : navigator.languages;
  return {
    preference: "system",
    effectiveLocale: resolveLocale("system", languages),
    formatLocale: normalizeSystemLocale(languages[0]) ?? "en-US",
    revision: 0
  };
}
function setLanguageSnapshot(next) {
  if (next.revision < snapshot.revision) return;
  if (next.revision === snapshot.revision && next.preference === snapshot.preference && next.effectiveLocale === snapshot.effectiveLocale && next.formatLocale === snapshot.formatLocale && next.error === snapshot.error) return;
  snapshot = next;
  if (typeof document !== "undefined") document.documentElement.lang = next.effectiveLocale;
  for (const listener of listeners) listener();
}
function formatInterpolation(value) {
  if (typeof value !== "number") return String(value ?? "");
  const locale = getFormatLocale();
  if (!numberFormatter || numberFormatLocale !== locale) {
    numberFormatter = new Intl.NumberFormat(locale);
    numberFormatLocale = locale;
  }
  return numberFormatter.format(value);
}
function namespaceFor(messages) {
  const existing = namespaces.get(messages);
  if (existing) return existing;
  const namespace = `messages-${++nextNamespace}`;
  engine.addResourceBundle("zh-Hans", namespace, messages["zh-Hans"]);
  engine.addResourceBundle("en", namespace, messages.en);
  engine.addResourceBundle("ja", namespace, messages.ja);
  namespaces.set(messages, namespace);
  return namespace;
}
function createTranslator(messages) {
  const namespace = namespaceFor(messages);
  return ((key, parameters) => {
    const options = {
      lng: getLocale(),
      ns: namespace,
      replace: parameters && Object.fromEntries(
        Object.entries(parameters).map(([name, value]) => [name, formatInterpolation(value)])
      ),
      ...typeof parameters?.count === "number" ? { count: parameters.count } : {}
    };
    if (!engine.exists(key, options)) {
      console.error(`[i18n] Missing translation: ${key}`);
      return { "zh-Hans": "\u6682\u4E0D\u53EF\u7528", en: "Unavailable", ja: "\u5229\u7528\u3067\u304D\u307E\u305B\u3093" }[getLocale()];
    }
    return String(engine.t(key, options));
  });
}
var snapshot, listeners, getLocale, getFormatLocale, desktopBridge, numberFormatter, numberFormatLocale, engine, namespaces, nextNamespace;
var init_runtime = __esm({
  "src/i18n/runtime.ts"() {
    init_contract2();
    snapshot = initialSnapshot();
    listeners = /* @__PURE__ */ new Set();
    getLocale = () => snapshot.effectiveLocale;
    getFormatLocale = () => snapshot.formatLocale;
    if (typeof document !== "undefined") document.documentElement.lang = snapshot.effectiveLocale;
    desktopBridge = bridge();
    desktopBridge?.onSnapshot(setLanguageSnapshot);
    if (desktopBridge) void desktopBridge.getSnapshot().then(setLanguageSnapshot).catch((error) => {
      console.warn("[i18n] Could not refresh language snapshot", error);
    });
    numberFormatLocale = "";
    engine = createInstance();
    void engine.init({
      lng: getLocale(),
      fallbackLng: "en",
      supportedLngs: ["zh-Hans", "en", "ja"],
      load: "currentOnly",
      initAsync: false,
      keySeparator: false,
      nsSeparator: false,
      interpolation: { escapeValue: false },
      returnNull: false,
      returnEmptyString: false,
      resources: {},
      ns: []
    });
    namespaces = /* @__PURE__ */ new WeakMap();
    nextNamespace = 0;
  }
});

// src/i18n/core.ts
var init_core = __esm({
  "src/i18n/core.ts"() {
    init_contract2();
    init_types();
    init_runtime();
  }
});

// src/lib/export/markdown/serialize/codeFence.ts
var init_codeFence = __esm({
  "src/lib/export/markdown/serialize/codeFence.ts"() {
  }
});

// src/lib/markdown-raw-guard.ts
function normalizeMarkdownLineBreaks(markdown) {
  return markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function extractFrontmatter(markdown) {
  const normalized = normalizeMarkdownLineBreaks(markdown);
  const lines = normalized.split("\n");
  if (lines.length === 0 || lines[0].trim() !== "---") {
    return { frontmatter: null, body: normalized };
  }
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return { frontmatter: null, body: normalized };
  const frontmatter = lines.slice(0, endIdx + 1).join("\n");
  let bodyStart = endIdx + 1;
  while (bodyStart < lines.length && lines[bodyStart].trim() === "") {
    bodyStart += 1;
  }
  return { frontmatter, body: lines.slice(bodyStart).join("\n") };
}
var init_markdown_raw_guard = __esm({
  "src/lib/markdown-raw-guard.ts"() {
    init_codeFence();
  }
});

// src/lib/local-frontmatter/settings.ts
function normalizePageLayout(value) {
  return value === "full" ? "full" : "standard";
}
function normalizeFont(value) {
  if (typeof value !== "string") return "default";
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "sans" || trimmed === "default") return "default";
  if (trimmed === "serif" || trimmed === "mono") return trimmed;
  return "default";
}
function normalizeLocked(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    if (t === "true" || t === "yes" || t === "1") return true;
    if (t === "false" || t === "no" || t === "0" || t === "") return false;
  }
  return Boolean(value);
}
function normalizePinned(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    if (t === "true" || t === "yes" || t === "1") return true;
    if (t === "false" || t === "no" || t === "0" || t === "") return false;
  }
  return Boolean(value);
}
function normalizeFavorite(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    if (t === "true" || t === "yes" || t === "1") return true;
    if (t === "false" || t === "no" || t === "0" || t === "") return false;
  }
  return Boolean(value);
}
function settingsFromData(data) {
  const fontRaw = data[GOOSE_FONT_KEY];
  const lockedRaw = data[GOOSE_LOCKED_KEY];
  const pinnedRaw = data[GOOSE_PINNED_KEY];
  const favoriteRaw = data[GOOSE_FAVORITE_KEY];
  return {
    pageLayout: data[GOOSE_LAYOUT_KEY] === void 0 ? void 0 : normalizePageLayout(data[GOOSE_LAYOUT_KEY]),
    fontFamily: fontRaw === void 0 ? "default" : normalizeFont(fontRaw),
    isLocked: lockedRaw === void 0 ? false : normalizeLocked(lockedRaw),
    isPinned: pinnedRaw === void 0 ? false : normalizePinned(pinnedRaw),
    isFavorite: favoriteRaw === void 0 ? false : normalizeFavorite(favoriteRaw)
  };
}
var GOOSE_LAYOUT_KEY, GOOSE_FONT_KEY, GOOSE_LOCKED_KEY, GOOSE_PINNED_KEY, GOOSE_FAVORITE_KEY, DEFAULT_SETTINGS;
var init_settings = __esm({
  "src/lib/local-frontmatter/settings.ts"() {
    GOOSE_LAYOUT_KEY = "goose-layout";
    GOOSE_FONT_KEY = "goose-font";
    GOOSE_LOCKED_KEY = "goose-locked";
    GOOSE_PINNED_KEY = "goose-pinned";
    GOOSE_FAVORITE_KEY = "goose-favorite";
    DEFAULT_SETTINGS = {
      fontFamily: "default",
      pageLayout: void 0,
      isLocked: false,
      isPinned: false,
      isFavorite: false
    };
  }
});

// src/lib/local-frontmatter/parser.ts
import { isMap as isMap3, parseDocument as parseDocument2 } from "yaml";
function stripFrontmatterDelimiters(blob) {
  const lines = blob.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length >= 2 && lines[0].trim() === "---") {
    let endIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        endIdx = i;
        break;
      }
    }
    if (endIdx !== -1) {
      return lines.slice(1, endIdx).join("\n");
    }
  }
  return blob;
}
function parseLocalFrontmatterBlob(blob) {
  if (!blob || !blob.trim()) {
    return { ok: true, data: {}, settings: { ...DEFAULT_SETTINGS } };
  }
  if (/^---\s*(?:\n|$)/.test(blob.replace(/\r\n?/g, "\n")) && !extractFrontmatter(blob).frontmatter) {
    return {
      ok: false,
      data: {},
      settings: { ...DEFAULT_SETTINGS },
      error: uiText("theYamlFrontmatterIsNotClosed")
    };
  }
  const yamlText = stripFrontmatterDelimiters(blob);
  if (!yamlText.trim()) {
    return { ok: true, data: {}, settings: { ...DEFAULT_SETTINGS } };
  }
  try {
    const document2 = parseDocument2(yamlText);
    if (document2.errors.length) throw document2.errors[0];
    if (!document2.contents) {
      return { ok: true, data: {}, settings: { ...DEFAULT_SETTINGS } };
    }
    if (!isMap3(document2.contents)) {
      return {
        ok: false,
        data: {},
        settings: { ...DEFAULT_SETTINGS },
        error: uiText("theFrontmatterRootMustBeAnObject")
      };
    }
    const parsed = document2.toJS();
    return {
      ok: true,
      data: { ...parsed },
      settings: settingsFromData(parsed)
    };
  } catch {
    return {
      ok: false,
      data: {},
      settings: { ...DEFAULT_SETTINGS },
      error: uiText("couldnTParseYaml")
    };
  }
}
var localMessages, uiText;
var init_parser = __esm({
  "src/lib/local-frontmatter/parser.ts"() {
    init_core();
    init_markdown_raw_guard();
    init_settings();
    localMessages = { "zh-Hans": { "theYamlFrontmatterIsNotClosed": "YAML \u524D\u7F6E\u533A\u672A\u95ED\u5408", "theFrontmatterRootMustBeAnObject": "frontmatter \u6839\u8282\u70B9\u5FC5\u987B\u662F\u5BF9\u8C61", "couldnTParseYaml": "YAML \u89E3\u6790\u5931\u8D25" }, "en": { "theYamlFrontmatterIsNotClosed": "The YAML frontmatter is not closed", "theFrontmatterRootMustBeAnObject": "The frontmatter root must be an object", "couldnTParseYaml": "Couldn\u2019t parse YAML" }, "ja": { "theYamlFrontmatterIsNotClosed": "YAML \u30D5\u30ED\u30F3\u30C8\u30DE\u30BF\u30FC\u304C\u9589\u3058\u3089\u308C\u3066\u3044\u307E\u305B\u3093", "theFrontmatterRootMustBeAnObject": "\u30D5\u30ED\u30F3\u30C8\u30DE\u30BF\u30FC\u306E\u30EB\u30FC\u30C8\u306F\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059", "couldnTParseYaml": "YAML \u3092\u89E3\u6790\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F" } };
    uiText = createTranslator(localMessages);
  }
});

// src/lib/local-frontmatter.ts
import { parseDocument as parseDocument3 } from "yaml";
function isGooseFrontmatterKey(key) {
  return [
    "goose-note",
    "goose-id",
    GOOSE_LAYOUT_KEY,
    GOOSE_FONT_KEY,
    GOOSE_LOCKED_KEY,
    GOOSE_PINNED_KEY,
    GOOSE_FAVORITE_KEY
  ].includes(key);
}
function frontmatterBodyHasUserVisibleKeys(yamlBody) {
  const parsed = parseLocalFrontmatterBlob(yamlBody);
  if (!parsed.ok) return Boolean((yamlBody ?? "").trim());
  return Object.keys(parsed.data).some((key) => !isGooseFrontmatterKey(key));
}
var localMessages2, uiText2;
var init_local_frontmatter = __esm({
  "src/lib/local-frontmatter.ts"() {
    init_core();
    init_parser();
    init_parser();
    init_markdown_raw_guard();
    init_identity();
    init_settings();
    init_settings();
    localMessages2 = { "zh-Hans": { "theYamlFrontmatterIsNotClosedSavingHasBeen": "YAML \u524D\u7F6E\u533A\u672A\u95ED\u5408\uFF0C\u5DF2\u963B\u6B62\u4FDD\u5B58", "theYamlFrontmatterIsInvalidSavingHasBeenBlocked": "YAML \u524D\u7F6E\u533A\u683C\u5F0F\u5F02\u5E38\uFF0C\u5DF2\u963B\u6B62\u4FDD\u5B58", "couldnTSerializeYaml": "YAML \u5E8F\u5217\u5316\u5931\u8D25" }, "en": { "theYamlFrontmatterIsNotClosedSavingHasBeen": "The YAML frontmatter is not closed. Saving has been blocked.", "theYamlFrontmatterIsInvalidSavingHasBeenBlocked": "The YAML frontmatter is invalid. Saving has been blocked.", "couldnTSerializeYaml": "Couldn\u2019t serialize YAML" }, "ja": { "theYamlFrontmatterIsNotClosedSavingHasBeen": "YAML \u30D5\u30ED\u30F3\u30C8\u30DE\u30BF\u30FC\u304C\u9589\u3058\u3089\u308C\u3066\u3044\u306A\u3044\u305F\u3081\u3001\u4FDD\u5B58\u3092\u30D6\u30ED\u30C3\u30AF\u3057\u307E\u3057\u305F", "theYamlFrontmatterIsInvalidSavingHasBeenBlocked": "YAML \u30D5\u30ED\u30F3\u30C8\u30DE\u30BF\u30FC\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u306A\u3044\u305F\u3081\u3001\u4FDD\u5B58\u3092\u30D6\u30ED\u30C3\u30AF\u3057\u307E\u3057\u305F", "couldnTSerializeYaml": "YAML \u3092\u30B7\u30EA\u30A2\u30E9\u30A4\u30BA\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F" } };
    uiText2 = createTranslator(localMessages2);
  }
});

// src/lib/export/markdown/blockChildrenWrapper.ts
function isBlockChildrenOpen(line) {
  return line === BLOCK_CHILDREN_OPEN || line === LEGACY_BLOCK_CHILDREN_OPEN;
}
function isBlockChildrenClose(line) {
  return line === BLOCK_CHILDREN_CLOSE || line === LEGACY_BLOCK_CHILDREN_CLOSE;
}
function findBlockChildrenEnd(lines, start) {
  if (!isBlockChildrenOpen(lines[start])) return null;
  let depth = 1;
  let fence = null;
  for (let index = start + 1; index < lines.length; index += 1) {
    const fenceMatch = lines[index].match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const token = fenceMatch[1];
      if (!fence) {
        fence = { character: token[0], length: token.length };
      } else if (token[0] === fence.character && token.length >= fence.length && /^\s*(?:`{3,}|~{3,})\s*$/.test(lines[index])) {
        fence = null;
      }
      continue;
    }
    if (fence) continue;
    if (isBlockChildrenOpen(lines[index])) depth += 1;
    else if (isBlockChildrenClose(lines[index]) && --depth === 0) return index;
  }
  return null;
}
var BLOCK_CHILDREN_OPEN, BLOCK_CHILDREN_CLOSE, LEGACY_BLOCK_CHILDREN_OPEN, LEGACY_BLOCK_CHILDREN_CLOSE;
var init_blockChildrenWrapper = __esm({
  "src/lib/export/markdown/blockChildrenWrapper.ts"() {
    init_persistedNames();
    BLOCK_CHILDREN_OPEN = noteComment("block-children v1");
    BLOCK_CHILDREN_CLOSE = noteCommentClose("block-children");
    LEGACY_BLOCK_CHILDREN_OPEN = "<!-- goose-note:block-children v1 -->";
    LEGACY_BLOCK_CHILDREN_CLOSE = "<!-- /goose-note:block-children -->";
  }
});

// src/lib/export/markdown/parse/blockChildren.ts
function isBlockChildrenMarker(line) {
  return isBlockChildrenOpen(line) || isBlockChildrenClose(line);
}
function shouldSkipListSpacer(lines, index) {
  if (isBlockChildrenClose(lines[index - 1]?.trim() ?? "")) return true;
  for (let next = index + 1; next < lines.length; next += 1) {
    if (!lines[next].trim()) continue;
    return isBlockChildrenOpen(lines[next]?.trim() ?? "");
  }
  return false;
}
function tryAttachBlockChildren(lines, index, blocks, parseMarkdown) {
  const line = lines[index];
  if (isBlockChildrenClose(line)) {
    blocks.push({ type: "paragraph", content: line });
    return { handled: true, nextIndex: index + 1 };
  }
  if (!isBlockChildrenOpen(line) || blocks.length === 0) return null;
  const end = findBlockChildrenEnd(lines, index);
  if (end === null) return null;
  const children = parseMarkdown(lines.slice(index + 1, end).join("\n"));
  const parent = blocks[blocks.length - 1];
  parent.children = [...parent.children ?? [], ...children];
  return { handled: true, nextIndex: end + 1 };
}
var init_blockChildren = __esm({
  "src/lib/export/markdown/parse/blockChildren.ts"() {
    init_blockChildrenWrapper();
  }
});

// src/components/editor/blocks/callout/calloutIcons.ts
var LUCIDE_ICON_TO_EMOJI, EMOJI_TO_LUCIDE_ICON;
var init_calloutIcons = __esm({
  "src/components/editor/blocks/callout/calloutIcons.ts"() {
    LUCIDE_ICON_TO_EMOJI = {
      Lightbulb: "\u{1F4A1}",
      AlertTriangle: "\u26A0\uFE0F",
      CircleAlert: "\u2757",
      CircleCheck: "\u2705",
      Flame: "\u{1F525}",
      Pin: "\u{1F4CC}",
      MessageSquare: "\u{1F4AC}",
      Target: "\u{1F3AF}",
      Rocket: "\u{1F680}",
      Star: "\u2B50",
      Bell: "\u{1F514}",
      Bug: "\u{1F41B}"
    };
    EMOJI_TO_LUCIDE_ICON = Object.fromEntries(
      Object.entries(LUCIDE_ICON_TO_EMOJI).map(([name, emoji]) => [emoji, name])
    );
  }
});

// src/lib/export/markdown/serialize/image.ts
var init_image = __esm({
  "src/lib/export/markdown/serialize/image.ts"() {
  }
});

// src/lib/export/markdown/noteMeta.ts
import { stringify as stringifyYaml } from "yaml";
function peelFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0]?.trim() !== "---") return { frontmatter: null, body: normalized };
  let end = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      end = index;
      break;
    }
  }
  if (end === -1) return { frontmatter: null, body: normalized };
  const rest = lines.slice(end + 1);
  if (rest[0] === "") rest.shift();
  return { frontmatter: lines.slice(0, end + 1).join("\n"), body: rest.join("\n") };
}
function parseMeta(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (parsed === null) return null;
    validateNoteMeta(parsed);
    return parsed;
  } catch {
    return null;
  }
}
function splitGeneratedMarkdown(markdown) {
  const extracted = peelFrontmatter(markdown);
  if (!extracted.frontmatter) return { body: markdown, meta: null };
  const parsed = parseLocalFrontmatterBlob(extracted.frontmatter);
  if (!parsed.ok || !Object.prototype.hasOwnProperty.call(parsed.data, NOTE_META_KEY)) {
    return { body: markdown, meta: null };
  }
  const meta = parseMeta(parsed.data[NOTE_META_KEY]);
  if (!meta) return { body: markdown, meta: null };
  const { document: document2, tail, present } = splitFrontmatter(markdown);
  document2.delete(NOTE_META_KEY);
  if (document2.contents.items.length === 0) return { body: extracted.body, meta };
  return { body: renderFrontmatter(document2, tail, present), meta };
}
function applyPatch(props, patch) {
  const next = { ...props };
  for (const key of ["props", "image", "file", "media", "code"]) {
    const value = patch[key];
    if (value && typeof value === "object") Object.assign(next, value);
  }
  if (typeof patch.calloutIcon === "string") next.icon = patch.calloutIcon;
  if (patch.sequence === true) next.sequenceColumn = true;
  delete next.legacyResize;
  return next;
}
function foldLevel(blocks, nests) {
  const next = blocks.map((block) => ({ ...block }));
  const consumed = /* @__PURE__ */ new Set();
  for (const nest of nests) {
    const parent = next[nest.at];
    if (!parent) continue;
    const kids = [];
    for (let offset = 1; offset <= Math.min(nest.count, next.length - nest.at - 1); offset += 1) {
      const index = nest.at + offset;
      if (!next[index]) continue;
      kids.push(next[index]);
      consumed.add(index);
    }
    next[nest.at] = { ...parent, children: [...parent.children ?? [], ...kids] };
  }
  return next.filter((_, index) => !consumed.has(index));
}
function applyNoteMeta(blocks, meta) {
  if (!meta) return blocks;
  const nests = /* @__PURE__ */ new Map();
  for (const nest of meta.nests ?? []) {
    if (!nests.has(nest.path)) nests.set(nest.path, []);
    nests.get(nest.path).push(nest);
  }
  for (const bucket of nests.values()) bucket.sort((a, b) => b.at - a.at);
  const visit = (list, parentPath) => {
    const patched = list.map((block, index) => {
      const path2 = parentPath ? `${parentPath}.${index}` : String(index);
      const children = Array.isArray(block?.children) ? visit(block.children, path2) : block?.children;
      const patch = meta.blocks?.[path2];
      return {
        ...block,
        ...children ? { children } : {},
        ...patch ? { props: applyPatch(block?.props ?? {}, patch) } : {}
      };
    });
    return foldLevel(patched, nests.get(parentPath) ?? []);
  };
  return visit(blocks, "");
}
var NOTE_META_KEY;
var init_noteMeta = __esm({
  "src/lib/export/markdown/noteMeta.ts"() {
    init_calloutIcons();
    init_local_frontmatter();
    init_blockPropsMarker();
    init_blockPropsProperties();
    init_image();
    init_identity();
    init_validate();
    NOTE_META_KEY = "goose-note";
  }
});

// src/lib/export/markdown/parse/quoteBlock.ts
function parseQuoteBlock(lines, index) {
  const line = lines[index];
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith(">")) return null;
  const firstLine = trimmedLine.slice(1).trim();
  const calloutMatch = firstLine.match(/^\[!INFO\]\s+(\S+)\s+(.*)$/i);
  if (calloutMatch) {
    let icon = calloutMatch[1];
    let firstContent = calloutMatch[2];
    const iconMarker = firstContent.match(new RegExp(`^<!--\\s*${NOTE_MARK_PATTERN}:callout-icon=([^\\s]+)\\s*-->`));
    if (iconMarker) {
      try {
        icon = decodeURIComponent(iconMarker[1]);
        firstContent = firstContent.slice(iconMarker[0].length);
      } catch {
      }
    }
    const calloutLines = [firstContent];
    let cursor2 = index + 1;
    while (cursor2 < lines.length && lines[cursor2].trim().startsWith(">")) {
      calloutLines.push(lines[cursor2].trim().slice(1).trim());
      cursor2 += 1;
    }
    return {
      block: { type: "callout", props: { icon }, content: parseInlineMarkdown(calloutLines.join("\n")) },
      nextIndex: cursor2
    };
  }
  const quoteLines = [firstLine];
  let cursor = index + 1;
  while (cursor < lines.length && lines[cursor].trim().startsWith(">")) {
    quoteLines.push(lines[cursor].trim().slice(1).trim());
    cursor += 1;
  }
  return {
    block: { type: "quote", content: parseInlineMarkdown(quoteLines.join("\n")) },
    nextIndex: cursor
  };
}
var init_quoteBlock = __esm({
  "src/lib/export/markdown/parse/quoteBlock.ts"() {
    init_persistedNames();
    init_inline();
  }
});

// src/lib/export/markdown/parse/block.ts
function markdownToJsonContent(markdown) {
  const split = splitGeneratedMarkdown(markdown);
  return applyNoteMeta(parseMarkdownBody(normalizeMultilineSpans(split.body)), split.meta);
}
function pushBlankParagraphs(lines, index, content) {
  let blanks = 0;
  let cursor = index;
  while (cursor < lines.length && !lines[cursor].trim()) {
    if (!shouldSkipListSpacer(lines, cursor)) blanks += 1;
    cursor += 1;
  }
  const empties = content.length === 0 || cursor >= lines.length ? blanks : Math.max(0, blanks - 1);
  for (let count = 0; count < empties; count += 1) content.push({ type: "paragraph" });
  return cursor;
}
function parseMarkdownBody(markdown) {
  let source = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (source.endsWith("\n")) source = source.slice(0, -1);
  if (!source.trim()) return source.length || markdown.length ? source.split("\n").map(() => ({ type: "paragraph" })) : [];
  const lines = source.split("\n");
  const content = [];
  let i = 0;
  if (lines.length > 0 && lines[0].trim() === "---") {
    const frontmatterLines = [];
    i++;
    while (i < lines.length && lines[i].trim() !== "---") {
      frontmatterLines.push(lines[i]);
      i++;
    }
    if (i < lines.length && lines[i].trim() === "---") {
      const yamlBody = frontmatterLines.join("\n");
      const visible = frontmatterBodyHasUserVisibleKeys(yamlBody);
      if (visible) {
        content.push({
          type: "codeBlock",
          props: { language: "yaml-frontmatter" },
          content: yamlBody
        });
      }
      i++;
      if (!visible && lines[i] === "") i++;
    } else {
      i = 0;
    }
  }
  while (i < lines.length) {
    if (!lines[i].trim()) {
      i = pushBlankParagraphs(lines, i, content);
      continue;
    }
    const line = lines[i];
    const trimmedLine = line.trim();
    if (new RegExp(`^<!--\\s*${NOTE_MARK_PATTERN}:empty-block=paragraph\\s*-->$`).test(trimmedLine)) {
      content.push({ type: "paragraph" });
      i++;
      continue;
    }
    if (new RegExp(`^<!--\\s*${NOTE_MARK_PATTERN}:table-sequence\\s*-->$`).test(trimmedLine)) {
      const tableResult2 = parseTableHtmlBlock(lines, i + 1) ?? parseTableBlock(lines, i + 1, parseInlineMarkdown);
      if (tableResult2) {
        tableResult2.block.props = { ...tableResult2.block.props ?? {}, sequenceColumn: true };
        content.push(tableResult2.block);
        i = tableResult2.nextIndex;
        continue;
      }
    }
    const childWrapper = tryAttachBlockChildren(lines, i, content, parseMarkdownBody);
    if (childWrapper) {
      i = childWrapper.nextIndex;
      continue;
    }
    if (isLegacyCodeBlockMetaComment(trimmedLine)) {
      i++;
      continue;
    }
    const parseHtmlBlockResult = parseTableHtmlBlock(lines, i) ?? parseHtmlBlock(lines, i, parseMarkdownBody);
    if (parseHtmlBlockResult) {
      if ("blocks" in parseHtmlBlockResult && Array.isArray(parseHtmlBlockResult.blocks)) {
        for (const block of parseHtmlBlockResult.blocks) content.push(block);
      } else if ("block" in parseHtmlBlockResult && parseHtmlBlockResult.block) {
        content.push(parseHtmlBlockResult.block);
      }
      i = parseHtmlBlockResult.nextIndex;
      continue;
    }
    const parseCodeBlockResult = parseCodeBlock(lines, i);
    if (parseCodeBlockResult) {
      content.push(parseCodeBlockResult.block);
      i = parseCodeBlockResult.nextIndex;
      continue;
    }
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      content.push({
        type: "heading",
        props: { level: headingMatch[1].length },
        content: parseInlineMarkdown(headingMatch[2])
      });
      i++;
      continue;
    }
    if (trimmedLine && !trimmedLine.startsWith(">") && !trimmedLine.startsWith("-") && !trimmedLine.startsWith("#") && !trimmedLine.startsWith("<") && !trimmedLine.startsWith("|") && i + 1 < lines.length) {
      const nextTrimmed = lines[i + 1].trim();
      if (/^={2,}$/.test(nextTrimmed)) {
        content.push({
          type: "heading",
          props: { level: 1 },
          content: parseInlineMarkdown(trimmedLine)
        });
        i += 2;
        continue;
      }
      if (/^-{2,}$/.test(nextTrimmed)) {
        content.push({
          type: "heading",
          props: { level: 2 },
          content: parseInlineMarkdown(trimmedLine)
        });
        i += 2;
        continue;
      }
    }
    if (isThematicBreakLine(line)) {
      content.push({ type: "divider" });
      i++;
      continue;
    }
    const quote = parseQuoteBlock(lines, i);
    if (quote) {
      content.push(quote.block);
      i = quote.nextIndex;
      continue;
    }
    const tableResult = parseTableBlock(lines, i, parseInlineMarkdown);
    if (tableResult) {
      content.push(tableResult.block);
      i = tableResult.nextIndex;
      continue;
    }
    const parseFileBlockResult = parseFileBlock(lines, i);
    if (parseFileBlockResult) {
      content.push(parseFileBlockResult.block);
      i = parseFileBlockResult.nextIndex;
      continue;
    }
    const baseIndent = indentLevel(line);
    const stripped = line.slice(baseIndent);
    if (stripped.match(/^-\s+\[[ xX]\](?:\s+.*)?$/) || stripped.match(/^[-*+](?:\s+\S|\s*$)/) || stripped.match(/^\d+\.(?:\s+\S|\s*$)/)) {
      const { items, nextIndex } = parseNestedList(
        lines,
        i,
        baseIndent,
        parseInlineMarkdown,
        parseMarkdownBody
      );
      if (items.length) {
        content.push(...items);
        i = nextIndex;
        continue;
      }
    }
    const parseImageBlockResult = parseImageBlock(lines, i);
    if (parseImageBlockResult) {
      content.push(parseImageBlockResult.block);
      i = parseImageBlockResult.nextIndex;
      continue;
    }
    if (line.trim()) {
      const paragraphLines = [];
      while (i < lines.length) {
        const currentLine = lines[i];
        const trimmed = currentLine.trim();
        if (!trimmed) break;
        if (paragraphLines.length > 0) {
          if (isBlockChildrenMarker(currentLine) || currentLine.startsWith("#") || currentLine.startsWith(">") || /^ {0,3}(?:`{3,}|~{3,})/.test(currentLine) || currentLine.startsWith("$$") || currentLine.match(/^-\s+\[[ xX]\]/) || currentLine.match(/^[-*+]\s+/) || currentLine.match(/^\d+\.\s+/) || isThematicBreakLine(currentLine) || currentLine.match(/^\|/) || currentLine.match(/^\[📎/) || trimmed.match(/^<video\s+src=/) || /^<details(?:\s|>)/i.test(trimmed) || new RegExp(`^<!--\\s*${NOTE_MARK_PATTERN}:(?:columns|column)\\b`, "i").test(trimmed) || /^<table\s+data-(?:thinkly|goose)-table="v1"(?:\s|>)/i.test(trimmed) || /^<audio\s+src=/i.test(trimmed)) {
            break;
          }
          const nextTrimmed = lines[i + 1]?.trim() ?? "";
          if (/^={2,}$/.test(nextTrimmed) || /^-{2,}$/.test(nextTrimmed)) {
            break;
          }
        }
        paragraphLines.push(currentLine);
        i++;
      }
      if (paragraphLines.length > 0) {
        const combinedText = paragraphLines.join("\n");
        const inline = parseInlineMarkdown(combinedText);
        content.push(
          inline.length > 0 ? { type: "paragraph", content: inline } : { type: "paragraph" }
        );
        continue;
      }
    }
    i++;
  }
  return content;
}
var init_block = __esm({
  "src/lib/export/markdown/parse/block.ts"() {
    init_nestedList();
    init_htmlBlocks();
    init_table();
    init_codeBlocks();
    init_mediaBlocks();
    init_local_frontmatter();
    init_inline();
    init_blockHelpers();
    init_persistedNames();
    init_blockChildren();
    init_noteMeta();
    init_quoteBlock();
    init_spanRanges();
  }
});

// src/lib/note-metadata/reanchor.ts
function fingerprint(block) {
  return JSON.stringify([block.type, block.props ?? {}, block.content ?? null]);
}
function buckets(values) {
  const result = /* @__PURE__ */ new Map();
  values.forEach((value, index) => {
    const bucket = result.get(value) ?? [];
    bucket.push(index);
    result.set(value, bucket);
  });
  return result;
}
function context(values, at) {
  return JSON.stringify([values[at - 1] ?? null, values[at], values[at + 1] ?? null]);
}
function pathAt(parent, index) {
  return parent ? `${parent}.${index}` : String(index);
}
function isEmpty(block) {
  return block.type === "paragraph" && (!block.content || Array.isArray(block.content) && block.content.length === 0);
}
function mapLevel(previous, current, previousParent, currentParent, paths) {
  const oldKeys = previous.map(fingerprint);
  const newKeys = current.map(fingerprint);
  const oldBuckets = buckets(oldKeys);
  const newBuckets = buckets(newKeys);
  const oldContexts = buckets(oldKeys.map((_, at) => context(oldKeys, at)));
  const newContexts = buckets(newKeys.map((_, at) => context(newKeys, at)));
  previous.forEach((block, index) => {
    if (isEmpty(block)) return;
    const key = oldKeys[index];
    let candidates = newBuckets.get(key) ?? [];
    if (oldBuckets.get(key)?.length !== 1 || candidates.length !== 1) {
      const surrounding = context(oldKeys, index);
      candidates = oldContexts.get(surrounding)?.length === 1 ? newContexts.get(surrounding) ?? [] : [];
    }
    if (candidates.length !== 1) return;
    const target = candidates[0];
    const oldPath = pathAt(previousParent, index);
    const newPath = pathAt(currentParent, target);
    paths.set(oldPath, newPath);
    mapLevel(block.children ?? [], current[target].children ?? [], oldPath, newPath, paths);
  });
}
function relocateNest(nest, paths) {
  const parent = nest.path ? paths.get(nest.path) : "";
  if (parent === void 0) return null;
  const range = [];
  for (let offset = 0; offset <= nest.count; offset += 1) {
    const mapped = paths.get(pathAt(nest.path, nest.at + offset));
    if (mapped === void 0) return null;
    const separator = mapped.lastIndexOf(".");
    if (mapped.slice(0, separator < 0 ? 0 : separator) !== parent) return null;
    range.push(Number(mapped.slice(separator + 1)));
  }
  if (range.some((value, index) => value !== range[0] + index)) return null;
  return { path: parent, at: range[0], count: nest.count };
}
function reanchorNoteMeta(previousMarkdown, markdown, meta) {
  if (!meta) return null;
  if (previousMarkdown === markdown) return structuredClone(meta);
  try {
    const previous = markdownToJsonContent(splitGeneratedMarkdown(previousMarkdown).body);
    const current = markdownToJsonContent(splitGeneratedMarkdown(markdown).body);
    const paths = /* @__PURE__ */ new Map();
    mapLevel(previous, current, "", "", paths);
    const blocks = {};
    for (const [path2, patch] of Object.entries(meta.blocks ?? {})) {
      const mapped = paths.get(path2);
      if (mapped !== void 0) blocks[mapped] = structuredClone(patch);
    }
    const nests = (meta.nests ?? []).flatMap((nest) => {
      const mapped = relocateNest(nest, paths);
      return mapped ? [mapped] : [];
    });
    return Object.keys(blocks).length || nests.length ? { v: 1, ...Object.keys(blocks).length ? { blocks } : {}, ...nests.length ? { nests } : {} } : null;
  } catch {
    return null;
  }
}
var init_reanchor = __esm({
  "src/lib/note-metadata/reanchor.ts"() {
    init_block();
    init_noteMeta();
  }
});

// src/lib/note-metadata/restore.ts
var restore_exports = {};
__export(restore_exports, {
  hydrateNoteMetadata: () => hydrateNoteMetadata
});
async function hydrateNoteMetadata(fs2, root2, markdown, filePath, catalog) {
  const envelope = await findNoteMetadata(fs2, root2, markdown, filePath, catalog);
  if (!envelope) return { legacyMarkdown: markdown, revision: null, status: "legacy" };
  const noteId = envelope.noteId;
  if (envelope.legacyBaseline === markdown && envelope.current.markdown !== markdown) return { noteId, legacyMarkdown: markdown, revision: await metadataRevision(envelope), status: "ready" };
  const digest = await markdownDigest(markdown);
  let snapshot2 = [envelope.current, envelope.previous].find((value) => value?.digest === digest);
  if (!snapshot2) {
    const normalized = markdown.replace(/\r\n/g, "\n");
    snapshot2 = [envelope.current, envelope.previous].find((value) => value?.markdown.replace(/\r\n/g, "\n") === normalized);
  }
  if (!snapshot2) snapshot2 = { ...envelope.current, meta: reanchorNoteMeta(envelope.current.markdown, markdown, envelope.current.meta) };
  return {
    noteId,
    legacyMarkdown: inlineSnapshotMetadata(markdown, snapshot2.meta),
    settings: structuredClone(snapshot2.settings),
    revision: await metadataRevision(envelope),
    status: "ready"
  };
}
var init_restore = __esm({
  "src/lib/note-metadata/restore.ts"() {
    init_contract();
    init_codec();
    init_lookup();
    init_reanchor();
    init_storage();
  }
});

// ../../../../private/tmp/thinkly-metadata-eval.ts
init_codec();
init_storage();
import * as nodeFs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// src/lib/note-metadata/writeMarkdown.ts
init_contract();
async function replaceNoteMarkdown(fs2, filePath, markdown, expected) {
  if (markdown === expected && fs2.readFileAsync) {
    if (await fs2.readFileAsync(filePath) !== expected) throw new NoteMetadataError("conflict", "Markdown changed during saving");
    return true;
  }
  if (fs2.compareAndSwapFileAsync) {
    if (!await fs2.compareAndSwapFileAsync(filePath, expected, markdown)) {
      throw new NoteMetadataError("conflict", "Markdown changed during saving");
    }
    return true;
  }
  if (markdown === expected && fs2.readFileAsync) {
    if (await fs2.readFileAsync(filePath) !== expected) {
      throw new NoteMetadataError("conflict", "Markdown changed during saving");
    }
    return true;
  }
  if (!fs2.createFileAsync || !fs2.rename || !fs2.readFileAsync) {
    throw new NoteMetadataError("io-error", "Atomic Markdown API unavailable");
  }
  const temporary = `${filePath}.${crypto.randomUUID()}.tmp`;
  let committed = false;
  try {
    if (!await fs2.createFileAsync(temporary, markdown)) {
      throw new NoteMetadataError("io-error", "Cannot stage Markdown");
    }
    if (await fs2.readFileAsync(filePath) !== expected) {
      throw new NoteMetadataError("conflict", "Markdown changed during saving");
    }
    if (!await fs2.rename(temporary, filePath)) {
      throw new NoteMetadataError("io-error", "Cannot replace Markdown");
    }
    committed = true;
    return true;
  } finally {
    if (!committed) {
      try {
        await fs2.deleteFile?.(temporary);
      } catch {
      }
    }
  }
}

// ../../../../private/tmp/thinkly-metadata-eval.ts
Object.defineProperty(globalThis, "navigator", { value: { languages: ["en"], language: "en" }, configurable: true });
var { hydrateNoteMetadata: hydrateNoteMetadata2 } = await Promise.resolve().then(() => (init_restore(), restore_exports));
var root = await nodeFs.mkdtemp(join(tmpdir(), "thinkly-eval-"));
var fs = {
  readFileAsync: async (p) => nodeFs.readFile(p, "utf8"),
  readDirAsync: async (p) => (await nodeFs.readdir(p, { withFileTypes: true })).map((d) => ({ name: d.name, isFile: d.isFile(), isDirectory: d.isDirectory() })),
  existsAsync: async (p) => {
    try {
      await nodeFs.access(p);
      return true;
    } catch {
      return false;
    }
  },
  mkdir: async (p) => {
    await nodeFs.mkdir(p, { recursive: true });
    return true;
  },
  compareAndSwapFileAsync: async (p, expected, next) => {
    let current = null;
    try {
      current = await nodeFs.readFile(p, "utf8");
    } catch {
    }
    if (current !== expected) return false;
    await nodeFs.writeFile(p, next);
    return true;
  }
};
var settings = { fontFamily: "serif", pageLayout: "full", isLocked: false, isPinned: false, isFavorite: true };
try {
  const path2 = join(root, "note.md");
  const raw = '---\ntitle: "Original YAML"\n---\n\nAlpha paragraph.\n\nBeta paragraph.\n';
  await nodeFs.writeFile(path2, raw);
  const prepared = await prepareNoteMetadata(raw, "eval-id", settings);
  prepared.relativePath = "note.md";
  prepared.cleanMarkdown = raw;
  prepared.payload.markdown = raw;
  prepared.payload.digest = await (await Promise.resolve().then(() => (init_contract(), contract_exports))).markdownDigest(raw);
  const initial = await nodeFs.stat(path2);
  await stageMetadata(fs, root, raw, prepared, null);
  await replaceNoteMarkdown(fs, path2, raw, raw);
  const after = await nodeFs.stat(path2);
  const loaded = await hydrateNoteMetadata2(fs, root, raw, path2);
  await nodeFs.cp(root, root + "-copy", { recursive: true });
  const copied = await hydrateNoteMetadata2(fs, root + "-copy", raw, join(root + "-copy", "note.md"));
  await nodeFs.rename(path2, join(root, "renamed.md"));
  const renamed = await hydrateNoteMetadata2(fs, root, raw, join(root, "renamed.md"));
  const edited = raw.replace("Beta paragraph.", "Beta revised.");
  await nodeFs.writeFile(join(root, "renamed.md"), edited);
  const external = await hydrateNoteMetadata2(fs, root, edited, join(root, "renamed.md"));
  const legacy = "---\ngoose-id: old-id\ngoose-font: serif\ntitle: User\n---\n\nHello\n";
  const migration = await prepareNoteMetadata(legacy, "old-id", settings);
  migration.relativePath = "legacy.md";
  await nodeFs.writeFile(join(root, "legacy.md"), legacy);
  await stageMetadata(fs, root, legacy, migration, null);
  await replaceNoteMarkdown(fs, join(root, "legacy.md"), migration.cleanMarkdown, legacy);
  const migrated = await hydrateNoteMetadata2(fs, root, migration.cleanMarkdown, join(root, "legacy.md"));
  console.log(JSON.stringify({ settingsOnly: { bytesUnchanged: await nodeFs.readFile(join(root + "-copy", "note.md"), "utf8") === raw, mtimeUnchanged: initial.mtimeMs === after.mtimeMs }, restart: loaded.settings, copy: copied.noteId, externalRename: renamed.noteId, externalRenameEdit: external.noteId, legacy: { clean: migration.cleanMarkdown, recovered: migrated.noteId }, plainMD: (await hydrateNoteMetadata2(fs, root + "-absent", raw, join(root + "-absent", "note.md"))).status }));
} finally {
  await nodeFs.rm(root, { recursive: true, force: true });
  await nodeFs.rm(root + "-copy", { recursive: true, force: true });
}
