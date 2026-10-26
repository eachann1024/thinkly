import { canonicalRelativePath } from "../canonicalLocalPath";
import { markdownDigest, type NoteMetadataEnvelope, type NoteMetadataFs } from "./contract";
import { readIdentity } from "./identity";
import { readMetadataEnvelope } from "./storage";

export async function notebookMetadata(fs: NoteMetadataFs, root: string): Promise<NoteMetadataEnvelope[]> {
  const dir = `${root}/.goose/metadata`;
  let entries: { name: string }[];
  try { entries = fs.readDirAsync ? await fs.readDirAsync(dir) : fs.readDir?.(dir) ?? []; }
  catch (error) { if (/ENOENT/.test(String(error))) return []; throw error; }
  const result: NoteMetadataEnvelope[] = [];
  for (const entry of entries) {
    if (!/^[a-f0-9]{64}\.json$/.test(entry.name)) continue;
    try {
      const raw = await fs.readFileAsync?.(`${dir}/${entry.name}`);
      if (!raw) continue;
      const id = JSON.parse(raw).noteId;
      if (typeof id !== "string" || `${await markdownDigest(id)}.json` !== entry.name) continue;
      const envelope = await readMetadataEnvelope(fs, root, id);
      if (envelope) result.push(envelope);
    } catch {}
  }
  return result;
}

export function contentAffinity(before: string, after: string): number {
  const tokens = (value: string) => {
    const body = value.replace(/^(?:\uFEFF)?---[^\S\r\n]*\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "").trim().toLowerCase();
    const words = body.match(/[\p{L}\p{N}]+/gu) ?? [];
    const grams = Array.from(body).flatMap((_, at, chars) => at + 3 <= chars.length ? [chars.slice(at, at + 3).join("")] : []);
    return new Set([...words, ...grams]);
  };
  const a = tokens(before), b = tokens(after);
  if (!a.size || !b.size) return before === after ? 1 : 0;
  return [...a].filter(token => b.has(token)).length / Math.max(a.size, b.size);
}

export async function findNoteMetadata(
  fs: NoteMetadataFs, root: string, markdown: string, filePath?: string, catalog?: Promise<NoteMetadataEnvelope[]>,
): Promise<NoteMetadataEnvelope | null> {
  const embedded = readIdentity(markdown);
  if (embedded) return readMetadataEnvelope(fs, root, embedded);
  if (!filePath) return null;
  const relative = canonicalRelativePath(root, filePath);
  if (!relative) return null;
  const envelopes = await (catalog ?? notebookMetadata(fs, root));
  const exact = envelopes.filter(value => value.relativePath === relative);
  if (!exact.length) {
    for (const envelope of envelopes) {
      if (envelope.previousRelativePath !== relative || !envelope.relativePath || !fs.existsAsync) continue;
      if (!await fs.existsAsync(`${root}/${envelope.relativePath}`)) exact.push(envelope);
    }
  }
  if (exact.length === 1 && [exact[0].current, exact[0].previous].some(snapshot => snapshot &&
    (snapshot.markdown === markdown || !exact[0].deleted))) return exact[0];
  if (exact.length > 1) return null;
  const digest = await markdownDigest(markdown);
  const candidates: NoteMetadataEnvelope[] = [];
  const contextual: NoteMetadataEnvelope[] = [];
  for (const envelope of envelopes) {
    if (!envelope.relativePath || envelope.relativePath === relative || envelope.deleted) continue;
    const oldPath = `${root}/${envelope.relativePath}`;
    const exists = fs.existsAsync ? await fs.existsAsync(oldPath) : true;
    if (exists) continue;
    if ([envelope.current, envelope.previous].some(snapshot => snapshot && snapshot.digest === digest)) candidates.push(envelope);
    else if (contentAffinity(envelope.current.markdown, markdown) >= 0.5) contextual.push(envelope);
  }
  return candidates.length === 1 ? candidates[0] : candidates.length === 0 && contextual.length === 1 ? contextual[0] : null;
}
