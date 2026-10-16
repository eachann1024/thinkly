import type { HistoryIndex } from "@/lib/history/types";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";

export type HistoryIndexState =
  | { status: "idle" }
  | { status: "loading"; pageId: string; data: HistoryIndex | null }
  | { status: "ready"; pageId: string; data: HistoryIndex }
  | { status: "error"; pageId: string; error: string };
type IndexEvent =
  | { type: "reset" }
  | { type: "load"; pageId: string }
  | { type: "loaded"; data: HistoryIndex }
  | { type: "failed"; pageId: string; error: string }
  | { type: "milestone"; pageId: string; versionId: string; value: boolean };
export function historyIndexReducer(state: HistoryIndexState, event: IndexEvent): HistoryIndexState {
  if (event.type === "reset") return { status: "idle" };
  if (event.type === "load") return {
    status: "loading", pageId: event.pageId,
    data: state.status !== "idle" && state.pageId === event.pageId && "data" in state ? state.data : null,
  };
  if (state.status === "idle") return state;
  if (event.type === "loaded") return event.data.pageId === state.pageId
    ? { status: "ready", pageId: state.pageId, data: event.data } : state;
  if (event.pageId !== state.pageId) return state;
  if (event.type === "failed") return { status: "error", pageId: event.pageId, error: event.error };
  if (!("data" in state) || !state.data) return state;
  return { ...state, data: { ...state.data, versions: state.data.versions.map(entry =>
    entry.versionId === event.versionId ? { ...entry, isMilestone: event.value } : entry) } };
}

type Selection = { pageId: string; versionId: string };
export type HistorySelectionState =
  | { status: "idle" }
  | (Selection & { status: "loading" | "missing" | "error" })
  | (Selection & { status: "ready"; content: BlockNoteContent });
type SelectionEvent =
  | { type: "reset" }
  | (Selection & { type: "load" | "missing" | "failed" })
  | (Selection & { type: "loaded"; content: BlockNoteContent });
export function historySelectionReducer(state: HistorySelectionState, event: SelectionEvent): HistorySelectionState {
  if (event.type === "reset") return { status: "idle" };
  const { pageId, versionId } = event;
  if (event.type === "load") return { status: "loading", pageId, versionId };
  if (state.status !== "loading" || state.pageId !== pageId || state.versionId !== versionId) return state;
  if (event.type === "loaded") return { status: "ready", pageId, versionId, content: event.content };
  return { status: event.type === "failed" ? "error" : "missing", pageId, versionId };
}
