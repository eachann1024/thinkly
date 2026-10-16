import type { QuickNoteSlot } from "@/stores/useQuickNote";
export type QuickNoteRenameState =
  | { phase: "idle" }
  | { phase: "editing"; id: number; slot: QuickNoteSlot; value: string }
  | { phase: "finishing"; id: number };
export type QuickNoteRenameEvent =
  | { type: "started"; id: number; slot: QuickNoteSlot; value: string }
  | { type: "edited"; id: number; value: string }
  | { type: "finish-requested"; id: number }
  | { type: "focus-returned"; id: number };
export function transitionQuickNoteRename(state: QuickNoteRenameState, event: QuickNoteRenameEvent): QuickNoteRenameState {
  switch (event.type) {
    case "started": return { phase: "editing", id: event.id, slot: event.slot, value: event.value };
    case "edited": return state.phase === "editing" && state.id === event.id ? { ...state, value: event.value } : state;
    case "finish-requested": return state.phase === "editing" && state.id === event.id
      ? { phase: "finishing", id: state.id } : state;
    case "focus-returned": return state.phase === "finishing" && state.id === event.id ? { phase: "idle" } : state;
  }
}
