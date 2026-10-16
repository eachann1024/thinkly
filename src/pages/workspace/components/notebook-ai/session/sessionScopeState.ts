import type { NotebookAiSessionScope } from "./types";
export type SessionScopeState =
  | { status: "idle"; scope: NotebookAiSessionScope }
  | { status: "compacting"; scope: NotebookAiSessionScope; requestId: number };
type Event =
  | { type: "notebook-changed"; notebookId: string; conversationId: string }
  | { type: "conversation-changed"; conversationId: string }
  | { type: "compact"; scope: NotebookAiSessionScope; requestId: number }
  | { type: "compaction-finished"; scope: NotebookAiSessionScope; requestId: number };
export const sameSessionScope = (left: NotebookAiSessionScope, right: NotebookAiSessionScope) =>
  left.notebookId === right.notebookId && left.conversationId === right.conversationId && left.generation === right.generation;
export function sessionScopeReducer(state: SessionScopeState, event: Event): SessionScopeState {
  if (event.type === "notebook-changed") return {
    status: "idle", scope: { notebookId: event.notebookId, conversationId: event.conversationId, generation: state.scope.generation + 1 },
  };
  if (event.type === "conversation-changed") return event.conversationId === state.scope.conversationId ? state : {
    status: "idle", scope: { ...state.scope, conversationId: event.conversationId, generation: state.scope.generation + 1 },
  };
  if (!sameSessionScope(state.scope, event.scope)) return state;
  if (event.type === "compact") return state.status === "idle" ? { status: "compacting", scope: state.scope, requestId: event.requestId } : state;
  return state.status === "compacting" && state.requestId === event.requestId ? { status: "idle", scope: state.scope } : state;
}
