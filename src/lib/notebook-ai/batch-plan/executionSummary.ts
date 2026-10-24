import type { BatchPlanExecuteResult } from "./types";

export function batchExecutionSummary(result: BatchPlanExecuteResult) {
  return {
    appliedCount: result.ok || result.journal.version === 2
      ? result.results.filter((item) => item.ok).length
      : undefined,
    rollbackStatus: result.journal.rollbackStatus,
  };
}
