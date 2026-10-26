import type { Page } from "@/types";
import type { NoteMetadataFs } from "./contract";
import { metadataEnvelopeText, metadataPath, readMetadataEnvelope } from "./storage";

export async function retireNoteMetadata(fs: NoteMetadataFs, root: string, pages: Page[]): Promise<void> {
  if (!fs.compareAndSwapFileAsync) throw new Error("Atomic metadata deletion API unavailable");
  for (const page of pages) {
    if (!page.localMetadataId) continue;
    const envelope = await readMetadataEnvelope(fs, root, page.localMetadataId);
    if (!envelope) continue;
    const raw = JSON.stringify({ ...envelope, deleted: true, revision: crypto.randomUUID() });
    if (!await fs.compareAndSwapFileAsync(await metadataPath(root, envelope.noteId), metadataEnvelopeText(envelope), raw)) {
      throw new Error("Note metadata changed during deletion");
    }
  }
}
