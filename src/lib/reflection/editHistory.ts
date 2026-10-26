import { usePages } from "@/stores/usePages";
import { readPageActivity } from "./activityJournal";
export { isEditablePage, type EditEvent } from "./activityJournal";

// Activity is independent of history snapshot retention, file scans and updatedAt.
export async function loadEditEvents(since: number, _force = false) {
  return readPageActivity(since, usePages.getState().pages);
}
