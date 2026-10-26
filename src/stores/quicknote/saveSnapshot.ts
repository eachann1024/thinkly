import type { JSONContent } from "@/types";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";
import type { QuickNoteSlot } from "./types";

export type QuickNoteSaveSnapshot = {
  slot: QuickNoteSlot;
  content: JSONContent | null;
  revision: number;
};

export function quickNoteSaveSnapshotMatches(
  snapshot: QuickNoteSaveSnapshot,
  slot: QuickNoteSlot,
  content: JSONContent | null,
  revision: number,
): boolean {
  return snapshot.slot === slot && snapshot.revision === revision &&
    getContentSignature(snapshot.content) === getContentSignature(content);
}
