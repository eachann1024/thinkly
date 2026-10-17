import type { GitSyncState } from "@/lib/git-sync-contract";
export type GitSyncLoadState =
  | { status: "unavailable" }
  | { status: "loading"; snapshot: GitSyncState | null }
  | { status: "ready"; snapshot: GitSyncState }
  | { status: "error"; snapshot: GitSyncState | null; error: string | null };
type Event = { type: "load" } | { type: "received"; snapshot: GitSyncState } | { type: "failed"; error: string | null };
export function gitSyncLoadReducer(state: GitSyncLoadState, event: Event): GitSyncLoadState {
  if (event.type === "received") return { status: "ready", snapshot: event.snapshot };
  const snapshot = state.status === "unavailable" ? null : state.snapshot;
  if (event.type === "load") return { status: "loading", snapshot };
  return { status: "error", snapshot, error: event.error };
}
