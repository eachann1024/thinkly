import type { BatchPlanJournal } from "./types";
import { removePageActivity } from "@/lib/reflection/activityJournal";

export function batchActivityId(journal: BatchPlanJournal, operationId: string): string {
  return JSON.stringify([journal.runId, journal.toolCallId, operationId]);
}

export function removeCompensatedActivity(journal: BatchPlanJournal, pageId: string, includeCreated = false): void {
  for (const result of journal.results) {
    if (result.ok && result.pageIds.includes(pageId) &&
      (result.type === "edit" || result.type === "search_replace" || includeCreated && result.type === "create")) {
      removePageActivity(batchActivityId(journal, result.operationId));
    }
  }
}
