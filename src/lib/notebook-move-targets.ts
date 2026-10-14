import { sortNotebooksByOrder, type Notebook } from "@/stores/useNotebooks";
import type { Page } from "@/types";

export function getNotebookMoveTargets(
  page: Page | undefined,
  notebooks: Record<string, Notebook>,
): Notebook[] {
  if (!page || page.trashedAt || page.localPendingCreate || page.localUnsaved)
    return [];
  const local = notebooks[page.workspaceId]?.source === "local-folder";
  return sortNotebooksByOrder(notebooks).filter(
    (notebook) =>
      notebook.id !== page.workspaceId &&
      (local
        ? notebook.source === "local-folder" && !!notebook.localPath
        : notebook.source !== "local-folder"),
  );
}
