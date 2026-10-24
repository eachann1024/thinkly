import type { JSONContent } from "@/types";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";

export const QUICKNOTE_UNDO_MAX = 100;
export const QUICKNOTE_HISTORY_MAX_BYTES = 512 * 1024;
export const QUICKNOTE_UNDO_COALESCE_MS = 800;

export type QuickNoteSlotStacks = Record<
  1 | 2 | 3 | 4 | 5,
  Array<JSONContent | null>
>;

export function createEmptySlotStacks(): QuickNoteSlotStacks {
  return { 1: [], 2: [], 3: [], 4: [], 5: [] };
}

export function contentEquals(
  a: JSONContent | null | undefined,
  b: JSONContent | null | undefined,
): boolean {
  return getContentSignature(a ?? null) === getContentSignature(b ?? null);
}

function cloneContent(content: JSONContent | null): JSONContent | null {
  if (content == null) return null;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(content);
    } catch {
    }
  }
  return JSON.parse(JSON.stringify(content)) as JSONContent;
}

function clampStack(
  stack: Array<JSONContent | null>,
  max = QUICKNOTE_UNDO_MAX,
): Array<JSONContent | null> {
  if (stack.length <= max) return stack;
  return stack.slice(stack.length - max);
}

export function normalizeSlotStacks(raw: unknown): QuickNoteSlotStacks {
  const empty = createEmptySlotStacks();
  if (!raw || typeof raw !== "object") return empty;
  const rec = raw as Record<string, unknown>;
  for (const slot of [1, 2, 3, 4, 5] as const) {
    const key = String(slot);
    const list = (
      key in rec ? rec[key] : (raw as QuickNoteSlotStacks)[slot]
    ) as unknown;
    if (!Array.isArray(list)) {
      empty[slot] = [];
      continue;
    }
    const next: Array<JSONContent | null> = [];
    for (const item of list) {
      if (item == null) {
        next.push(null);
        continue;
      }
      if (typeof item === "object") {
        next.push(item as JSONContent);
      }
    }
    empty[slot] = clampStack(next);
  }
  return empty;
}

const stackBytes = (stack: Array<JSONContent | null>): number => {
  try {
    return JSON.stringify(stack).length * 2;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
};

export function budgetQuickNoteHistory(
  undoRaw: unknown,
  redoRaw: unknown,
  maxBytes = QUICKNOTE_HISTORY_MAX_BYTES,
): { undoStacks: QuickNoteSlotStacks; redoStacks: QuickNoteSlotStacks } {
  const undoStacks = normalizeSlotStacks(undoRaw);
  const redoStacks = normalizeSlotStacks(redoRaw);
  const stacks = ([1, 2, 3, 4, 5] as const).flatMap((slot) => [
    undoStacks[slot],
    redoStacks[slot],
  ]);
  let total = stacks.reduce((sum, stack) => sum + stackBytes(stack), 0);
  while (total > maxBytes) {
    const candidates = stacks.filter((stack) => stack.length > 0);
    if (candidates.length === 0) break;
    const target = candidates.reduce((largest, stack) =>
      stackBytes(stack) > stackBytes(largest) ? stack : largest,
    );
    target.shift();
    total = stacks.reduce((sum, stack) => sum + stackBytes(stack), 0);
  }
  return { undoStacks, redoStacks };
}

export interface RecordEditParams {
  undo: Array<JSONContent | null>;
  redo: Array<JSONContent | null>;
  previous: JSONContent | null;
  next: JSONContent | null;
  lastRecordAt: number;
  now?: number;
  coalesceMs?: number;
  max?: number;
}

export interface RecordEditResult {
  undo: Array<JSONContent | null>;
  redo: Array<JSONContent | null>;
  lastRecordAt: number;
  recorded: boolean;
}

export function recordEditHistory(params: RecordEditParams): RecordEditResult {
  const {
    previous,
    next,
    lastRecordAt,
    now = Date.now(),
    coalesceMs = QUICKNOTE_UNDO_COALESCE_MS,
    max = QUICKNOTE_UNDO_MAX,
  } = params;

  if (contentEquals(previous, next)) {
    return {
      undo: params.undo,
      redo: params.redo,
      lastRecordAt,
      recorded: false,
    };
  }

  if (
    lastRecordAt > 0 &&
    now - lastRecordAt < coalesceMs &&
    params.undo.length > 0
  ) {
    return {
      undo: params.undo,
      redo: [],
      lastRecordAt,
      recorded: false,
    };
  }

  const undo = clampStack([...params.undo, cloneContent(previous)], max);
  return {
    undo,
    redo: [],
    lastRecordAt: now,
    recorded: true,
  };
}

export interface ApplyUndoParams {
  undo: Array<JSONContent | null>;
  redo: Array<JSONContent | null>;
  current: JSONContent | null;
  max?: number;
}

export interface ApplyHistoryResult {
  undo: Array<JSONContent | null>;
  redo: Array<JSONContent | null>;
  content: JSONContent | null;
  applied: boolean;
}

export function applyUndo(params: ApplyUndoParams): ApplyHistoryResult {
  if (params.undo.length === 0) {
    return {
      undo: params.undo,
      redo: params.redo,
      content: params.current,
      applied: false,
    };
  }
  const max = params.max ?? QUICKNOTE_UNDO_MAX;
  const undo = params.undo.slice();
  const restored = undo.pop() ?? null;
  const redo = clampStack(
    [...params.redo, cloneContent(params.current)],
    max,
  );
  return {
    undo,
    redo,
    content: restored,
    applied: true,
  };
}

export function applyRedo(params: ApplyUndoParams): ApplyHistoryResult {
  if (params.redo.length === 0) {
    return {
      undo: params.undo,
      redo: params.redo,
      content: params.current,
      applied: false,
    };
  }
  const max = params.max ?? QUICKNOTE_UNDO_MAX;
  const redo = params.redo.slice();
  const restored = redo.pop() ?? null;
  const undo = clampStack(
    [...params.undo, cloneContent(params.current)],
    max,
  );
  return {
    undo,
    redo,
    content: restored,
    applied: true,
  };
}
