import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/localFolderOrder.ts#block1:1">`
zh-Hans:
  saveOrderFailed: "排序保存失败"
  saveOrderDetail: "本地存储写入失败，本次排序没有生效。"
en:
  saveOrderFailed: "Couldn’t save the sort order"
  saveOrderDetail: "Local storage couldn’t be updated. The sort order was not changed."
ja:
  saveOrderFailed: "並び順を保存できませんでした"
  saveOrderDetail: "ローカルストレージへの書き込みに失敗したため、今回の並べ替えは反映されませんでした。"
`);
import { create } from "zustand";
import {
  writeDbStorageJSON,
  readDbStorageJSON,
  removeDbStorageItem,
} from "@/lib/storage/localDbStorage";
import { toast } from "@/components/ui/sonner";
import type { Page } from "@/types";
import { sortLocalFolderChildren } from "./localFolderOrder/sorting";

const ORDER_KEY_PREFIX = "gn:local-order:";

export const LOCAL_FOLDER_ROOT_DIR_KEY = "root";

export type LocalFolderOrderMap = Record<string, string[]>;

interface LocalFolderOrderState {
  ordersByNotebook: Record<string, LocalFolderOrderMap>;
}

export const useLocalFolderOrders = create<LocalFolderOrderState>()(() => ({
  ordersByNotebook: {},
}));

function storageKey(notebookId: string): string {
  return `${ORDER_KEY_PREFIX}${notebookId}`;
}

function dirKeyOf(parentId: string | undefined): string {
  return parentId ?? LOCAL_FOLDER_ROOT_DIR_KEY;
}

function putInState(notebookId: string, orders: LocalFolderOrderMap): void {
  useLocalFolderOrders.setState((state) => ({
    ordersByNotebook: { ...state.ordersByNotebook, [notebookId]: orders },
  }));
}

function persist(notebookId: string, orders: LocalFolderOrderMap): boolean {
  if (!writeDbStorageJSON(storageKey(notebookId), orders)) {
    toast.error(storeText("saveOrderFailed"), {
      description: storeText("saveOrderDetail"),
    });
    return false;
  }
  putInState(notebookId, orders);
  return true;
}

function sanitizeOrders(raw: unknown): LocalFolderOrderMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const orders: LocalFolderOrderMap = {};
  for (const [dirKey, value] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (!Array.isArray(value)) continue;
    orders[dirKey] = [
      ...new Set(
        value.filter((id): id is string => typeof id === "string" && !!id),
      ),
    ];
  }
  return orders;
}

export function getLocalFolderOrders(
  notebookId: string | null | undefined,
): LocalFolderOrderMap {
  if (!notebookId) return {};
  return useLocalFolderOrders.getState().ordersByNotebook[notebookId] ?? {};
}

export function ensureLocalFolderOrdersLoaded(notebookId: string): void {
  if (useLocalFolderOrders.getState().ordersByNotebook[notebookId]) return;
  putInState(
    notebookId,
    sanitizeOrders(readDbStorageJSON<unknown>(storageKey(notebookId), {})),
  );
}

export function setLocalFolderOrder(
  notebookId: string,
  dirKey: string,
  ids: string[],
): boolean {
  return persist(notebookId, {
    ...getLocalFolderOrders(notebookId),
    [dirKey]: [...ids],
  });
}

export function clearLocalFolderOrder(
  notebookId: string,
  dirKey: string,
): boolean {
  const current = getLocalFolderOrders(notebookId);
  if (!(dirKey in current)) return false;
  const next = { ...current };
  delete next[dirKey];
  return persist(notebookId, next);
}

export function removeLocalFolderOrders(notebookId: string): void {
  removeDbStorageItem(storageKey(notebookId));
  useLocalFolderOrders.setState((state) => {
    const next = { ...state.ordersByNotebook };
    delete next[notebookId];
    return { ordersByNotebook: next };
  });
}

export function appendLocalFolderOrderEntries(
  notebookId: string,
  pages: Iterable<Page>,
): void {
  const orders = getLocalFolderOrders(notebookId);
  const additions = new Map<string, string[]>();
  for (const page of pages) {
    if (page.localUnsaved || page.localPendingCreate) continue;
    const dirKey = dirKeyOf(page.parentId);
    if (!orders[dirKey]) continue;
    const ids = additions.get(dirKey) ?? [];
    if (!ids.includes(page.id)) ids.push(page.id);
    additions.set(dirKey, ids);
  }
  if (additions.size === 0) return;

  const next = { ...orders };
  let changed = false;
  for (const [dirKey, ids] of additions) {
    const known = new Set(next[dirKey]);
    const missing = ids.filter((id) => !known.has(id));
    if (missing.length === 0) continue;
    next[dirKey] = [...next[dirKey], ...missing];
    changed = true;
  }
  if (changed) persist(notebookId, next);
}

export function reassignLocalFolderOrder(
  notebookId: string,
  pageId: string,
  fromParentId: string | undefined,
  toParentId: string | undefined,
): void {
  const fromKey = dirKeyOf(fromParentId);
  const toKey = dirKeyOf(toParentId);
  if (fromKey === toKey) return;
  const orders = getLocalFolderOrders(notebookId);
  if (!orders[fromKey] && !orders[toKey]) return;

  const next = { ...orders };
  let changed = false;
  if (next[fromKey]?.includes(pageId)) {
    next[fromKey] = next[fromKey].filter((id) => id !== pageId);
    changed = true;
  }
  if (next[toKey] && !next[toKey].includes(pageId)) {
    next[toKey] = [...next[toKey], pageId];
    changed = true;
  }
  if (changed) persist(notebookId, next);
}

export function useLocalFolderManualOrder(
  notebookId: string | null | undefined,
  dirKey: string | undefined,
): boolean {
  return useLocalFolderOrders((state) => {
    if (!notebookId || !dirKey) return false;
    return dirKey in (state.ordersByNotebook[notebookId] ?? {});
  });
}

export function applyLocalFolderReorder(
  notebookId: string,
  dirKey: string,
  children: Page[],
  movedIds: string[],
  insertIndex: number,
): boolean {
  const manualOrder = getLocalFolderOrders(notebookId)[dirKey];
  const current = sortLocalFolderChildren(children, manualOrder).map(
    (page) => page.id,
  );

  let index = insertIndex < 0 ? current.length : insertIndex;
  if (index > 0) {
    index -= movedIds.filter((id) => {
      const at = current.indexOf(id);
      return at >= 0 && at < index;
    }).length;
  }

  return writeLocalFolderOrder(notebookId, dirKey, current, movedIds, index);
}

function writeLocalFolderOrder(
  notebookId: string,
  dirKey: string,
  current: string[],
  movedIds: string[],
  index: number,
): boolean {
  const rest = current.filter((id) => !movedIds.includes(id));
  const next = [...rest.slice(0, index), ...movedIds, ...rest.slice(index)];

  if (next.join("\n") === current.join("\n")) return false;
  return setLocalFolderOrder(notebookId, dirKey, next);
}

export function insertLocalFolderOrder(
  notebookId: string,
  dirKey: string,
  children: Page[],
  movedIds: string[],
  insertIndex: number,
): boolean {
  const manualOrder = getLocalFolderOrders(notebookId)[dirKey];
  const current = sortLocalFolderChildren(children, manualOrder).map(
    (page) => page.id,
  );
  return writeLocalFolderOrder(
    notebookId,
    dirKey,
    current,
    movedIds,
    Math.max(insertIndex, 0),
  );
}

export { sortLocalFolderChildren } from "./localFolderOrder/sorting";
