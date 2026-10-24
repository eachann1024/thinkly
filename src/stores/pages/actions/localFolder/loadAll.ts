import { useNotebooks } from "../../../useNotebooks";
import type { StoreSet, StoreGet } from "../hydrate";
import { loadLocalFolderPagesAction } from "./load";

export const loadAllLocalFolderPagesAction = async (
  set: StoreSet,
  get: StoreGet,
): Promise<void> => {
  if (typeof window === "undefined" || !window.gooseFs) return;

  const { notebooks, localFolderLoadStates } = useNotebooks.getState();

  const targets = Object.values(notebooks).filter((nb) => {
    if (nb.source !== "local-folder") return false;
    if (!nb.localPath || nb.localPathMissing) return false;
    const loadState = localFolderLoadStates[nb.id];
    return loadState?.status !== "loading";
  });

  if (targets.length === 0) return;

  for (const nb of targets) {
    try {
      await loadLocalFolderPagesAction(set, get, nb.id, nb.localPath!);
    } catch (error) {
      console.error(
        `[local-folder] preload pages failed for notebook ${nb.id}`,
        error,
      );
    }
  }
};
