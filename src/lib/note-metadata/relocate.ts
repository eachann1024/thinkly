import { markdownDigest, NoteMetadataError, type NoteMetadataEnvelope, type NoteMetadataFs } from "./contract";
import { readIdentity } from "./identity";
import { readMetadataEnvelope, metadataPath, stageMetadata, metadataRevision, metadataEnvelopeText } from "./storage";
import { hydrateNoteMetadata } from "./restore";

export type MetadataRelocation = {
  id: string; path: string; nextPath: string; before: string; after: string; revision?: string | null;
};

export async function prepareMetadataRelocation(
  fs: NoteMetadataFs, sourceRoot: string, targetRoot: string,
  entries: MetadataRelocation[], onRevision: (id: string, revision: string) => void,
): Promise<void> {
  const plans: { entry: MetadataRelocation; source: NoteMetadataEnvelope; sourceRevision: string; moved: boolean; changes: boolean; digest: string }[] = [];
  for (const entry of entries) {
    const identity = readIdentity(entry.before);
    if (!identity) continue;
    if (identity !== entry.id) throw new NoteMetadataError("identity", "Moved note identity differs");
    const source = await readMetadataEnvelope(fs, sourceRoot, identity);
    if (!source) throw new NoteMetadataError("missing", "Moved note metadata is missing");
    const sourceRevision = await metadataRevision(source);
    if (entry.revision !== undefined && entry.revision !== sourceRevision) throw new NoteMetadataError("conflict", "Moved note metadata changed");
    await hydrateNoteMetadata(fs, sourceRoot, entry.before);
    const matched = [source.current, source.previous].find(snapshot => snapshot?.markdown.replace(/\r\n/g, "\n") === entry.before.replace(/\r\n/g, "\n"))!;
    const digest = await markdownDigest(entry.after);
    const moved = sourceRoot !== targetRoot && entry.path !== entry.nextPath;
    const changes = source.current.digest !== digest || JSON.stringify(source.current.meta) !== JSON.stringify(matched.meta) ||
      JSON.stringify(source.current.settings) !== JSON.stringify(matched.settings);
    if (moved) {
      const target = await readMetadataEnvelope(fs, targetRoot, identity);
      if (target && (changes || await metadataRevision(target) !== sourceRevision)) {
        throw new NoteMetadataError("conflict", "Destination note metadata differs; the original note was preserved");
      }
    }
    plans.push({ entry, source, sourceRevision, moved, changes, digest });
  }
  if (!plans.length) return;
  const manifest = JSON.stringify({ version: 1, kind: "metadata-relocation", sourceRoot, targetRoot,
    notes: plans.map(({ entry, sourceRevision, digest }) => ({ id: entry.id, from: entry.path, to: entry.nextPath,
      before: sourceRevision, markdownBefore: entry.before, afterDigest: digest })) });
  const journalDir = `${sourceRoot}/.goose/transfers`;
  await assertJournalBoundary(fs, sourceRoot, journalDir);
  if (!fs.mkdir || !await fs.mkdir(journalDir)) throw new NoteMetadataError("io-error", "Cannot create move journal directory");
  await assertJournalBoundary(fs, sourceRoot, journalDir);
  await createOrVerify(fs, `${journalDir}/${await markdownDigest(manifest)}.json`, manifest);
  for (const { entry, source, sourceRevision, moved } of plans) {
    const matched = [source.current, source.previous].find(snapshot => snapshot?.markdown.replace(/\r\n/g, "\n") === entry.before.replace(/\r\n/g, "\n"))!;
    const next = { noteId: entry.id, cleanMarkdown: entry.after, payload: {
      ...matched, markdown: entry.after, digest: await markdownDigest(entry.after),
    } };
    const staged = await stageMetadata(fs, sourceRoot, entry.before, next, sourceRevision);
    onRevision(entry.id, staged.revision);
    if (moved) {
      const envelope = await readMetadataEnvelope(fs, sourceRoot, entry.id);
      if (!envelope || await metadataRevision(envelope) !== staged.revision) throw new NoteMetadataError("conflict", "Source metadata changed during moving");
      const file = await metadataPath(targetRoot, entry.id);
      if (!fs.mkdir || !await fs.mkdir(file.slice(0, file.lastIndexOf("/")))) throw new NoteMetadataError("io-error", "Cannot create destination metadata directory");
      const target = await readMetadataEnvelope(fs, targetRoot, entry.id);
      if (!target) await createOrVerify(fs, file, metadataEnvelopeText(envelope));
      const written = await readMetadataEnvelope(fs, targetRoot, entry.id);
      if (!written || await metadataRevision(written) !== staged.revision) {
        throw new NoteMetadataError("conflict", "Moved metadata failed verification");
      }
    }
  }
}

async function createOrVerify(fs: NoteMetadataFs, file: string, raw: string): Promise<void> {
  if (!fs.createFileAsync || !fs.readFileAsync) throw new NoteMetadataError("io-error", "Exclusive move write API unavailable");
  let created = false;
  try { created = await fs.createFileAsync(file, raw); } catch {}
  let current: string | null;
  try { current = await fs.readFileAsync(file); }
  catch (error) { throw new NoteMetadataError("io-error", "Cannot read move recovery data", error); }
  if (current !== raw) throw new NoteMetadataError(created ? "io-error" : "conflict", "Move recovery data differs; the original was preserved");
}

async function assertJournalBoundary(fs: NoteMetadataFs, root: string, dir: string): Promise<void> {
  if (!fs.realpathAsync) return;
  const base = (await fs.realpathAsync(root) ?? root).replace(/\\/g, "/").replace(/\/+$/, "");
  const actual = await fs.realpathAsync(dir);
  if (actual && actual !== dir && !actual.replace(/\\/g, "/").startsWith(`${base}/`)) {
    throw new NoteMetadataError("unsafe-path", "Move journal resolves outside the notebook");
  }
}
