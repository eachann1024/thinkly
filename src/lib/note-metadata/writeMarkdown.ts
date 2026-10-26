import type { NoteMetadataFs } from "./contract";
import { NoteMetadataError } from "./contract";

export async function replaceNoteMarkdown(
  fs: NoteMetadataFs, filePath: string, markdown: string, expected: string,
): Promise<boolean> {
  if (markdown === expected && fs.readFileAsync) {
    if (await fs.readFileAsync(filePath) !== expected) throw new NoteMetadataError("conflict", "Markdown changed during saving");
    return true;
  }
  if (fs.compareAndSwapFileAsync) {
    if (!await fs.compareAndSwapFileAsync(filePath, expected, markdown)) {
      throw new NoteMetadataError("conflict", "Markdown changed during saving");
    }
    return true;
  }
  if (markdown === expected && fs.readFileAsync) {
    if (await fs.readFileAsync(filePath) !== expected) {
      throw new NoteMetadataError("conflict", "Markdown changed during saving");
    }
    return true;
  }
  if (!fs.createFileAsync || !fs.rename || !fs.readFileAsync) {
    throw new NoteMetadataError("io-error", "Atomic Markdown API unavailable");
  }
  const temporary = `${filePath}.${crypto.randomUUID()}.tmp`;
  let committed = false;
  try {
    if (!await fs.createFileAsync(temporary, markdown)) {
      throw new NoteMetadataError("io-error", "Cannot stage Markdown");
    }
    if (await fs.readFileAsync(filePath) !== expected) {
      throw new NoteMetadataError("conflict", "Markdown changed during saving");
    }
    if (!await fs.rename(temporary, filePath)) {
      throw new NoteMetadataError("io-error", "Cannot replace Markdown");
    }
    committed = true;
    return true;
  } finally {
    if (!committed) { try { await fs.deleteFile?.(temporary); } catch { } }
  }
}
