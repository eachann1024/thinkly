import type { Page } from "@/types";
import type { NoteMetadataFs } from "./contract";
import { markdownDigest } from "./contract";
import { readMetadataEnvelope, metadataRevision } from "./storage";

const digests = new Map<string, Promise<string>>();
const digestOf = (identity: string) => {
  if (!digests.has(identity)) {
    if (digests.size >= 4096) digests.clear();
    digests.set(identity, markdownDigest(identity));
  }
  return digests.get(identity)!;
};

export function isNoteMetadataEvent(filename: unknown): filename is string {
  return typeof filename === "string" && /^\.goose\/metadata\/[a-f0-9]{64}\.json$/.test(filename.replace(/\\/g, "/"));
}

export async function metadataEventPages(filename: string, pages: Page[]): Promise<Page[]> {
  if (!isNoteMetadataEvent(filename)) return [];
  const hash = filename.replace(/\\/g, "/").split("/").pop()!.slice(0, -5);
  const matches = await Promise.all(pages.map(async page => !page.isFolder && page.localMetadataId &&
    await digestOf(page.localMetadataId) === hash ? page : null));
  return matches.filter((page): page is Page => page !== null);
}

export async function noteMetadataNeedsRefresh(fs: NoteMetadataFs, root: string, page: Page): Promise<boolean> {
  if (!page.localMetadataId) return false;
  try {
    const envelope = await readMetadataEnvelope(fs, root, page.localMetadataId);
    return !envelope || await metadataRevision(envelope) !== page.localMetadataRevision;
  } catch {
    return true;
  }
}
