type Debounced<F extends (...args: any[]) => void> = F & {
  cancel: () => void;
  flush: () => void;
};

export function createDebounce<F extends (...args: any[]) => void>(
  fn: F,
  wait: number,
  opts?: { maxWait?: number },
): Debounced<F> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let maxTimer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<F> | null = null;
  const maxWait = opts?.maxWait;

  const clearTimers = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (maxTimer) {
      clearTimeout(maxTimer);
      maxTimer = null;
    }
  };

  const invoke = () => {
    clearTimers();
    if (lastArgs) {
      const args = lastArgs;
      lastArgs = null;
      fn(...args);
    }
  };

  const debounced = ((...args: Parameters<F>) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(invoke, wait);
    if (maxWait != null && maxTimer == null) {
      maxTimer = setTimeout(invoke, maxWait);
    }
  }) as Debounced<F>;

  debounced.cancel = () => {
    clearTimers();
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timer || maxTimer) invoke();
  };

  return debounced;
}
