import { workspaceMaintenanceDelay } from "@/lib/workspace-navigation-timing";

export function yieldSearchTask(signal: AbortSignal, idle = false): Promise<void> {
  return new Promise((resolve) => {
    let timer = 0;
    let idleId = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      if (idleId) cancelIdleCallback(idleId);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const resume = () => {
      if (signal.aborted) return finish();
      const delay = workspaceMaintenanceDelay();
      if (delay > 0) timer = window.setTimeout(schedule, delay);
      else finish();
    };
    const schedule = () => {
      if (signal.aborted) return finish();
      const delay = workspaceMaintenanceDelay();
      if (delay > 0) timer = window.setTimeout(schedule, delay);
      else if (idle && typeof requestIdleCallback === "function") {
        idleId = requestIdleCallback(resume, { timeout: 120 });
      } else timer = window.setTimeout(resume, 0);
    };
    signal.addEventListener("abort", finish, { once: true });
    schedule();
  });
}

export function createSearchTaskBudget(signal: AbortSignal, idle = false) {
  let started = performance.now();
  return () => {
    if (workspaceMaintenanceDelay() === 0 && performance.now() - started < 4) return;
    return yieldSearchTask(signal, idle).then(() => { started = performance.now(); });
  };
}

export async function sortSearchCatalog<T>(
  items: T[],
  compare: (a: T, b: T) => number,
  signal: AbortSignal,
): Promise<T[] | null> {
  let source = items;
  let target = new Array<T>(items.length);
  const pause = createSearchTaskBudget(signal, true);
  for (let width = 1; width < items.length; width *= 2) {
    for (let start = 0; start < items.length; start += width * 2) {
      const middle = Math.min(start + width, items.length);
      const end = Math.min(start + width * 2, items.length);
      let left = start, right = middle;
      for (let position = start; position < end; position++) {
        if (signal.aborted) return null;
        target[position] = right >= end ||
          (left < middle && compare(source[left], source[right]) <= 0)
          ? source[left++] : source[right++];
        const wait = pause();
        if (wait) await wait;
      }
    }
    [source, target] = [target, source];
  }
  return signal.aborted ? null : source;
}
