import type { InfoCardData } from "@/lib/notebook-ai/cards/types";
import type { NoteSource } from "./retrieveNotes";

export type SheetStep = { id: number; name: string; subject: string; status: "running" | "done" | "error"; count?: number };

type AnswerContent = {
  requestId: number; question: string; sources: NoteSource[]; readPages: NoteSource[]; text: string;
  steps: SheetStep[]; thinking: string; cards: InfoCardData[];
};
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
  | { type: "stepStart"; requestId: number; name: string; subject?: string }
  | { type: "stepEnd"; requestId: number; name: string; error?: boolean; count?: number; subject?: string }
  | { type: "thinking"; requestId: number; text: string }
  | { type: "card"; requestId: number; card: InfoCardData }
  | { type: "chunk" | "finish"; requestId: number; text: string }
  | { type: "fail"; requestId: number; error: string };

let stepSeq = 0;

function settle(steps: SheetStep[], match: (step: SheetStep) => boolean, status: SheetStep["status"] = "done") {
  return steps.some(step => step.status === "running" && match(step))
    ? steps.map(step => step.status === "running" && match(step) ? { ...step, status } : step)
    : steps;
}

function startStep(steps: SheetStep[], name: string, subject = ""): SheetStep[] {
  const base = settle(steps, step => step.name === "thinking").filter(step => !(step.name === "compose" && step.status === "running"));
  return [...base, { id: ++stepSeq, name, subject, status: "running" }];
}

function endStep(steps: SheetStep[], { name, error, count, subject }: { name: string; error?: boolean; count?: number; subject?: string }): SheetStep[] {
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (step.status !== "running" || step.name !== name) continue;
    const next = steps.slice();
    next[i] = { ...step, status: error ? "error" : "done", count, subject: subject || step.subject };
    return next;
  }
  return steps;
}

function withText(steps: SheetStep[]) {
  if (steps.some(step => step.name === "compose" && step.status === "running")) return steps;
  return startStep(steps, "compose");
}

function stepsAfterThinking(steps: SheetStep[]) {
  const last = steps.at(-1);
  if (last?.name === "thinking" && last.status === "running") return steps;
  return startStep(steps, "thinking");
}

export function sheetAnswerReducer(state: SheetAnswerState, event: Event): SheetAnswerState {
  if (event.type === "reset") return { status: "idle" };
  if (event.type === "ask") return { status: "loading", requestId: event.requestId, question: event.question, sources: [], readPages: [], text: "", steps: [], thinking: "", cards: [] };
  if (state.status === "idle" || state.requestId !== event.requestId || state.status === "done" || state.status === "error") return state;
  const { question, sources, readPages, text, requestId, steps, thinking, cards } = state;
  const content = { question, sources, readPages, text, requestId, steps, thinking, cards };
  const status = state.status;
  if (event.type === "retrieved") return { ...content, status, sources: event.sources };
  if (event.type === "source") return readPages.some(s => s.id === event.source.id) ? state : { ...content, status, readPages: [...readPages, event.source] };
  if (event.type === "stepStart") return { ...content, status, steps: startStep(steps, event.name, event.subject) };
  if (event.type === "stepEnd") return { ...content, status, steps: endStep(steps, event) };
  if (event.type === "thinking") return event.text === thinking ? state : { ...content, status, thinking: event.text, steps: stepsAfterThinking(steps) };
  if (event.type === "card") return { ...content, status, cards: [...cards, event.card] };
  if (event.type === "fail") return { ...content, status: "error", error: event.error, steps: settle(steps, () => true, "error") };
  if (event.type === "finish") return { ...content, status: "done", text: event.text || text, steps: settle(steps, () => true) };
  return { ...content, status: "streaming", text: event.text || text, steps: event.text ? withText(steps) : steps };
}

function citedNumbers(text: string) {
  const cited = new Set<number>();
  for (const match of text.matchAll(/\[(\d+(?:\s*[,，、]\s*\d+)*)\]/g)) for (const n of match[1].split(/[,，、]/)) cited.add(Number(n));
  return cited;
}

export function visibleSources(answer: SheetAnswer): Array<{ index: number | null; source: NoteSource }> {
  const cited = citedNumbers(answer.text);
  const list: Array<{ index: number | null; source: NoteSource }> = answer.sources.flatMap((source, i) => cited.has(i + 1) ? [{ index: i + 1, source }] : []);
  if (answer.status !== "done") return list;
  const shown = new Set(list.map(item => item.source.id));
  for (const source of answer.readPages) if (!shown.has(source.id)) { shown.add(source.id); list.push({ index: null, source }); }
  return list;
}
