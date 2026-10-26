import { markdownDigest, type HydratedNoteMetadata, type NoteMetadataEnvelope, type NoteMetadataFs } from "./contract";
import { inlineSnapshotMetadata } from "./codec";
import { findNoteMetadata } from "./lookup";
import { reanchorNoteMeta } from "./reanchor";
import { metadataRevision } from "./storage";

export async function hydrateNoteMetadata(
  fs: NoteMetadataFs, root: string, markdown: string, filePath?: string, catalog?: Promise<NoteMetadataEnvelope[]>,
): Promise<HydratedNoteMetadata> {
  const envelope = await findNoteMetadata(fs, root, markdown, filePath, catalog);
  if (!envelope) return { legacyMarkdown: markdown, revision: null, status: "legacy" };
  const noteId = envelope.noteId;
  if (envelope.legacyBaseline === markdown && envelope.current.markdown !== markdown) return { noteId, legacyMarkdown: markdown, revision: await metadataRevision(envelope), status: "ready" };
  const digest = await markdownDigest(markdown);
  let snapshot = [envelope.current, envelope.previous].find(value => value?.digest === digest);
  if (!snapshot) {
    const normalized = markdown.replace(/\r\n/g, "\n");
    snapshot = [envelope.current, envelope.previous].find(value => value?.markdown.replace(/\r\n/g, "\n") === normalized);
  }
  if (!snapshot) snapshot = { ...envelope.current, meta: reanchorNoteMeta(envelope.current.markdown, markdown, envelope.current.meta) };
  return {
    noteId, legacyMarkdown: inlineSnapshotMetadata(markdown, snapshot.meta),
    settings: structuredClone(snapshot.settings), revision: await metadataRevision(envelope), status: "ready",
  };
}
