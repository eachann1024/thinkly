type Commit = { run: () => void; cancelled: boolean };
const queue: Commit[] = [];
let frame: number | null = null;

function flush() {
  frame = null;
  let next = queue.shift();
  while (next?.cancelled) next = queue.shift();
  try { next?.run(); }
  finally { if (queue.length) frame = requestAnimationFrame(flush); }
}

/** Separate preview DOM commits across frames instead of draining all async results at once. */
export function schedulePreviewCommit(run: () => void) {
  const item = { run, cancelled: false };
  queue.push(item);
  frame ??= requestAnimationFrame(flush);
  return () => { item.cancelled = true; };
}
