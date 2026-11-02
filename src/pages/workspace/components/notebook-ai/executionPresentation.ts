import type { NotebookAiExecution, NotebookAiExecutionSource } from "@/lib/notebook-ai/types";
import { noteCitationKey } from "@/lib/notebook-ai/noteCitation";
import { readExecutionSource } from "@/lib/notebook-ai/executionSource";
import type { ToolProgressPart } from "./toolProgressModel";

export type ExecutionStage = "read" | "write" | "visual" | "response";
export function formatExecutionTime(milliseconds: number, locale: string) {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Math.max(0, milliseconds) / 1000)}${locale.startsWith("zh") || locale.startsWith("ja") ? " 秒" : "s"}`;
}

function toolStage(type: string): ExecutionStage {
  if (/^tool-(read|search|list)/.test(type)) return "read";
  if (/^tool-show/.test(type)) return "visual";
  return "write";
}

export interface ExecutionSegment { stage: ExecutionStage; start: number; end: number }

function appendSegment(list: ExecutionSegment[], stage: ExecutionStage, start: number, end: number) {
  if (end <= start) return;
  const last = list[list.length - 1];
  if (last?.stage === stage && last.end === start) last.end = end;
  else list.push({ stage, start, end });
}

export function prepareExecutionSegments(execution: NotebookAiExecution, parts: ToolProgressPart[]) {
  const end = execution.endedAt ?? Infinity;
  let legacyTypes: Map<string | undefined, ExecutionStage> | undefined;
  const events: Array<{ at: number; stage: ExecutionStage; change: number }> = [];
  for (const [id, tool] of Object.entries(execution.tools)) {
    if (!tool.type) legacyTypes ??= new Map(parts.map(part => [part.toolCallId, toolStage(part.type)]));
    const stage = tool.type ? toolStage(tool.type) : legacyTypes?.get(id);
    if (!stage) continue;
    const start = Math.max(execution.startedAt, tool.startedAt);
    const finish = Math.min(end, tool.endedAt ?? end);
    if (finish <= start) continue;
    events.push({ at: start, stage, change: 1 });
    if (Number.isFinite(finish)) events.push({ at: finish, stage, change: -1 });
  }
  events.sort((a, b) => a.at - b.at);
  const active = { read: 0, write: 0, visual: 0, response: 0 };
  const current = (): ExecutionStage => active.write ? "write" : active.visual ? "visual" : active.read ? "read" : "response";
  const closed: ExecutionSegment[] = [];
  let previous = execution.startedAt;
  for (const event of events) {
    // Allocate overlapping calls once, so the segments always sum to wall time.
    appendSegment(closed, current(), previous, event.at);
    active[event.stage] += event.change;
    previous = event.at;
  }
  const tail = current();
  // Only the trailing segment moves; sorting and merging happen when tool data changes.
  return (now: number) => {
    const result = closed.map(segment => ({ ...segment }));
    appendSegment(result, tail, previous, Math.min(end, now));
    return result;
  };
}

export function prepareExecutionStages(execution: NotebookAiExecution, parts: ToolProgressPart[]) {
  const segments = prepareExecutionSegments(execution, parts);
  return (now: number) => {
    const totals = { read: 0, write: 0, visual: 0, response: 0 };
    for (const segment of segments(now)) totals[segment.stage] += segment.end - segment.start;
    return (Object.entries(totals) as Array<[ExecutionStage, number]>).filter(([, duration]) => duration > 0);
  };
}

export function executionSources(parts: ToolProgressPart[]): NotebookAiExecutionSource[] {
  const sources = new Map<string, NotebookAiExecutionSource>();
  for (const part of parts) {
    if (part.state !== "output-available" || (part.type !== "tool-readPage" && part.type !== "tool-readWebPage")) continue;
    const source = readExecutionSource(part.type, part.output, part.toolCallId);
    if (source) sources.set(noteCitationKey(source.id, source.location), source);
  }
  return [...sources.values()];
}
