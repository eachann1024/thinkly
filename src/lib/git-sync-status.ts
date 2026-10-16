import type { GitSyncConflict, GitSyncStatus } from "./git-sync-contract";
export type GitSyncStatusEvent =
  | { type: "sync.started" }
  | { type: "sync.succeeded"; at: string }
  | { type: "sync.failed"; message: string; conflicts?: GitSyncConflict[] };
export const idleGitSyncStatus = (
  repositoryId: string,
  lastSyncedAt: string | null = null,
): GitSyncStatus => ({
  repositoryId,
  phase: "idle",
  lastSyncedAt,
  error: null,
});
export function gitSyncStatusTransition(
  state: GitSyncStatus,
  event: GitSyncStatusEvent,
): GitSyncStatus {
  const identity = {
    repositoryId: state.repositoryId,
    lastSyncedAt: state.lastSyncedAt,
  };
  switch (event.type) {
    case "sync.started":
      return {
        ...identity,
        phase: "syncing",
        error: null,
        conflicts: state.conflicts,
      };
    case "sync.succeeded":
      return idleGitSyncStatus(state.repositoryId, event.at);
    case "sync.failed":
      return {
        ...identity,
        phase: "error",
        error: event.message,
        conflicts: event.conflicts,
      };
  }
}
