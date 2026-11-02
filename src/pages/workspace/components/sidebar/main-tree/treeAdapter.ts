import type { TreeItem, TreeItemIndex } from "react-complex-tree";
import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { sidebarPageSignature } from "@/stores/pages/sidebarPageSignature";
import {
  LOCAL_FOLDER_ROOT_DIR_KEY, sortLocalFolderChildren, type LocalFolderOrderMap,
} from "@/stores/localFolderOrder";

export { getPageTitle };

type Items = Record<TreeItemIndex, TreeItem<Page>>;
interface TreeCache {
  pages: Map<string, Page>;
  groups: Map<string | undefined, Set<string>>;
  orders: LocalFolderOrderMap | undefined;
  items: Items;
}
const caches = new Map<string, TreeCache>();
const ROOT_PLACEHOLDER: Page = {
  id: "root", workspaceId: "", content: { type: "doc", content: [] } as any,
  isLocked: false, fontSize: "medium" as any, fontFamily: "default" as any,
  createdAt: 0, updatedAt: 0,
};
function sameChildren(a: TreeItemIndex[] | undefined, b: string[]): boolean {
  return !!a && a.length === b.length && a.every((id, index) => id === b[index]);
}
function sortInternalPages(items: Page[]): Page[] {
  return items.sort((a, b) => {
    if (!!a.localPendingCreate !== !!b.localPendingCreate) return a.localPendingCreate ? -1 : 1;
    return (a.order ?? a.createdAt) - (b.order ?? b.createdAt) || a.id.localeCompare(b.id);
  });
}

export function pagesToTreeItems(
  pages: Page[], activeNotebookId: string, isLocalFolder: boolean,
  localFolderOrders?: LocalFolderOrderMap,
): Items {
  const key = JSON.stringify([activeNotebookId, isLocalFolder]);
  const cache = caches.get(key) ?? {
    pages: new Map<string, Page>(), groups: new Map<string | undefined, Set<string>>(),
    orders: undefined, items: {},
  };
  const nextPages = new Map<string, Page>();
  const dirtyGroups = new Set<string | undefined>();
  const dirtyItems = new Set<string>();
  const remove = (page: Page) => {
    cache.groups.get(page.parentId)?.delete(page.id);
    dirtyGroups.add(page.parentId);
  };
  const add = (page: Page) => {
    let group = cache.groups.get(page.parentId);
    if (!group) cache.groups.set(page.parentId, group = new Set());
    group.add(page.id);
    dirtyGroups.add(page.parentId);
  };
  for (const page of pages) {
    if (page.workspaceId !== activeNotebookId || page.trashedAt || page.localUnsaved || page.editorDraft) continue;
    nextPages.set(page.id, page);
    const before = cache.pages.get(page.id);
    if (before === page) continue;
    if (!before || sidebarPageSignature(before) !== sidebarPageSignature(page)) {
      if (before) remove(before);
      add(page);
      dirtyItems.add(page.id);
      dirtyGroups.add(page.id);
    }
  }
  for (const [id, page] of cache.pages) {
    if (!nextPages.has(id)) { remove(page); dirtyItems.add(id); }
  }
  if (isLocalFolder && cache.orders !== localFolderOrders) {
    for (const parent of cache.groups.keys()) {
      const orderKey = parent ?? LOCAL_FOLDER_ROOT_DIR_KEY;
      if (cache.orders?.[orderKey] !== localFolderOrders?.[orderKey]) dirtyGroups.add(parent);
    }
  }
  let items = cache.items;
  const write = (id: string, item?: TreeItem<Page>) => {
    if (items === cache.items) items = { ...items };
    if (item) items[id] = item;
    else delete items[id];
  };
  if (!items.root) write("root", {
    index: "root", children: [], isFolder: true, data: ROOT_PLACEHOLDER,
    canMove: false, canRename: false,
  });
  for (const id of dirtyItems) {
    const page = nextPages.get(id);
    if (!page) { write(id); continue; }
    write(id, {
      index: id, children: items[id]?.children ?? [],
      isFolder: isLocalFolder ? !!page.isFolder : true,
      data: page, canMove: !page.localPendingCreate, canRename: false,
    });
  }
  for (const parent of dirtyGroups) {
    const group = cache.groups.get(parent);
    const children = [...(group ?? [])].map(id => nextPages.get(id)!);
    const sorted = isLocalFolder
      ? sortLocalFolderChildren(children, localFolderOrders?.[parent ?? LOCAL_FOLDER_ROOT_DIR_KEY])
      : sortInternalPages(children);
    const ids = sorted.map(page => page.id);
    const itemId = parent ?? "root";
    const item = items[itemId];
    if (item && !sameChildren(item.children, ids)) write(itemId, { ...item, children: ids });
    if (!group?.size) cache.groups.delete(parent);
  }
  cache.pages = nextPages;
  cache.orders = localFolderOrders;
  cache.items = items;
  caches.delete(key);
  caches.set(key, cache);
  if (caches.size > 8) caches.delete(caches.keys().next().value!);
  return items;
}
