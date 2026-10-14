import {
  ensureLocalFolderOrdersLoaded,
  getLocalFolderOrders,
  setLocalFolderOrder,
  clearLocalFolderOrder,
  LOCAL_FOLDER_ROOT_DIR_KEY,
} from "../localFolderOrder";

export function transferLocalFolderOrder(
  sourceId: string,
  targetId: string,
  rootId: string,
  previousParentId: string | undefined,
  movedFolderIds: string[],
): void {
  ensureLocalFolderOrdersLoaded(sourceId);
  ensureLocalFolderOrdersLoaded(targetId);
  const source = getLocalFolderOrders(sourceId);
  const target = getLocalFolderOrders(targetId);
  const from = previousParentId ?? LOCAL_FOLDER_ROOT_DIR_KEY;
  if (source[from]?.includes(rootId))
    setLocalFolderOrder(
      sourceId,
      from,
      source[from].filter((id) => id !== rootId),
    );
  for (const folderId of movedFolderIds) {
    if (!source[folderId]) continue;
    if (setLocalFolderOrder(targetId, folderId, source[folderId]))
      clearLocalFolderOrder(sourceId, folderId);
  }
  const rootOrder = target[LOCAL_FOLDER_ROOT_DIR_KEY];
  if (rootOrder && !rootOrder.includes(rootId))
    setLocalFolderOrder(targetId, LOCAL_FOLDER_ROOT_DIR_KEY, [
      ...rootOrder,
      rootId,
    ]);
}
