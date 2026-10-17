import type { NoteSource } from "./retrieveNotes";
type AnswerContent = { requestId: number; question: string; sources: NoteSource[]; text: string; tool: string | null };
export type SheetAnswer = AnswerContent & (
  | { status: "loading" | "streaming" | "done" }
  | { status: "error"; error: string }
);
export type SheetAnswerState = { status: "idle" } | SheetAnswer;
type Event =
  | { type: "reset" }
  | { type: "ask"; requestId: number; question: string }
  | { type: "retrieved"; requestId: number; sources: NoteSource[] }
  | { type: "source"; requestId: number; source: NoteSource }
  | { type: "tool"; requestId: number; tool: string | null }
  | { type: "chunk" | "finish"; requestId: number; text: string }
  | { type: "fail"; requestId: number; error: string };
export function sheetAnswerReducer(state: SheetAnswerState, event: Event): SheetAnswerState {
  if (event.type === "reset") return { status: "idle" };
  if (event.type === "ask") return { status: "loading", requestId: event.requestId, question: event.question, sources: [], text: "", tool: null };
  if (state.status === "idle" || state.requestId !== event.requestId || state.status === "done" || state.status === "error") return state;
  const { question, sources, text, requestId, tool } = state;
  const content = { question, sources, text, requestId, tool };
  const status = state.status;
  if (event.type === "retrieved") return { ...content, status, sources: event.sources };
  if (event.type === "source") return sources.some(s => s.id === event.source.id) ? state : { ...content, status, sources: [...sources, event.source] };
  if (event.type === "tool") return { ...content, status, tool: event.tool };
  if (event.type === "fail") return { ...content, status: "error", error: event.error, tool: null };
  if (event.type === "finish") return { ...content, status: "done", text: event.text || text, tool: null };
  return { ...content, status: "streaming", text: event.text || text };
}
