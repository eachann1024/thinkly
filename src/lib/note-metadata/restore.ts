import { markdownDigest, NoteMetadataError, type HydratedNoteMetadata, type NoteMetadataFs } from "./contract";
import { inlineSnapshotMetadata } from "./codec";
import { readIdentity } from "./identity";
import { readMetadataEnvelope, metadataRevision } from "./storage";

export async function hydrateNoteMetadata(
  fs: NoteMetadataFs, root: string, markdown: string,
): Promise<HydratedNoteMetadata> {
  const noteId = readIdentity(markdown);
  if (!noteId) return { legacyMarkdown: markdown, revision: null, status: "legacy" };
  const envelope = await readMetadataEnvelope(fs, root, noteId);
  if (!envelope) throw new NoteMetadataError("missing", "Note metadata is missing; the original formatting has been protected");
  const digest = await markdownDigest(markdown);
  let snapshot = [envelope.current, envelope.previous].find(value => value?.digest === digest);
  if (!snapshot) {
    const normalized = markdown.replace(/\r\n/g, "\n");
    snapshot = [envelope.current, envelope.previous].find(value => value?.markdown.replace(/\r\n/g, "\n") === normalized);
  }
  if (!snapshot) throw new NoteMetadataError("mismatch", "Markdown was edited externally; the original formatting has been protected");
  return {
    noteId, legacyMarkdown: inlineSnapshotMetadata(markdown, snapshot.meta),
    settings: structuredClone(snapshot.settings), revision: await metadataRevision(envelope), status: "ready",
  };
}
