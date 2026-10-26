type Task = { run: () => unknown | Promise<unknown>; label: string; cancelled: boolean };
const queue: Task[] = [];
let scheduled = false;
let running = false;

// One module/task at a time, with a fresh paint/idle opportunity between jobs.
// Importing all cold surfaces together merely moves the freeze to app startup.
function schedule() {
  if (scheduled || running || queue.length === 0) return;
  scheduled = true;
  const resume = (deadline?: IdleDeadline) => {
    scheduled = false;
    if (document.hidden) {
      document.addEventListener("visibilitychange", schedule, { once: true });
      return;
    }
    const scheduling = (navigator as Navigator & {
      scheduling?: { isInputPending: () => boolean };
    }).scheduling;
    if (scheduling?.isInputPending() || (deadline && !deadline.didTimeout && deadline.timeRemaining() < 8)) {
      schedule();
      return;
    }
    const task = queue.shift();
    if (!task || task.cancelled) {
      schedule();
      return;
    }
    running = true;
    void Promise.resolve().then(task.run).catch((error: unknown) => {
      console.error(`[idle] ${task.label}`, error);
    }).finally(() => {
      running = false;
      schedule();
    });
  };
  // A timer gives the preceding render a paint opportunity even without rIC.
  window.setTimeout(() => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(resume, { timeout: 4000 });
    } else {
      resume();
    }
  }, 32);
}

export function scheduleIdleTask(run: Task["run"], label: string): () => void {
  const task: Task = { run, label, cancelled: false };
  queue.push(task);
  schedule();
  return () => { task.cancelled = true; };
}
