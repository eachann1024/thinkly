import type { JSONContent } from "@/types";

export const localSaveDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
export const localSaveMaxWaitTimers = new Map<string, ReturnType<typeof setTimeout>>();
export const localSaveWriteChains = new Map<string, Promise<void>>();
const localPageFileOperationTails = new Map<string, Promise<void>>();
export const hasLocalSaveWriteChain = (pageId: string) => localSaveWriteChains.has(pageId);

export const acquireLocalPageFileOperation = async (pageId: string): Promise<() => void> => {
  const previous = localPageFileOperationTails.get(pageId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>(resolve => { release = resolve; });
  localPageFileOperationTails.set(pageId, current);
  await previous;
  return () => {
    if (localPageFileOperationTails.get(pageId) === current) localPageFileOperationTails.delete(pageId);
    release();
  };
};
export const cloneJSONContent = (content: JSONContent): JSONContent => {
  try { return structuredClone(content) as JSONContent; }
  catch { return JSON.parse(JSON.stringify(content)) as JSONContent; }
};
export const clearLocalSaveTimers = (pageId: string) => {
  const debounceTimer = localSaveDebounceTimers.get(pageId);
  if (debounceTimer) { clearTimeout(debounceTimer); localSaveDebounceTimers.delete(pageId); }
  const maxWaitTimer = localSaveMaxWaitTimers.get(pageId);
  if (maxWaitTimer) { clearTimeout(maxWaitTimer); localSaveMaxWaitTimers.delete(pageId); }
};
