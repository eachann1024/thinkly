import type { NoteSource } from "./retrieveNotes";
type AnswerContent = { requestId: number; question: string; sources: NoteSource[]; text: string };
export type SheetAnswer = AnswerContent & (
  | { status: "loading" | "streaming" | "done" }
  | { status: "error"; error: string }
);
export type SheetAnswerState = { status: "idle" } | SheetAnswer;
type Event =
  | { type: "reset" }
  | { type: "ask"; requestId: number; question: string }
  | { type: "retrieved"; requestId: number; sources: NoteSource[] }
  | { type: "chunk" | "finish"; requestId: number; text: string }
  | { type: "fail"; requestId: number; error: string };
export function sheetAnswerReducer(state: SheetAnswerState, event: Event): SheetAnswerState {
  if (event.type === "reset") return { status: "idle" };
  if (event.type === "ask") return { status: "loading", requestId: event.requestId, question: event.question, sources: [], text: "" };
  if (state.status === "idle" || state.requestId !== event.requestId || state.status === "done" || state.status === "error") return state;
  const { question, sources, text, requestId } = state;
  const content = { question, sources, text, requestId };
  if (event.type === "retrieved") return { ...content, status: "loading", sources: event.sources };
  if (event.type === "fail") return { ...content, status: "error", error: event.error };
  return { ...content, status: event.type === "chunk" ? "streaming" : "done", text: event.text || text };
}
