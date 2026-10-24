import type { JSONContent } from "@/types";
import type { QuickNoteSlotStacks } from "@/lib/quicknote/undoHistory";

export type QuickNoteSlot = 1 | 2 | 3 | 4 | 5;

export const QUICKNOTE_SLOT_COUNT = 5;

export const QUICKNOTE_SLOTS: readonly QuickNoteSlot[] = [1, 2, 3, 4, 5];

export type QuickNoteDrafts = Record<QuickNoteSlot, JSONContent | null>;

export type QuickNoteSlotNames = Record<QuickNoteSlot, string>;

export interface QuickNoteState {
  activeSlot: QuickNoteSlot;
  drafts: QuickNoteDrafts;
  slotNames: QuickNoteSlotNames;
  undoStacks: QuickNoteSlotStacks;
  redoStacks: QuickNoteSlotStacks;
  pinned: boolean;
  windowWidth: number;
  windowHeight: number;
  windowX?: number;
  windowY?: number;
  editorZoom: number;
  setActiveSlot: (slot: QuickNoteSlot) => void;
  setSlotName: (slot: QuickNoteSlot, name: string) => void;
  setDraftContent: (
    content: JSONContent,
    slot?: QuickNoteSlot,
    options?: { recordHistory?: boolean },
  ) => void;
  undoDraft: () => { content: JSONContent | null; applied: boolean };
  redoDraft: () => { content: JSONContent | null; applied: boolean };
  saveDraftToNotebook: () => Promise<string | null>;
  clearDraft: () => void;
  setWindowWidth: (width: number) => void;
  setWindowHeight: (height: number) => void;
  setWindowSize: (width: number, height: number) => void;
  setEditorZoom: (zoom: number) => void;
  setWindowPosition: (x: number, y: number) => void;
}

export const QUICKNOTE_DEFAULT_WIDTH = 480;

export const QUICKNOTE_MIN_WIDTH = 320;

export const QUICKNOTE_DEFAULT_HEIGHT = 350;

export const QUICKNOTE_MIN_HEIGHT = 300;

export const QUICKNOTE_ZOOM_MIN = 0.7;

export const QUICKNOTE_ZOOM_MAX = 1.8;

export const QUICKNOTE_ZOOM_STEP = 0.1;

export const QUICKNOTE_ZOOM_DEFAULT = 1;

export function clampQuickNoteZoom(zoom: unknown): number {
  const n = typeof zoom === "number" ? zoom : Number(zoom);
  if (!Number.isFinite(n)) return QUICKNOTE_ZOOM_DEFAULT;
  const clamped = Math.min(QUICKNOTE_ZOOM_MAX, Math.max(QUICKNOTE_ZOOM_MIN, n));
  return Math.round(clamped * 100) / 100;
}
