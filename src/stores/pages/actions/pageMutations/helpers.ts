import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";

function compareSiblingPages(
  a: Page,
  b: Page,
  isLocalNotebook: boolean,
): number {
  if (isLocalNotebook) {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1;
    }
    const titleCompare = getPageTitle(a).localeCompare(getPageTitle(b), "zh-CN", {
      numeric: true,
    });
    if (titleCompare !== 0) return titleCompare;
    return a.id.localeCompare(b.id);
  }

  const orderA = a.order ?? a.createdAt;
  const orderB = b.order ?? b.createdAt;
  if (orderA !== orderB) return orderA - orderB;
  return a.id.localeCompare(b.id);
}

export { compareSiblingPages };

function resolveAdjacentPageAfterDeletion({
  pages,
  currentPage,
  removedIds,
  isLocalNotebook,
}: {
  pages: Record<string, Page>;
  currentPage: Page;
  removedIds: Set<string>;
  isLocalNotebook: boolean;
}): string | null {
  const siblingsBeforeDelete = Object.values(pages)
    .filter(
      (candidate) =>
        candidate.workspaceId === currentPage.workspaceId &&
        !candidate.trashedAt &&
        candidate.parentId === currentPage.parentId,
    )
    .sort((a, b) => compareSiblingPages(a, b, isLocalNotebook));

  const deletedPageIndex = siblingsBeforeDelete.findIndex(
    (candidate) => candidate.id === currentPage.id,
  );
  const siblingsAfterDelete = siblingsBeforeDelete.filter(
    (candidate) => !removedIds.has(candidate.id),
  );

  if (siblingsAfterDelete.length === 0) {
    return null;
  }

  const fallbackIndex =
    deletedPageIndex === -1
      ? siblingsAfterDelete.length - 1
      : Math.min(deletedPageIndex, siblingsAfterDelete.length - 1);

  return siblingsAfterDelete[fallbackIndex]?.id ?? null;
}

export { resolveAdjacentPageAfterDeletion };

function resolveVisibleRowAfterDeletion({
  pages,
  currentPage,
  removedIds,
  isLocalNotebook,
  expandedIds,
}: {
  pages: Record<string, Page>;
  currentPage: Page;
  removedIds: Set<string>;
  isLocalNotebook: boolean;
  expandedIds: string[];
}): string | null {
  const expanded = new Set(expandedIds);
  const childrenOf = (parentId: string | undefined) =>
    Object.values(pages)
      .filter(
        (candidate) =>
          candidate.workspaceId === currentPage.workspaceId &&
          !candidate.trashedAt &&
          candidate.parentId === parentId,
      )
      .sort((a, b) => compareSiblingPages(a, b, isLocalNotebook));

  const visibleBefore: string[] = [];
  const walk = (parentId: string | undefined) => {
    for (const page of childrenOf(parentId)) {
      visibleBefore.push(page.id);
      if (expanded.has(page.id)) walk(page.id);
    }
  };
  walk(undefined);

  const deletedIndex = visibleBefore.indexOf(currentPage.id);
  if (deletedIndex === -1) {
    return resolveAdjacentPageAfterDeletion({
      pages,
      currentPage,
      removedIds,
      isLocalNotebook,
    });
  }

  for (let i = deletedIndex + 1; i < visibleBefore.length; i++) {
    if (!removedIds.has(visibleBefore[i])) return visibleBefore[i];
  }
  for (let i = deletedIndex - 1; i >= 0; i--) {
    if (!removedIds.has(visibleBefore[i])) return visibleBefore[i];
  }
  const parentId = currentPage.parentId;
  if (parentId && pages[parentId] && !removedIds.has(parentId)) {
    return parentId;
  }
  return null;
}

export { resolveVisibleRowAfterDeletion };
