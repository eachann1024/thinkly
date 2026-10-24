import { useEffect, useState } from "react";
import type { SearchResultPage } from "./useCommandSearch";
import { createSearchTaskBudget, yieldSearchTask } from "./searchTaskScheduling";

const EMPTY_RECENT: SearchResultPage[] = [];

export function useCommandSearchRecent(
  candidates: SearchResultPage[], excludedIds: string[], enabled: boolean, sessionKey: string,
): { recent: SearchResultPage[]; pending: boolean } {
  const [completed, setCompleted] = useState<{
    candidates: SearchResultPage[]; excludedIds: string[]; sessionKey: string;
    recent: SearchResultPage[];
  } | null>(null);
  const sameSession = completed?.sessionKey === sessionKey && completed.excludedIds === excludedIds;
  const current = sameSession && completed.candidates === candidates
    ? completed.recent : null;
  useEffect(() => {
    if (!enabled || current) return;
    const controller = new AbortController();
    void (async () => {
      await yieldSearchTask(controller.signal);
      const excluded = new Set(excludedIds);
      const recent: SearchResultPage[] = [];
      const pause = createSearchTaskBudget(controller.signal);
      for (const page of candidates) {
        if (controller.signal.aborted) return;
        if (!excluded.has(page.id)) {
          const index = recent.findIndex(item => item.updatedAt < page.updatedAt);
          if (index >= 0) recent.splice(index, 0, page);
          else if (recent.length < 5) recent.push(page);
          if (recent.length > 5) recent.pop();
        }
        const wait = pause();
        if (wait) await wait;
      }
      if (!controller.signal.aborted) setCompleted({ candidates, excludedIds, sessionKey, recent });
    })();
    return () => { controller.abort(); };
  }, [candidates, excludedIds, enabled, current, sessionKey]);
  return { recent: current ?? (sameSession ? completed.recent : EMPTY_RECENT),
    pending: enabled && !current };
}
