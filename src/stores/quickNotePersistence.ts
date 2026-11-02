import { createJSONStorage, type PersistStorage, type StateStorage } from "zustand/middleware";
import { budgetQuickNoteHistory } from "@/lib/quicknote/undoHistory";
import type { QuickNoteState } from "./quicknote/types";

export type PersistedQuickNote = Partial<Pick<QuickNoteState,
  "activeSlot" | "drafts" | "slotNames" | "undoStacks" | "redoStacks" | "pinned" |
  "editorZoom" | "windowWidth" | "windowHeight" | "windowX" | "windowY"
>>;

export function createQuickNotePartialize() {
  let undo: QuickNoteState["undoStacks"] | undefined;
  let redo: QuickNoteState["redoStacks"] | undefined;
  let history: ReturnType<typeof budgetQuickNoteHistory>;
  return (state: QuickNoteState): PersistedQuickNote => {
    if (!history || undo !== state.undoStacks || redo !== state.redoStacks) {
      history = budgetQuickNoteHistory(state.undoStacks, state.redoStacks);
      undo = state.undoStacks;
      redo = state.redoStacks;
    }
    return {
      ...history,
      activeSlot: state.activeSlot,
      drafts: state.drafts,
      slotNames: state.slotNames,
      pinned: true,
      editorZoom: state.editorZoom,
      windowWidth: state.windowWidth,
      windowHeight: state.windowHeight,
      windowX: state.windowX,
      windowY: state.windowY,
    };
  };
}

/** Preserve the recovery journal's single-write acknowledgement and the legacy JSON format.
 * Geometry changes reuse encoded drafts/history without traversing their contents.
 */
export function createQuickNoteStorage(storage: StateStorage): PersistStorage<PersistedQuickNote> {
  const reader = createJSONStorage<PersistedQuickNote>(() => storage)!;
  const encoded = new WeakMap<object, string>();
  const stringify = (value: unknown): string | undefined => {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    const cached = encoded.get(value);
    if (cached !== undefined) return cached;
    const json = JSON.stringify(value);
    encoded.set(value, json);
    return json;
  };
  const slots = (value: object): string => {
    const cached = encoded.get(value);
    if (cached !== undefined) return cached;
    const fields = Object.entries(value).flatMap(([key, item]) => {
      const json = stringify(item);
      return json === undefined ? [] : [`${JSON.stringify(key)}:${json}`];
    });
    const json = `{${fields.join(",")}}`;
    encoded.set(value, json);
    return json;
  };
  return {
    getItem: reader.getItem,
    removeItem: reader.removeItem,
    setItem: (name, value) => {
      const fields = Object.entries(value.state).flatMap(([key, item]) => {
        const isSlots = key === "drafts" || key === "undoStacks" || key === "redoStacks";
        const json = isSlots && item !== null && typeof item === "object"
          ? slots(item) : stringify(item);
        return json === undefined ? [] : [`${JSON.stringify(key)}:${json}`];
      });
      const version = value.version === undefined ? "" : `,"version":${JSON.stringify(value.version)}`;
      return storage.setItem(name, `{"state":{${fields.join(",")}}${version}}`);
    },
  };
}
