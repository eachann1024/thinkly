import type { JSONContent } from "@/types";

export type LocalSavePending =
  | { status: "empty" }
  | { status: "queued"; content: JSONContent };
export type LocalSavePermission = { status: "automatic" } | { status: "confirmation-required" };
export type LocalSaveRecovery = { status: "none" } | { status: "awaiting-ack"; revision: number };
type WriteAttempt = { id: number; content: JSONContent; revision: number | null };
export type LocalSaveWrite =
  | { status: "idle" }
  | { status: "writing"; attempt: WriteAttempt }
  | { status: "discarded"; attempt: WriteAttempt };
export type LocalSavePageState = {
  pending: LocalSavePending; permission: LocalSavePermission; recovery: LocalSaveRecovery; write: LocalSaveWrite;
};
export const EMPTY_LOCAL_SAVE_STATE: LocalSavePageState = {
  pending: { status: "empty" }, permission: { status: "automatic" }, recovery: { status: "none" }, write: { status: "idle" },
};
export type LocalSaveEvent =
  | { type: "queue"; content: JSONContent; revision?: number }
  | { type: "restore"; content: JSONContent; revision: number }
  | { type: "discard" }
  | { type: "clear-pending"; expected?: JSONContent }
  | { type: "confirm" }
  | { type: "write-started"; attemptId: number }
  | { type: "write-succeeded"; attemptId: number; acknowledgedRevision: number | null }
  | { type: "write-failed"; attemptId: number }
  | { type: "acknowledged"; revision: number }
  | { type: "migrate-out" }
  | { type: "migrate-in"; pending: LocalSavePending; permission: LocalSavePermission; revision: number | null };
function acknowledge(recovery: LocalSaveRecovery, revision: number | null): LocalSaveRecovery {
  return recovery.status === "awaiting-ack" && recovery.revision === revision ? { status: "none" } : recovery;
}
export function localSavePageTransition(state: LocalSavePageState, event: LocalSaveEvent): LocalSavePageState {
  switch (event.type) {
    case "queue": return {
      ...state, pending: { status: "queued", content: event.content }, permission: { status: "automatic" },
      recovery: typeof event.revision === "number" ? { status: "awaiting-ack", revision: event.revision } : state.recovery,
    };
    case "restore": return { ...state, pending: { status: "queued", content: event.content }, permission: { status: "confirmation-required" }, recovery: { status: "awaiting-ack", revision: event.revision } };
    case "discard": return { ...state, pending: { status: "empty" }, permission: { status: "automatic" }, write: state.write.status === "writing" ? { status: "discarded", attempt: state.write.attempt } : state.write };
    // Clearing an AI rollback snapshot must not confirm a recovered draft.
    case "clear-pending": return state.pending.status === "empty" || (event.expected && state.pending.content !== event.expected) ? state : { ...state, pending: { status: "empty" } };
    case "confirm": return state.permission.status === "confirmation-required" ? { ...state, pending: { status: "empty" }, permission: { status: "automatic" } } : state;
    case "write-started": {
      if (state.permission.status !== "automatic" || state.pending.status !== "queued" || state.write.status !== "idle") return state;
      return { ...state, pending: { status: "empty" }, write: { status: "writing", attempt: {
        id: event.attemptId, content: state.pending.content,
        revision: state.recovery.status === "awaiting-ack" ? state.recovery.revision : null,
      } } };
    }
    case "write-succeeded": return state.write.status === "idle" || state.write.attempt.id !== event.attemptId ? state : {
      ...state, write: { status: "idle" }, recovery: acknowledge(state.recovery, event.acknowledgedRevision),
    };
    case "write-failed": return state.write.status === "idle" || state.write.attempt.id !== event.attemptId ? state : {
      ...state, write: { status: "idle" },
      pending: state.write.status === "writing" && state.pending.status === "empty"
        ? { status: "queued", content: state.write.attempt.content } : state.pending,
    };
    case "acknowledged": return { ...state, recovery: acknowledge(state.recovery, event.revision) };
    case "migrate-out": return EMPTY_LOCAL_SAVE_STATE;
    case "migrate-in": return { ...state, pending: event.pending, permission: event.permission,
      recovery: event.revision === null ? { status: "none" } : { status: "awaiting-ack", revision: event.revision } };
  }
}
