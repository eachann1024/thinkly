import type { QuickNoteSlot } from "@/stores/useQuickNote";
type Press = { id: number; startSlot: QuickNoteSlot; previewSlot: QuickNoteSlot; route: "same-slot" | "crossed" };
export type QuickNoteSlotState =
  | { phase: "idle" }
  | ({ phase: "pressing" } & Press)
  | ({ phase: "held" } & Press);
export type QuickNoteSlotEvent =
  | { type: "pressed"; id: number; slot: QuickNoteSlot }
  | { type: "moved"; id: number; slot: QuickNoteSlot }
  | { type: "hold-elapsed"; id: number }
  | { type: "released"; id: number; slot: QuickNoteSlot; activeSlot: QuickNoteSlot }
  | { type: "left"; id: number }
  | { type: "cancelled"; id: number };
type Command =
  | { type: "preview"; slot: QuickNoteSlot | null }
  | { type: "commit"; slot: QuickNoteSlot }
  | { type: "rename"; slot: QuickNoteSlot };
export function transitionQuickNoteSlot(state: QuickNoteSlotState, event: QuickNoteSlotEvent): {
  state: QuickNoteSlotState; commands: Command[];
} {
  if (event.type === "pressed") return {
    state: { phase: "pressing", id: event.id, startSlot: event.slot, previewSlot: event.slot, route: "same-slot" },
    commands: state.phase !== "idle" && state.previewSlot === event.slot ? [] : [{ type: "preview", slot: event.slot }],
  };
  if (state.phase === "idle" || state.id !== event.id) return { state, commands: [] };
  switch (event.type) {
    case "moved":
      return state.previewSlot === event.slot ? { state, commands: [] } : {
        state: { ...state, previewSlot: event.slot, route: event.slot !== state.startSlot ? "crossed" : state.route },
        commands: [{ type: "preview", slot: event.slot }],
      };
    case "hold-elapsed":
      return { state: { ...state, phase: "held" }, commands: [] };
    case "released": {
      const rename = state.startSlot === event.activeSlot && event.slot === event.activeSlot && state.route === "same-slot";
      return { state: { phase: "idle" }, commands: [{ type: "preview", slot: null },
        { type: rename ? "rename" : "commit", slot: event.slot }] };
    }
    case "left":
      return { state: { phase: "idle" }, commands: [{ type: "preview", slot: null }, { type: "commit", slot: state.previewSlot }] };
    case "cancelled":
      return { state: { phase: "idle" }, commands: [{ type: "preview", slot: null }] };
  }
}
export const reduceQuickNoteSlot = (state: QuickNoteSlotState, event: QuickNoteSlotEvent) => transitionQuickNoteSlot(state, event).state;
