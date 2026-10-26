export interface AppUpdateCheckActionDependencies<State> {
  getState: () => State;
  getRevision: () => number;
  canStart: (state: State) => boolean;
  setChecking: (previous: State) => void;
  check: () => Promise<unknown>;
  readLatest: (fallback: State) => Promise<State>;
  failure: (previous: State, error: unknown) => State;
  setState: (state: State) => void;
}

/** Shares a manual check and prevents its delayed result replacing newer state events. */
export function createAppUpdateCheckAction<State>(
  dependencies: AppUpdateCheckActionDependencies<State>,
): () => Promise<void> {
  let task: Promise<void> | undefined;
  let generation = 0;

  return function checkForUpdates(): Promise<void> {
    if (task) return task;
    const previous = dependencies.getState();
    if (!dependencies.canStart(previous)) return Promise.resolve();
    const request = ++generation;
    dependencies.setChecking(previous);
    const startedRevision = dependencies.getRevision();

    // Main emits check.started and then a terminal state for every visible
    // check. The first event may advance the revision while this request is
    // active; a later check.started can also arrive from another window. Only
    // commit this delayed read when no newer state event arrived.
    const canCommit = () =>
      request === generation && dependencies.getRevision() === startedRevision;

    task = (async () => {
      try {
        await dependencies.check();
        const latest = await dependencies.readLatest(
          dependencies.failure(previous, undefined),
        );
        if (canCommit()) dependencies.setState(latest);
      } catch (error) {
        if (canCommit()) dependencies.setState(dependencies.failure(previous, error));
      }
    })().finally(() => {
      if (request === generation) task = undefined;
    });
    return task;
  };
}
