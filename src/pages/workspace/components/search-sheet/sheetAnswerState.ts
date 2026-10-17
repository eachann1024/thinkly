import type { NoteSource } from "./retrieveNotes";
/** sources 为预检索摘录（编号与正文 [n] 对应），readPages 为 readPage 实际读过的页面。 */
type AnswerContent = { requestId: number; question: string; sources: NoteSource[]; readPages: NoteSource[]; text: string; tool: string | null };
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
  if (event.type === "ask") return { status: "loading", requestId: event.requestId, question: event.question, sources: [], readPages: [], text: "", tool: null };
  if (state.status === "idle" || state.requestId !== event.requestId || state.status === "done" || state.status === "error") return state;
  const { question, sources, readPages, text, requestId, tool } = state;
  const content = { question, sources, readPages, text, requestId, tool };
  const status = state.status;
  if (event.type === "retrieved") return { ...content, status, sources: event.sources };
  if (event.type === "source") return readPages.some(s => s.id === event.source.id) ? state : { ...content, status, readPages: [...readPages, event.source] };
  if (event.type === "tool") return { ...content, status, tool: event.tool };
  if (event.type === "fail") return { ...content, status: "error", error: event.error, tool: null };
  if (event.type === "finish") return { ...content, status: "done", text: event.text || text, tool: null };
  return { ...content, status: "streaming", text: event.text || text };
}

/** 正文里引用过的摘录编号，兼容 [1]、[1, 2]、[1][2]。 */
function citedNumbers(text: string) {
  const cited = new Set<number>();
  for (const match of text.matchAll(/\[(\d+(?:\s*[,，、]\s*\d+)*)\]/g)) for (const n of match[1].split(/[,，、]/)) cited.add(Number(n));
  return cited;
}

/** 来源区只列被 [n] 引用过的摘录（保留原编号）；完成后再补上 readPage 读过、未被引用的页面（无编号）。 */
export function visibleSources(answer: SheetAnswer): Array<{ index: number | null; source: NoteSource }> {
  const cited = citedNumbers(answer.text);
  const list: Array<{ index: number | null; source: NoteSource }> = answer.sources.flatMap((source, i) => cited.has(i + 1) ? [{ index: i + 1, source }] : []);
  if (answer.status !== "done") return list;
  const shown = new Set(list.map(item => item.source.id));
  for (const source of answer.readPages) if (!shown.has(source.id)) { shown.add(source.id); list.push({ index: null, source }); }
  return list;
}
