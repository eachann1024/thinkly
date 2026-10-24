import { useNotebooks } from "../../../useNotebooks";
import type { StoreSet, StoreGet } from "../hydrate";
import { flushEditorContent } from "../flushEditor";

export const setActivePageAction = (
  set: StoreSet,
  get: StoreGet,
  id: string | null,
): void => {
  const previousActivePageId = get().activePageId;
  if (previousActivePageId === id) return;

  flushEditorContent(true);

  if (previousActivePageId && previousActivePageId !== id) {
    void get().flushPendingLocalSaveByPageId(previousActivePageId);
  }

  if (!id) {
    set({ activePageId: null });
    return;
  }

  set({ activePageId: id });

  const notebookId = useNotebooks.getState().activeNotebookId;
  if (notebookId) {
    useNotebooks.getState().setLastActivePage(notebookId, id);
  }
};
