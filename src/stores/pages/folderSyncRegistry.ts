import type { JSONContent } from "@/types";
import { EMPTY_LOCAL_SAVE_STATE, localSavePageTransition, type LocalSaveEvent, type LocalSavePageState } from "./folderSyncState";

const pageStates = new Map<string, LocalSavePageState>();
export const getLocalSavePageState = (pageId: string): LocalSavePageState => pageStates.get(pageId) ?? EMPTY_LOCAL_SAVE_STATE;
export function transitionLocalSave(pageId: string, event: LocalSaveEvent): LocalSavePageState {
  const next = localSavePageTransition(getLocalSavePageState(pageId), event);
  if (next.pending.status === "empty" && next.permission.status === "automatic" && next.recovery.status === "none" && next.write.status === "idle") pageStates.delete(pageId);
  else pageStates.set(pageId, next);
  return next;
}
export const getPendingLocalSaveContent = (pageId: string): JSONContent | undefined => {
  const pending = getLocalSavePageState(pageId).pending;
  return pending.status === "empty" ? undefined : pending.content;
};
export const clearPendingLocalSaveContent = (pageId: string, expected?: JSONContent) => {
  transitionLocalSave(pageId, { type: "clear-pending", expected });
};
export const isRecoveredLocalSaveConfirmationRequired = (pageId: string) => getLocalSavePageState(pageId).permission.status === "confirmation-required";
export const localSavePageIds = () => pageStates.keys();
