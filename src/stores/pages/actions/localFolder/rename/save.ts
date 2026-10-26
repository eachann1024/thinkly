import type { StoreSet, StoreGet } from "../../hydrate";
import { beginRecoveredLocalSave, cloneJSONContent, confirmRecoveredLocalSave, getPendingLocalSaveContent } from "../../../folderSync";

export const saveDirtyLocalPageAction = async (
  set: StoreSet,
  get: StoreGet,
  pageId: string,
): Promise<boolean> => {
  const page = get().pages[pageId];
  if (!page) return false;
  if (page.localReadState === "error") return false;

  window.dispatchEvent(
    new CustomEvent("goose-note:flush-editor", {
      detail: { immediate: true, pageId },
    }),
  );

  const effectivePageId = pageId;

  const latest = get().pages[effectivePageId];
  if (!latest) return false;
  const content = cloneJSONContent(latest.content);

  const restorePending = beginRecoveredLocalSave(effectivePageId);
  try {
    const ok = await get().saveLocalPageContent(effectivePageId, content);
    if (ok) {
      const hasQueuedSave = getPendingLocalSaveContent(effectivePageId) !== undefined;
      if (!get().dirtyLocalPageIds[effectivePageId] && !hasQueuedSave) {
        confirmRecoveredLocalSave(effectivePageId);
      }
    }
    return ok;
  } finally {
    restorePending();
  }
};
