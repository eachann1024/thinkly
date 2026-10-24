import {
  type QuickNoteSlot,
  type QuickNoteSlotNames,
} from "@/stores/useQuickNote";

export interface QuickNoteSlotSwitcherProps {
  activeSlot: QuickNoteSlot;
  occupiedSlots: Record<QuickNoteSlot, boolean>;
  slotNames: QuickNoteSlotNames;
  onChange: (
    slot: QuickNoteSlot,
    source: "pointer" | "shortcut" | "switcher-keyboard",
  ) => void;
  onPreviewChange?: (slot: QuickNoteSlot | null) => void;
  onRenameRequest: (slot: QuickNoteSlot) => void;
}

export function isQuickNoteSlot(value: number): value is QuickNoteSlot {
  return (
    value === 1 || value === 2 || value === 3 || value === 4 || value === 5
  );
}
