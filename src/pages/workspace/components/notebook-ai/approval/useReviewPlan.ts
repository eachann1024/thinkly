import { useMemo } from "react";
import { useLocale } from "@/i18n";
import { getDbStorageItem } from "@/lib/storage";
import { batchPlanJournalKey } from "@/lib/notebook-ai/batch-plan/journal";
import { readReviewPlan } from "./planReviewData";

export function useReviewPlan(part: Parameters<typeof readReviewPlan>[0]) {
  const locale = useLocale();
  // Normalize once to identify the journal, including generated fallback run IDs.
  const initial = useMemo(() => readReviewPlan(part), [part.input, part.toolCallId, locale]);
  const raw = part.toolCallId && initial.input?.runId
    ? getDbStorageItem(batchPlanJournalKey(part.toolCallId, initial.input.runId))
    : null;
  let linkedRaw: string | null = null;
  if (raw?.startsWith('"')) {
    try {
      const key: unknown = JSON.parse(raw);
      if (typeof key === "string") linkedRaw = getDbStorageItem(key);
    } catch { /* readReviewPlan retains the existing invalid-data fallback. */ }
  }
  // Journals come from JSON storage; caching by bytes preserves their identities
  // across selection and message renders without hiding changes to a journal.
  return useMemo(() => readReviewPlan(part), [initial, raw, linkedRaw]);
}
