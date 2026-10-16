import type { BatchUndoResult } from "./types";
export type ReviewActionState =
  | { status: "idle" }
  | { status: "responding"; approved: boolean }
  | { status: "response-failed"; error: string }
  | { status: "undoing"; previousResult: BatchUndoResult | null; responseError: string | null }
  | { status: "undo-finished"; result: BatchUndoResult; responseError: string | null };
type Event =
  | { type: "respond"; approved: boolean }
  | { type: "responded" }
  | { type: "response-failed"; error: string }
  | { type: "undo" }
  | { type: "undo-finished"; result: BatchUndoResult };
export function reviewActionReducer(state: ReviewActionState, event: Event): ReviewActionState {
  switch (event.type) {
    case "respond": return state.status === "responding" || state.status === "undoing" ? state : { status: "responding", approved: event.approved };
    case "responded": return state.status === "responding" ? { status: "idle" } : state;
    case "response-failed": return state.status === "responding" ? { status: "response-failed", error: event.error } : state;
    case "undo": return state.status === "responding" || state.status === "undoing" ? state : {
      status: "undoing", previousResult: state.status === "undo-finished" ? state.result : null,
      responseError: state.status === "response-failed" ? state.error : state.status === "undo-finished" ? state.responseError : null,
    };
    case "undo-finished": return state.status === "undoing" ? { status: "undo-finished", result: event.result, responseError: state.responseError } : state;
  }
}
