import {
  MAX_SIDECAR_CHARS, NoteMetadataError, markdownDigest,
  type NoteMetadataEnvelope, type NoteMetadataFs, type PreparedNoteMetadata,
} from "./contract";
import { readIdentity, validateNoteId } from "./identity";
import { parseEnvelope, validateSnapshot } from "./validate";

const locks = new Map<string, Promise<unknown>>();
const rawEnvelopes = new WeakMap<NoteMetadataEnvelope, string>();
const missing = (error: unknown) => /\bENOENT\b/.test(error instanceof Error ? error.message : String(error));

export function metadataEnvelopeText(envelope: NoteMetadataEnvelope): string {
  const raw = rawEnvelopes.get(envelope);
  if (raw === undefined) throw new NoteMetadataError("corrupt", "Metadata read fingerprint is missing");
  return raw;
}

export async function metadataRevision(envelope: NoteMetadataEnvelope): Promise<string> {
  return `${envelope.revision}:${await markdownDigest(metadataEnvelopeText(envelope))}`;
}

export async function metadataPath(root: string, noteId: string): Promise<string> {
  validateNoteId(noteId);
  const base = root.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!base || base.split("/").some(segment => segment === "..") || /[\u0000-\u001f]/.test(base)) {
    throw new NoteMetadataError("unsafe-path", "Invalid notebook metadata root");
  }
  return `${base}/.goose/metadata/${await markdownDigest(noteId)}.json`;
}

async function assertMetadataBoundary(fs: NoteMetadataFs, root: string, file: string): Promise<void> {
  if (!fs.realpathAsync) return;
  const resolve = async (target: string) => {
    try { return await fs.realpathAsync!(target); }
    catch (error) { throw new NoteMetadataError("io-error", "Cannot resolve metadata boundary", error); }
  };
  const canonical = (value: string) => value.replace(/\\/g, "/").replace(/\/+$/, "");
  const logicalRoot = canonical(root);
  const resolvedRoot = canonical(await resolve(root) ?? root);
  for (const target of [file.slice(0, file.lastIndexOf("/metadata/")), file.slice(0, file.lastIndexOf("/")), file]) {
    const real = await resolve(target);
    const resolved = real === target && canonical(target).startsWith(`${logicalRoot}/`)
      ? `${resolvedRoot}${canonical(target).slice(logicalRoot.length)}` : real && canonical(real);
    if (resolved && !resolved.startsWith(`${resolvedRoot}/`)) {
      throw new NoteMetadataError("unsafe-path", "Metadata resolves outside the notebook");
    }
  }
}

export async function readMetadataEnvelope(fs: NoteMetadataFs, root: string, noteId: string): Promise<NoteMetadataEnvelope | null> {
  const file = await metadataPath(root, noteId);
  await assertMetadataBoundary(fs, root, file);
  let raw: string | null;
  try {
    if (fs.readFileStatAsync) {
      const result = await fs.readFileStatAsync(file);
      if (!result.ok) {
        if (missing(result.error)) return null;
        throw new NoteMetadataError("io-error", result.error || "Cannot read note metadata");
      }
      raw = result.content ?? null;
    } else if (fs.readFileAsync) raw = await fs.readFileAsync(file);
    else throw new NoteMetadataError("io-error", "Metadata read API unavailable");
  } catch (error) {
    if (missing(error)) return null;
    if (error instanceof NoteMetadataError) throw error;
    throw new NoteMetadataError("io-error", "Cannot read note metadata", error);
  }
  if (raw === null) throw new NoteMetadataError("io-error", "Metadata read returned no content");
  const envelope = parseEnvelope(raw, noteId);
  rawEnvelopes.set(envelope, raw);
  for (const snapshot of [envelope.current, envelope.previous, envelope.recovery]) {
    if (snapshot && await markdownDigest(snapshot.markdown) !== snapshot.digest) {
      throw new NoteMetadataError("corrupt", "Metadata baseline checksum differs");
    }
  }
  return envelope;
}

