export const contentMatchesPersisted = (
  signature: string,
  persistedSignature: string | null,
): boolean => persistedSignature !== null && signature === persistedSignature;

export const scheduleAfterPaint = (task: () => void): void => {
  const host = globalThis as { requestIdleCallback?: (callback: () => void) => number };
  if (typeof host.requestIdleCallback === "function") {
    host.requestIdleCallback(() => task());
    return;
  }
  setTimeout(task, 0);
};

export const flushSettingsContentChange = (input: {
  pending: boolean;
  signature: string;
  persistedSignature: string | null;
  persist: () => void;
  schedule?: (task: () => void) => void;
}): "skipped" | "scheduled" => {
  if (!input.pending || contentMatchesPersisted(input.signature, input.persistedSignature)) {
    return "skipped";
  }
  (input.schedule ?? scheduleAfterPaint)(input.persist);
  return "scheduled";
};
