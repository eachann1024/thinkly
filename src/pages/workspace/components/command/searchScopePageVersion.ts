import type { Page } from "@/types";
import { changedPageIds } from "@/stores/pages/pageChanges";
import type { SearchNotebooks } from "./pageSearchCatalog";
import { searchMetadataSignature, searchNotebookSignature } from "./searchCatalogMetadata";
import { isCommandSearchablePage, shouldIncludePageInCommandScope } from "./searchPageFilter";

export function searchScopeConfigKey(notebooks: SearchNotebooks, all: boolean, activeId: string | null) {
  const relevant = Object.fromEntries(Object.entries(notebooks).filter(([id, notebook]) =>
    all ? id === activeId || !notebook?.excludeFromGlobalSearch : id === activeId));
  return JSON.stringify([all, activeId, searchNotebookSignature(relevant)]);
}

export function createSearchScopePageVersion(notebooks: SearchNotebooks, all: boolean, activeId: string | null) {
  let previous: Record<string, Page> | null = null;
  let version = {};
  const relevant = (page: Page | undefined) => !!page && isCommandSearchablePage(page, notebooks) &&
    (all || page.workspaceId === activeId) && shouldIncludePageInCommandScope(page, notebooks, all, activeId);
  return (pages: Record<string, Page>) => {
    if (previous === pages) return version;
    const changed = changedPageIds(previous, pages).some(id => {
      const before = previous?.[id], after = pages[id];
      if (!relevant(before) && !relevant(after)) return false;
      return !before || !after || before.content !== after.content || before.updatedAt !== after.updatedAt ||
        searchMetadataSignature(before) !== searchMetadataSignature(after);
    });
    if (changed) version = {};
    previous = pages;
    return version;
  };
}