export async function stageMetadata(
  fs: NoteMetadataFs, root: string, currentDiskMarkdown: string | null,
  next: PreparedNoteMetadata, expectedRevision?: string | null,
): Promise<{ revision: string; path: string }> {
  const file = await metadataPath(root, next.noteId);
  const previousTask = locks.get(file) ?? Promise.resolve();
  const task = previousTask.catch(() => undefined).then(async () => {
    validateSnapshot(next.payload, next.noteId);
    if (next.cleanMarkdown !== next.payload.markdown || await markdownDigest(next.cleanMarkdown) !== next.payload.digest) {
      throw new NoteMetadataError("corrupt", "Prepared metadata does not match Markdown");
    }
    const existing = await readMetadataEnvelope(fs, root, next.noteId);
    const existingRevision = existing ? await metadataRevision(existing) : null;
    if (expectedRevision !== undefined && existingRevision !== expectedRevision) {
      throw new NoteMetadataError("conflict", "Note metadata changed before saving");
    }
    let previous: NoteMetadataEnvelope["previous"];
    let legacyBaseline: string | undefined;
    if (existing && currentDiskMarkdown !== null) {
      const digest = await markdownDigest(currentDiskMarkdown);
      previous = [existing.current, existing.previous].find(snapshot => snapshot?.digest === digest);
      if (!previous) {
        const normalized = currentDiskMarkdown.replace(/\r\n/g, "\n");
        const compatible = [existing.current, existing.previous].find(snapshot => snapshot?.markdown.replace(/\r\n/g, "\n") === normalized);
        if (compatible) previous = { ...compatible, markdown: currentDiskMarkdown, digest };
      }
      if (!previous && existing.legacyBaseline === currentDiskMarkdown) legacyBaseline = currentDiskMarkdown;
      if (!previous && legacyBaseline === undefined) legacyBaseline = currentDiskMarkdown;
    } else if (!existing && currentDiskMarkdown !== null && readIdentity(currentDiskMarkdown) && readIdentity(currentDiskMarkdown) !== next.noteId) {
      throw new NoteMetadataError("identity", "Legacy note identity differs");
    } else if (!existing && currentDiskMarkdown !== null) legacyBaseline = currentDiskMarkdown;
    else if (existing && currentDiskMarkdown === null && expectedRevision !== existingRevision) {
      throw new NoteMetadataError("conflict", "Existing metadata cannot be adopted by a new note");
    }
    const samePayload = existing && existing.current.digest === next.payload.digest &&
      JSON.stringify(existing.current.meta) === JSON.stringify(next.payload.meta) &&
      JSON.stringify(existing.current.settings) === JSON.stringify(next.payload.settings);
    if (samePayload && !existing.deleted && existing.relativePath === next.relativePath) {
      const raw = metadataEnvelopeText(existing);
      const unchanged = fs.compareAndSwapFileAsync
        ? await fs.compareAndSwapFileAsync(file, raw, raw)
        : await readMetadataEnvelope(fs, root, next.noteId).then(current =>
          current !== null && metadataEnvelopeText(current) === raw);
      if (!unchanged) throw new NoteMetadataError("conflict", "Note metadata changed during saving");
      return { revision: existingRevision!, path: file };
    }
    const revision = crypto.randomUUID();
    const envelope: NoteMetadataEnvelope = {
      version: 1, noteId: next.noteId, revision, current: next.payload,
      ...(next.relativePath ? { relativePath: next.relativePath } : {}),
      ...(existing?.relativePath && existing.relativePath !== next.relativePath ? { previousRelativePath: existing.relativePath } : existing?.previousRelativePath ? { previousRelativePath: existing.previousRelativePath } : {}),
      ...(existing && (existing.recovery || (!previous && legacyBaseline !== undefined)) ? { recovery: existing.recovery ?? existing.current } : {}),
      ...(previous && previous.digest !== next.payload.digest ? { previous } : {}),
      ...(legacyBaseline !== undefined ? { legacyBaseline } : {}),
    };
    const raw = JSON.stringify(envelope);
    rawEnvelopes.set(envelope, raw);
    if (raw.length > MAX_SIDECAR_CHARS) throw new NoteMetadataError("too-large", "Metadata is too large");
    if (!fs.mkdir || !fs.compareAndSwapFileAsync && (!fs.createFileAsync || !fs.rename)) throw new NoteMetadataError("io-error", "Atomic metadata API unavailable");
    const dir = file.slice(0, file.lastIndexOf("/"));
    if (!await fs.mkdir(dir)) throw new NoteMetadataError("io-error", "Cannot create metadata directory");
    await assertMetadataBoundary(fs, root, file);
    if (fs.compareAndSwapFileAsync) {
      if (!await fs.compareAndSwapFileAsync(file, existing ? rawEnvelopes.get(existing)! : null, raw)) {
        throw new NoteMetadataError("conflict", "Note metadata changed during saving");
      }
      return { revision: await metadataRevision(envelope), path: file };
    }
    const temporary = `${file}.${revision}.tmp`;
    let committed = false;
    try {
      if (!await fs.createFileAsync!(temporary, raw)) throw new NoteMetadataError("io-error", "Cannot stage note metadata");
      const beforeCommit = await readMetadataEnvelope(fs, root, next.noteId);
      if ((beforeCommit ? rawEnvelopes.get(beforeCommit) : null) !== (existing ? rawEnvelopes.get(existing) : null)) {
        throw new NoteMetadataError("conflict", "Note metadata changed during saving");
      }
      if (!await fs.rename!(temporary, file)) throw new NoteMetadataError("io-error", "Cannot commit note metadata");
      committed = true;
    } finally {
      if (!committed) { try { await fs.deleteFile?.(temporary); } catch {} }
    }
    return { revision: await metadataRevision(envelope), path: file };
  });
  locks.set(file, task);
  try { return await task; }
  catch (error) {
    if (error instanceof NoteMetadataError) throw error;
    throw new NoteMetadataError("io-error", "Cannot save note metadata", error);
  }
  finally { if (locks.get(file) === task) locks.delete(file); }
}
