/** Index is depth-first, zero-based, including headings and empty blocks. */
export interface NoteBlockLocation {
  blockId?: string;
  blockIndex: number;
  paragraph: number;
  heading?: string;
  /** Guards index fallback against deleted/reordered blocks. Never written to the note. */
  text: string;
}

/** Shared by renderer and Electron IPC; keep this module free of renderer imports. */
export function readNoteLocation(value: unknown): NoteBlockLocation | undefined {
  if (!value || typeof value !== "object") return;
  const v = value as Record<string, unknown>;
  if (!Number.isSafeInteger(v.blockIndex) || (v.blockIndex as number) < 0 ||
      !Number.isSafeInteger(v.paragraph) || (v.paragraph as number) < 1 || typeof v.text !== "string") return;
  return {
    blockIndex: v.blockIndex as number, paragraph: v.paragraph as number, text: v.text.slice(0, 160),
    ...(typeof v.blockId === "string" && v.blockId ? { blockId: v.blockId.slice(0, 4096) } : {}),
    ...(typeof v.heading === "string" && v.heading ? { heading: v.heading.slice(0, 200) } : {}),
  };
}
