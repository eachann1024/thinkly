import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { getLocationSnapshot } from "@/components/editor/ai/composer/referenceMetadata";
import { readObject } from "./toolProgressValues";

/** Summaries show concrete notebook/directory identities, including same-name folders. */
export function batchPlanDestinations(input: Record<string, unknown> | null, output: Record<string, unknown> | null): string {
  const results = Array.isArray(output?.results) ? output.results : [];
  const operations = results.length ? results : Array.isArray(input?.operations) ? input.operations : [];
  const notebooks = useNotebooks.getState().notebooks;
  const pages = usePages.getState().pages;
  const destinations = operations.flatMap((value) => {
    const operation = readObject(value);
    const target = readObject(operation?.target);
    const notebookId = target?.notebookId ?? operation?.notebookId;
    if (typeof notebookId !== "string") return [];
    const pageId = target?.pageId ?? target?.parentId;
    const page = typeof pageId === "string" ? pages[pageId] : undefined;
    const notebook = notebooks[notebookId];
    return [page && page.workspaceId === notebookId
      ? `${notebook?.name ?? notebookId} / ${getLocationSnapshot(page, notebooks, pages)}`
      : `${notebook?.name ?? notebookId} /`];
  });
  return [...new Set(destinations)].join("；");
}
