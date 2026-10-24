import { runWithPresence } from "@/lib/ui/presence";
import { useNotebooks } from "../../../useNotebooks";
import type { StoreSet, StoreGet } from "../hydrate";
import { persistPageSnapshots } from "../../persistence";

type MoveUndoSnapshot = {
  id: string;
  workspaceId: string;
  parentId?: string;
  order?: number;
};

export const undoMovePageTreeAction = (
  set: StoreSet,
  get: StoreGet,
  undoSnapshots: MoveUndoSnapshot[] | undefined,
  sourceNotebookId: string | undefined,
  prevActivePageId: string | null | undefined,
): boolean => {
  if (!undoSnapshots || undoSnapshots.length === 0) return false;

  const notebooks = useNotebooks.getState().notebooks;
  const restorable = undoSnapshots.filter(
    (snap) => !!notebooks[snap.workspaceId],
  );
  if (restorable.length === 0) return false;

  const restoredIds: string[] = [];
  runWithPresence(() => set((state) => {
    const newPages = { ...state.pages };
    restorable.forEach((snap) => {
      const current = newPages[snap.id];
      if (!current) return;
      newPages[snap.id] = {
        ...current,
        workspaceId: snap.workspaceId,
        parentId: snap.parentId,
        order: snap.order,
      };
      restoredIds.push(snap.id);
    });
    return { pages: newPages };
  }));

  if (restoredIds.length === 0) return false;

  persistPageSnapshots(get().pages, restoredIds);

  if (sourceNotebookId && notebooks[sourceNotebookId]) {
    useNotebooks
      .getState()
      .setLastActivePage(sourceNotebookId, prevActivePageId ?? null);
  }

  return true;
};
