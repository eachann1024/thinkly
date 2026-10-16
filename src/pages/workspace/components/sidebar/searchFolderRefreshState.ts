export type FolderRefreshState =
  | { status: "idle" }
  | { status: "refreshing"; blocking: boolean; failedIds: string[] }
  | { status: "complete"; failedIds: string[] };
type Event = { type: "start"; blocking: boolean } | { type: "failed"; notebookId: string } | { type: "complete" } | { type: "reset" };
export function folderRefreshReducer(state: FolderRefreshState, event: Event): FolderRefreshState {
  if (event.type === "reset") return { status: "idle" };
  if (event.type === "start") return { status: "refreshing", blocking: event.blocking, failedIds: [] };
  if (state.status !== "refreshing") return state;
  if (event.type === "complete") return { status: "complete", failedIds: state.failedIds };
  return { ...state, failedIds: state.failedIds.includes(event.notebookId) ? state.failedIds : [...state.failedIds, event.notebookId] };
}
