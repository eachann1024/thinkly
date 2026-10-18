import type { PersistStorage } from "zustand/middleware";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSettings } from "@/stores/useSettings";

type PersistApi<S> = {
  getOptions: () => { storage?: PersistStorage<S> };
  setOptions: (options: { storage: PersistStorage<S> }) => void;
  rehydrate: () => Promise<void> | void;
};

function makeReadOnly<S>(persist: PersistApi<S>): void {
  const storage = persist.getOptions().storage;
  if (!storage) return;
  persist.setOptions({
    storage: {
      getItem: (name) => storage.getItem(name),
      setItem: () => {},
      removeItem: () => {},
    },
  });
}

/**
 * 浮动搜索窗是与主窗并行的只读消费者：设置与笔记本列表只读不写，
 * 否则它持有的旧快照会在任意 setState 时覆盖主窗刚写入的持久状态。
 */
export function installReadOnlyPersistence(): void {
  makeReadOnly(useSettings.persist as unknown as PersistApi<unknown>);
  makeReadOnly(useNotebooks.persist as unknown as PersistApi<unknown>);
}

/** 每次唤出前从共享存储重读，拿到主窗最新的笔记本与设置。 */
export async function refreshReadOnlyPersistence(): Promise<void> {
  await Promise.all([
    useSettings.persist.rehydrate(),
    useNotebooks.persist.rehydrate(),
  ]);
}
