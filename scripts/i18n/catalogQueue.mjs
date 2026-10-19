/** One active generation and one merged dirty batch; failed work is retried on the next request. */
export function createGenerationQueue(run) {
  const dirty = new Set();
  let full = false, active = null, closed = false;
  const metrics = { requests: 0, runs: 0, maxActive: 0, maxQueuedBatches: 0 };
  function merge(paths) {
    if (paths === null) { full = true; dirty.clear(); }
    else if (!full) for (const file of paths) dirty.add(file);
    if (full || dirty.size) metrics.maxQueuedBatches = 1;
  }
  async function drain() {
    let result;
    try {
      while (!closed && (full || dirty.size)) {
        const paths = full ? null : [...dirty];
        full = false; dirty.clear();
        metrics.runs++; metrics.maxActive = 1;
        try { result = await run(paths); }
        catch (error) { merge(paths); throw error; }
      }
      return result;
    } finally { active = null; }
  }
  return {
    metrics,
    request(paths = null) {
      if (closed) return Promise.reject(new Error("Generation queue is closed"));
      metrics.requests++; merge(paths);
      if (!active) active = Promise.resolve().then(drain);
      return active;
    },
    async close() {
      closed = true; full = false; dirty.clear();
      await active?.catch(() => undefined);
    },
  };
}
