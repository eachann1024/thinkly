import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";

export function compareNames(a: Page, b: Page): number {
  const byName = getPageTitle(a).localeCompare(getPageTitle(b), "zh-CN", {
    numeric: true,
  });
  return byName !== 0 ? byName : a.id.localeCompare(b.id);
}

export function sortLocalFolderChildren(
  pages: Page[],
  manualOrder: string[] | undefined,
): Page[] {
  const rank = manualOrder
    ? new Map(manualOrder.map((id, index) => [id, index]))
    : null;
  const unknownRank = rank ? rank.size : 0;

  return [...pages].sort((a, b) => {
    if (!!a.localPendingCreate !== !!b.localPendingCreate) {
      return a.localPendingCreate ? -1 : 1;
    }
    if (rank) {
      const rankA = rank.get(a.id) ?? unknownRank;
      const rankB = rank.get(b.id) ?? unknownRank;
      if (rankA !== rankB) return rankA - rankB;
    } else if (!!a.isFolder !== !!b.isFolder) {
      return a.isFolder ? -1 : 1;
    }
    return compareNames(a, b);
  });
}
