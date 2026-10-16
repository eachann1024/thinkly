type LoadRequest = { requestId: number; fingerprint: string; startedAt: number };
export type LocalFolderLoadState =
  | { status: "idle" }
  | ({ status: "loading" } & LoadRequest)
  | ({ status: "ready"; finishedAt: number } & LoadRequest)
  | ({ status: "error"; finishedAt: number; error: string } & LoadRequest);
export type LocalFolderLoadStatus = LocalFolderLoadState["status"];
export type LocalFolderLoadEvent =
  | ({ type: "started" } & LoadRequest)
  | { type: "succeeded"; requestId: number; fingerprint: string; finishedAt: number }
  | { type: "failed"; requestId: number; fingerprint: string; finishedAt: number; error: string };
export const IDLE_LOCAL_FOLDER_LOAD_STATE: LocalFolderLoadState = { status: "idle" };

export function transitionLocalFolderLoad(
  state: LocalFolderLoadState,
  event: LocalFolderLoadEvent,
): LocalFolderLoadState {
  if (event.type === "started") {
    if (state.status !== "idle" && state.requestId >= event.requestId) return state;
    return { status: "loading", requestId: event.requestId,
      fingerprint: event.fingerprint, startedAt: event.startedAt };
  }
  if (state.status !== "loading" || state.requestId !== event.requestId ||
      state.fingerprint !== event.fingerprint) return state;
  const request = { requestId: state.requestId, fingerprint: state.fingerprint,
    startedAt: state.startedAt, finishedAt: event.finishedAt };
  return event.type === "succeeded"
    ? { status: "ready", ...request }
    : { status: "error", ...request, error: event.error };
}
