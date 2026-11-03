import type { StoreGet } from "../hydrate";
import { acquireLocalPageFileOperation, getPendingLocalSaveContent } from "../../folderSync";

export function localDeletionIds(get: StoreGet, rootId: string): Set<string> {
  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    for (const page of Object.values(get().pages)) {
      if (page.parentId === id) stack.push(page.id);
    }
  }
  return ids;
}

// 先保存整棵子树，确保回收站与撤销备份包含最新正文；失败时不丢弃队列。
export async function prepareLocalDeletion(get: StoreGet, rootId: string): Promise<() => void> {
  const ids = localDeletionIds(get, rootId);
  for (const id of ids) {
    if (get().pages[id]?.isFolder) continue;
    await get().flushPendingLocalSaveByPageId(id);
    if (get().dirtyLocalPageIds[id]) {
      if (!await get().saveDirtyLocalPage(id)) throw new Error("笔记尚未保存，已取消删除");
      await get().flushPendingLocalSaveByPageId(id);
    }
  }
  const releases: Array<() => void> = [];
  const release = () => { for (const unlock of releases.reverse()) unlock(); };
  try {
    for (const id of [...ids].sort()) releases.push(await acquireLocalPageFileOperation(id));
    const latestIds = localDeletionIds(get, rootId);
    if (latestIds.size !== ids.size || [...latestIds].some(id => !ids.has(id)) ||
        [...ids].some(id => get().dirtyLocalPageIds[id] || getPendingLocalSaveContent(id) !== undefined)) {
      throw new Error("笔记仍在编辑，已取消删除，请稍后重试");
    }
    return release;
  } catch (error) {
    release();
    throw error;
  }
}
