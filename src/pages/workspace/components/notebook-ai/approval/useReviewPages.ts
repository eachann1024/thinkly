import { useMemo } from "react";
import type { Page } from "@/types";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { getPageTitle } from "@/components/editor/utils/page-title";
import type { BatchPlanOperationInput, BatchPlanJournal } from "@/lib/notebook-ai/batch-plan/types";
import { operationNotebookId } from "@/lib/notebook-ai/batch-plan/batchTargets";

export function useReviewPages(operation: BatchPlanOperationInput, journal: BatchPlanJournal | null) {
  const ids = useMemo(() => operation.type === "create"
    ? [journal?.createdPageIds[operation.operationId]].filter((id): id is string => Boolean(id))
    : operation.type === "delete" ? operation.pageIds : [operation.pageId], [operation, journal]);
  const pageMetadata = usePages(useMemo(() => (state: ReturnType<typeof usePages.getState>) => {
    const seen = new Set<string>();
    const metadata: unknown[] = [];
    for (const id of ids) {
      let page: Page | undefined = state.pages[id] ?? journal?.before[id]?.page;
      while (page && !seen.has(page.id)) {
        seen.add(page.id);
        metadata.push([page.id, getPageTitle(page), page.workspaceId, page.parentId,
          page.localFilePath, page.trashedAt, page.isFolder]);
        page = page.parentId ? state.pages[page.parentId] : undefined;
      }
    }
    return JSON.stringify(metadata);
  }, [ids, journal]));
  const notebookIds = useMemo(() => {
    const result = new Set<string>();
    if (journal?.notebookId) result.add(journal.notebookId);
    const target = journal?.operationTargets?.[operation.operationId] ?? operation.target;
    if (target?.notebookId) result.add(target.notebookId);
    for (const row of JSON.parse(pageMetadata) as Array<[string, string, string]>) result.add(row[2]);
    return [...result];
  }, [pageMetadata, operation, journal]);
  useNotebooks(useMemo(() => (state: ReturnType<typeof useNotebooks.getState>) => JSON.stringify(
    notebookIds.map((id) => {
      const notebook = state.notebooks[id];
      return [id, notebook?.name, notebook?.localPath, notebook?.source];
    }),
  ), [notebookIds]));
  const targetId = journal ? operationNotebookId(journal, operation) : undefined;
  return useNotebooks((state) => targetId ? state.notebooks[targetId]?.source : undefined);
}
