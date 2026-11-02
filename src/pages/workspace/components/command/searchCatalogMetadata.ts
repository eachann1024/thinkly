import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import type { SearchNotebooks } from "./pageSearchCatalog";

const signatures = new WeakMap<Page, string>();
export function searchMetadataSignature(page: Page): string {
  const cached = signatures.get(page);
  if (cached !== undefined) return cached;
  const value = JSON.stringify([getPageTitle(page), page.workspaceId,
    page.parentId, page.trashedAt, page.localUnsaved, page.isFolder, page.localFilePath]);
  signatures.set(page, value);
  return value;
}
export function searchNotebookSignature(notebooks: SearchNotebooks): string {
  return JSON.stringify(Object.keys(notebooks).sort().map(id =>
    [id, notebooks[id]?.source, notebooks[id]?.localPath,
      notebooks[id]?.localPathMissing, notebooks[id]?.excludeFromGlobalSearch]));
}

// Stable title ties follow the source record's property order, as Array.sort did.
interface CatalogOrdering {
  clone(): CatalogOrdering;
  add(id: string): void;
  remove(id: string): void;
  compare(a: Page, b: Page): number;
}
export function createCatalogOrdering(ranks = new Map<string, number>(), rank = 0): CatalogOrdering {
  const collator = new Intl.Collator("zh-CN");
  const numericKey = (id: string) => String(Number(id)) === id && Number.isInteger(Number(id)) &&
    Number(id) >= 0 && Number(id) < 4_294_967_295;
  return {
    clone: (): ReturnType<typeof createCatalogOrdering> => createCatalogOrdering(new Map(ranks), rank),
    add(id: string) { if (!ranks.has(id)) ranks.set(id, rank++); },
    remove(id: string) { ranks.delete(id); },
    compare(a: Page, b: Page) {
      const titleOrder = collator.compare(getPageTitle(a), getPageTitle(b));
      if (titleOrder) return titleOrder;
      const an = numericKey(a.id), bn = numericKey(b.id);
      if (an || bn) return an && bn ? Number(a.id) - Number(b.id) : an ? -1 : 1;
      return (ranks.get(a.id) ?? 0) - (ranks.get(b.id) ?? 0);
    },
  };
}

export function insertCatalogPage(pages: Page[], page: Page, compare: (a: Page, b: Page) => number) {
  let low = 0, high = pages.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (compare(pages[middle], page) <= 0) low = middle + 1;
    else high = middle;
  }
  pages.splice(low, 0, page);
}
