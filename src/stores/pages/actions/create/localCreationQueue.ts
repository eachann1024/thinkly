const notebookCreationTails = new Map<string, Promise<void>>();

/** A creation that never settles must not block every later one until restart. */
export const LOCAL_CREATION_WAIT_MS = 15_000;

function settleWithin(promise: Promise<unknown>, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    promise.then(
      () => { clearTimeout(timer); resolve(true); },
      () => { clearTimeout(timer); resolve(true); },
    );
  });
}

export async function queueLocalPageCreation<T>(
  workspaceId: string,
  create: () => Promise<T>,
): Promise<T> {
  const previous = notebookCreationTails.get(workspaceId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  notebookCreationTails.set(workspaceId, current);
  if (!(await settleWithin(previous, LOCAL_CREATION_WAIT_MS))) {
    console.warn("[local-create] previous creation still pending; continuing", workspaceId);
  }
  try {
    return await create();
  } finally {
    if (notebookCreationTails.get(workspaceId) === current) {
      notebookCreationTails.delete(workspaceId);
    }
    release();
  }
}

/** Resolve to `fallback` when `task` hangs, so the caller can report a failure. */
export async function withLocalCreationTimeout<T>(
  task: Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[local-create] ${label} timed out`);
      resolve(fallback);
    }, LOCAL_CREATION_WAIT_MS);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
